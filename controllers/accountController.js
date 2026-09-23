import pool, { query } from '../config/db.js';

// ==========================================
// 1. SHARE CAPITAL LEDGER
// ==========================================

// @desc    Post a share capital transaction (debit or credit)
// @route   POST /api/accounts/share-capital
// @access  Protected (Admin, Manager)
export const postShareCapitalTransaction = async (req, res, next) => {
  const client = await pool.connect();
  try {
    let { member_id, transaction_type, amount, remarks } = req.body;

    if (req.user.role === 'member') {
      member_id = req.user.profile?.id;
      if (!member_id) {
        const memLookup = await client.query('SELECT id FROM members WHERE user_id = $1 LIMIT 1', [req.user.id]);
        if (memLookup.rowCount > 0) {
          member_id = memLookup.rows[0].id;
        } else {
          return res.status(400).json({
            success: false,
            error: { message: 'Authenticated user session is not linked to a member profile.' }
          });
        }
      }
      if (transaction_type !== 'credit') {
        return res.status(400).json({
          success: false,
          error: { message: 'Members can only initiate credit transactions (deposits).' }
        });
      }
    }

    if (!member_id || !transaction_type || !amount) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide member_id, transaction_type (credit/debit), and amount.' }
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Transaction amount must be greater than zero.' }
      });
    }

    if (!['credit', 'debit'].includes(transaction_type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Transaction type must be either credit or debit.' }
      });
    }

    await client.query('BEGIN');

    // Check if member exists
    const memberCheck = await client.query('SELECT id FROM members WHERE id = $1 FOR UPDATE', [member_id]);
    if (memberCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found.' }
      });
    }

    // Get latest transaction to calculate cumulative balance
    const latestTx = await client.query(
      'SELECT balance_after FROM share_capital_transactions WHERE member_id = $1 ORDER BY transaction_date DESC LIMIT 1',
      [member_id]
    );

    let currentBalance = 0;
    if (latestTx.rowCount > 0) {
      currentBalance = parseFloat(latestTx.rows[0].balance_after);
    }

    let newBalance = currentBalance;
    if (transaction_type === 'credit') {
      newBalance += parseFloat(amount);
    } else {
      if (currentBalance < amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: { message: `Insufficient share capital balance. Current balance: ₱${currentBalance.toFixed(2)}` }
        });
      }
      newBalance -= parseFloat(amount);
    }

    const initialStatus = req.user.role === 'member' ? 'pending_payment' : 'completed';
    const postBalance = initialStatus === 'completed' ? newBalance : currentBalance;

    // Write transaction record
    const insertTx = `
      INSERT INTO share_capital_transactions (member_id, transaction_type, amount, balance_after, remarks, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await client.query(insertTx, [
      member_id,
      transaction_type,
      amount,
      postBalance,
      remarks || `${transaction_type === 'credit' ? 'Equity contribution' : 'Equity withdrawal'}`,
      initialStatus
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Get share capital transactions & cumulative balance for a member
// @route   GET /api/accounts/share-capital/:memberId
// @access  Protected (Admin, Manager, Member-Owner)
export const getShareCapital = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    // RBAC: Member can only view their own
    if (req.user.role === 'member') {
      const ownCheck = await query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);
      if (ownCheck.rowCount === 0 || ownCheck.rows[0].id !== memberId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Unauthorized access.' }
        });
      }
    }

    const txs = await query(
      'SELECT * FROM share_capital_transactions WHERE member_id = $1 ORDER BY transaction_date DESC',
      [memberId]
    );

    const completedTx = await query(
      "SELECT balance_after FROM share_capital_transactions WHERE member_id = $1 AND status = 'completed' ORDER BY transaction_date DESC LIMIT 1",
      [memberId]
    );

    const balance = completedTx.rowCount > 0 ? parseFloat(completedTx.rows[0].balance_after) : 0;
    const completedTransactions = txs.rows.filter(tx => !tx.status || tx.status === 'completed');
    const pendingTransactions = txs.rows.filter(tx => tx.status === 'pending_payment');

    res.status(200).json({
      success: true,
      balance,
      transactions: txs.rows,
      completed_transactions: completedTransactions,
      pending_transactions: pendingTransactions
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. FIXED DEPOSIT REGISTRY
// ==========================================

// @desc    Create a new fixed deposit placement
// @route   POST /api/accounts/fixed-deposits
// @access  Protected (Admin, Manager)
export const createFixedDeposit = async (req, res, next) => {
  const client = await pool.connect();
  try {
    let { member_id, principal_amount, interest_rate, duration_months } = req.body;

    if (req.user.role === 'member') {
      member_id = req.user.profile?.id;
      if (!member_id) {
        const memLookup = await client.query('SELECT id FROM members WHERE user_id = $1 LIMIT 1', [req.user.id]);
        if (memLookup.rowCount > 0) {
          member_id = memLookup.rows[0].id;
        } else {
          return res.status(400).json({
            success: false,
            error: { message: 'Authenticated user session is not linked to a member profile.' }
          });
        }
      }
    }

    if (!member_id || !principal_amount || !interest_rate || !duration_months) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide member_id, principal_amount, interest_rate (decimal), and duration_months.' }
      });
    }

    await client.query('BEGIN');

    // Check member
    const memberCheck = await client.query('SELECT id FROM members WHERE id = $1', [member_id]);
    if (memberCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found.' }
      });
    }

    const placementDate = new Date();
    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + parseInt(duration_months, 10));

    // Member placements start as 'pending_payment' until office cash payment is confirmed
    const initialStatus = req.user.role === 'member' ? 'pending_payment' : 'active';

    // 1. Insert fixed deposit registry item
    const insertFD = `
      INSERT INTO fixed_deposits (member_id, principal_amount, interest_rate, placement_date, maturity_date, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const fdResult = await client.query(insertFD, [
      member_id,
      principal_amount,
      interest_rate,
      placementDate.toISOString().split('T')[0],
      maturityDate.toISOString().split('T')[0],
      initialStatus
    ]);

    const newFD = fdResult.rows[0];

    // 2. If already active (admin created), post initial deposit transaction log
    if (initialStatus === 'active') {
      const insertFDTx = `
        INSERT INTO fixed_deposit_transactions (fixed_deposit_id, transaction_type, amount)
        VALUES ($1, 'deposit', $2)
      `;
      await client.query(insertFDTx, [newFD.id, principal_amount]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: newFD
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Get fixed deposits for a member
// @route   GET /api/accounts/fixed-deposits/:memberId
// @access  Protected (Admin, Manager, Member-Owner)
export const getFixedDeposits = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    // RBAC: Member can only view their own
    if (req.user.role === 'member') {
      const ownCheck = await query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);
      if (ownCheck.rowCount === 0 || ownCheck.rows[0].id !== memberId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Unauthorized access.' }
        });
      }
    }

    const result = await query(
      `SELECT fd.*, 
       COALESCE(
         (SELECT json_agg(fdt.* ORDER BY fdt.transaction_date DESC) 
          FROM fixed_deposit_transactions fdt 
          WHERE fdt.fixed_deposit_id = fd.id), 
         '[]'::json
       ) as transactions
       FROM fixed_deposits fd
       WHERE fd.member_id = $1
       ORDER BY fd.created_at DESC`,
      [memberId]
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. INVESTMENT TRACKING SERVICE
// ==========================================

// @desc    Create a new investment account
// @route   POST /api/accounts/investments
// @access  Protected (Admin, Manager)
export const createInvestment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    let { member_id, investment_name, principal_amount } = req.body;

    if (req.user.role === 'member') {
      if (!req.user.profile?.id) {
        return res.status(400).json({
          success: false,
          error: { message: 'Authenticated user session is not linked to a member profile.' }
        });
      }
      member_id = req.user.profile.id;
    }

    if (!member_id || !investment_name || !principal_amount) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide member_id, investment_name, and principal_amount.' }
      });
    }

    await client.query('BEGIN');

    const memberCheck = await client.query('SELECT id FROM members WHERE id = $1', [member_id]);
    if (memberCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found.' }
      });
    }

    // 1. Insert investment registry item
    const insertInv = `
      INSERT INTO investments (member_id, investment_name, principal_amount, current_balance, interest_yield, status)
      VALUES ($1, $2, $3, $3, 0.00, 'active')
      RETURNING *
    `;
    const invResult = await client.query(insertInv, [member_id, investment_name, principal_amount]);
    const newInv = invResult.rows[0];

    // 2. Post initial deposit transaction
    const insertInvTx = `
      INSERT INTO investment_transactions (investment_id, transaction_type, amount)
      VALUES ($1, 'deposit', $2)
    `;
    await client.query(insertInvTx, [newInv.id, principal_amount]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: newInv
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Post transaction to an investment (deposit, yield_payout, withdrawal)
// @route   POST /api/accounts/investments/:id/transactions
// @access  Protected (Admin, Manager)
export const postInvestmentTransaction = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { transaction_type, amount } = req.body;

    if (!transaction_type || !amount) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide transaction_type (deposit, yield_payout, withdrawal) and amount.' }
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Transaction amount must be greater than zero.' }
      });
    }

    if (!['deposit', 'yield_payout', 'withdrawal'].includes(transaction_type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid transaction type.' }
      });
    }

    await client.query('BEGIN');

    // Check investment
    const invCheck = await client.query(
      'SELECT current_balance, interest_yield FROM investments WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (invCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { message: 'Investment account not found.' }
      });
    }

    let currentBalance = parseFloat(invCheck.rows[0].current_balance);
    let interestYield = parseFloat(invCheck.rows[0].interest_yield);

    if (transaction_type === 'deposit') {
      currentBalance += parseFloat(amount);
    } else if (transaction_type === 'yield_payout') {
      interestYield += parseFloat(amount);
      currentBalance += parseFloat(amount); // Interest reinvested or added to balance
    } else if (transaction_type === 'withdrawal') {
      if (currentBalance < amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: { message: `Insufficient investment balance. Current balance: ₱${currentBalance.toFixed(2)}` }
        });
      }
      currentBalance -= parseFloat(amount);
    }

    // 1. Insert transaction log
    const insertTx = `
      INSERT INTO investment_transactions (investment_id, transaction_type, amount)
      VALUES ($1, $2, $3)
    `;
    await client.query(insertTx, [id, transaction_type, amount]);

    // 2. Update balances in investment
    const updateBalances = `
      UPDATE investments
      SET current_balance = $1, interest_yield = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await client.query(updateBalances, [currentBalance, interestYield, id]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Get investments for a member
// @route   GET /api/accounts/investments/:memberId
// @access  Protected (Admin, Manager, Member-Owner)
export const getInvestments = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    // RBAC: Member can only view their own
    if (req.user.role === 'member') {
      const ownCheck = await query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);
      if (ownCheck.rowCount === 0 || ownCheck.rows[0].id !== memberId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Unauthorized access.' }
        });
      }
    }

    const result = await query(
      `SELECT i.*, 
       COALESCE(
         (SELECT json_agg(it.* ORDER BY it.transaction_date DESC) 
          FROM investment_transactions it 
          WHERE it.investment_id = i.id), 
         '[]'::json
       ) as transactions
       FROM investments i
       WHERE i.member_id = $1
       ORDER BY i.created_at DESC`,
      [memberId]
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. ADMIN OFFICE CASH PAYMENT APPROVAL QUEUE
// ==========================================

// @desc    Get all pending member capital & investment placements
// @route   GET /api/accounts/pending-placements
// @access  Protected (Admin, Manager)
export const getPendingPlacements = async (req, res, next) => {
  try {
    const fixedDeposits = await query(
      `SELECT fd.id, fd.member_id, fd.principal_amount as amount, fd.interest_rate, fd.placement_date, fd.status, fd.created_at,
              'fixed_deposit' as placement_type,
              m.member_no, m.first_name, m.last_name, m.email, m.phone
       FROM fixed_deposits fd
       JOIN members m ON fd.member_id = m.id
       WHERE fd.status = 'pending_payment'
       ORDER BY fd.created_at DESC`
    );

    const shareCapital = await query(
      `SELECT sct.id, sct.member_id, sct.amount, sct.transaction_date as placement_date, sct.status, sct.remarks, sct.transaction_date as created_at,
              'share_capital' as placement_type,
              m.member_no, m.first_name, m.last_name, m.email, m.phone
       FROM share_capital_transactions sct
       JOIN members m ON sct.member_id = m.id
       WHERE sct.status = 'pending_payment'
       ORDER BY sct.transaction_date DESC`
    );

    res.status(200).json({
      success: true,
      data: {
        fixed_deposits: fixedDeposits.rows,
        share_capital: shareCapital.rows,
        all_pending: [...fixedDeposits.rows, ...shareCapital.rows]
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve and confirm office cash payment for a placement
// @route   PUT /api/accounts/confirm-placement/:type/:id
// @access  Protected (Admin, Manager)
export const confirmPlacementPayment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { type, id } = req.params;

    await client.query('BEGIN');

    if (type === 'fixed-deposit') {
      const fdCheck = await client.query('SELECT * FROM fixed_deposits WHERE id = $1 FOR UPDATE', [id]);
      if (fdCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: { message: 'Fixed deposit placement not found.' } });
      }

      const fd = fdCheck.rows[0];
      if (fd.status !== 'pending_payment') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: { message: `Placement is already ${fd.status}.` } });
      }

      // Activate placement
      await client.query("UPDATE fixed_deposits SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);

      // Post deposit transaction log
      await client.query(
        "INSERT INTO fixed_deposit_transactions (fixed_deposit_id, transaction_type, amount) VALUES ($1, 'deposit', $2)",
        [id, fd.principal_amount]
      );

      // Create notification for member user
      const memUserRes = await client.query('SELECT user_id FROM members WHERE id = $1', [fd.member_id]);
      if (memUserRes.rows.length > 0 && memUserRes.rows[0].user_id) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, 'Fixed Deposit Cash Payment Received', $2, 'account')`,
          [memUserRes.rows[0].user_id, `Your cash payment of ₱${parseFloat(fd.principal_amount).toLocaleString()} for Fixed Deposit has been received and activated at the Coop Office.`]
        );
      }

    } else if (type === 'share-capital') {
      const scCheck = await client.query('SELECT * FROM share_capital_transactions WHERE id = $1 FOR UPDATE', [id]);
      if (scCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: { message: 'Share capital placement not found.' } });
      }

      const sc = scCheck.rows[0];

      // Get latest completed balance
      const latestTx = await client.query(
        "SELECT balance_after FROM share_capital_transactions WHERE member_id = $1 AND status = 'completed' ORDER BY transaction_date DESC LIMIT 1",
        [sc.member_id]
      );
      let currBal = 0;
      if (latestTx.rowCount > 0) {
        currBal = parseFloat(latestTx.rows[0].balance_after);
      }
      const newBal = currBal + parseFloat(sc.amount);

      // Mark transaction completed & credit balance
      await client.query("UPDATE share_capital_transactions SET status = 'completed', balance_after = $1 WHERE id = $2", [newBal, id]);

      // Create notification for member user
      const memUserRes = await client.query('SELECT user_id FROM members WHERE id = $1', [sc.member_id]);
      if (memUserRes.rows.length > 0 && memUserRes.rows[0].user_id) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, 'Share Capital Payment Received', $2, 'account')`,
          [memUserRes.rows[0].user_id, `Your cash payment of ₱${parseFloat(sc.amount).toLocaleString()} for Share Capital deposit has been received and credited at the Coop Office.`]
        );
      }
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: { message: 'Invalid placement type.' } });
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Office cash payment verified successfully. Member account updated.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Decline / cancel office cash payment for a placement with rejection reason
// @route   PUT /api/accounts/decline-placement/:type/:id
// @access  Protected (Admin, Manager)
export const declinePlacementPayment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { type, id } = req.params;
    const { remarks } = req.body;

    await client.query('BEGIN');

    if (type === 'fixed-deposit') {
      const fdCheck = await client.query('SELECT * FROM fixed_deposits WHERE id = $1 FOR UPDATE', [id]);
      if (fdCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: { message: 'Fixed deposit placement not found.' } });
      }

      const fd = fdCheck.rows[0];
      if (fd.status !== 'pending_payment') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: { message: `Placement is already ${fd.status}.` } });
      }

      // Mark placement as cancelled
      await client.query("UPDATE fixed_deposits SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);

      // Create notification for member user
      const memUserRes = await client.query('SELECT user_id FROM members WHERE id = $1', [fd.member_id]);
      if (memUserRes.rows.length > 0 && memUserRes.rows[0].user_id) {
        const reasonText = remarks ? ` Reason: ${remarks}` : '';
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, 'Fixed Deposit Placement Declined', $2, 'account')`,
          [memUserRes.rows[0].user_id, `Your cash placement request of ₱${parseFloat(fd.principal_amount).toLocaleString()} for Fixed Deposit was declined by office administration.${reasonText}`]
        );
      }

    } else if (type === 'share-capital') {
      const scCheck = await client.query('SELECT * FROM share_capital_transactions WHERE id = $1 FOR UPDATE', [id]);
      if (scCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: { message: 'Share capital placement not found.' } });
      }

      const sc = scCheck.rows[0];
      if (sc.status !== 'pending_payment') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: { message: `Placement is already ${sc.status}.` } });
      }

      const updatedRemarks = remarks ? `DECLINED: ${remarks}` : (sc.remarks || 'Declined by office administration');

      // Mark transaction cancelled
      await client.query("UPDATE share_capital_transactions SET status = 'cancelled', remarks = $1 WHERE id = $2", [updatedRemarks, id]);

      // Create notification for member user
      const memUserRes = await client.query('SELECT user_id FROM members WHERE id = $1', [sc.member_id]);
      if (memUserRes.rows.length > 0 && memUserRes.rows[0].user_id) {
        const reasonText = remarks ? ` Reason: ${remarks}` : '';
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, 'Share Capital Placement Declined', $2, 'account')`,
          [memUserRes.rows[0].user_id, `Your cash placement request of ₱${parseFloat(sc.amount).toLocaleString()} for Share Capital was declined by office administration.${reasonText}`]
        );
      }
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: { message: 'Invalid placement type.' } });
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Office cash payment request has been declined.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// ==========================================
// 5. PURCHASE CHECK VOUCHER REGISTRY
// ==========================================

// @desc    Bulk import check voucher records (skips duplicates on voucher_no + check_no)
// @route   POST /api/accounts/check-vouchers/import
// @access  Protected (Admin, Staff)
export const importCheckVouchers = async (req, res, next) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No records provided. Expected { records: [...] }.' }
      });
    }

    let imported = 0;
    let skipped = 0;

    for (const r of records) {
      const {
        voucher_no, voucher_date, check_no, payee, bank,
        particulars, amount, managers_approval_date, date_released,
        folder_name, box_name
      } = r;

      if (!voucher_no || !payee) {
        skipped++;
        continue;
      }

      const result = await query(
        `INSERT INTO check_vouchers
           (voucher_no, voucher_date, check_no, payee, bank, particulars, amount,
            managers_approval_date, date_released, folder_name, box_name, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (voucher_no, check_no) DO UPDATE SET
            voucher_date = COALESCE(EXCLUDED.voucher_date, check_vouchers.voucher_date),
            payee = EXCLUDED.payee,
            bank = COALESCE(EXCLUDED.bank, check_vouchers.bank),
            particulars = COALESCE(EXCLUDED.particulars, check_vouchers.particulars),
            amount = EXCLUDED.amount,
            managers_approval_date = COALESCE(EXCLUDED.managers_approval_date, check_vouchers.managers_approval_date),
            date_released = COALESCE(EXCLUDED.date_released, check_vouchers.date_released),
            folder_name = COALESCE(EXCLUDED.folder_name, check_vouchers.folder_name),
            box_name = COALESCE(EXCLUDED.box_name, check_vouchers.box_name),
            details = CASE WHEN EXCLUDED.details IS NOT NULL AND jsonb_array_length(EXCLUDED.details) > 0 THEN EXCLUDED.details ELSE check_vouchers.details END,
            updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [
          voucher_no,
          voucher_date || null,
          check_no || null,
          payee,
          bank || null,
          particulars || null,
          amount ?? 0,
          managers_approval_date || null,
          date_released || null,
          folder_name || null,
          box_name || null,
          JSON.stringify(r.details || [])
        ]
      );

      if (result.rowCount > 0) {
        imported++;
      } else {
        skipped++;
      }
    }

    res.status(200).json({
      success: true,
      data: { imported, skipped }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch all purchase check vouchers with optional search/filter
// @route   GET /api/accounts/check-vouchers
// @access  Protected (Admin, Staff)
export const getCheckVouchers = async (req, res, next) => {
  try {
    const { search, folder, bank, status, page, limit, id } = req.query;

    const conditions = [];
    const params = [];

    if (id) {
      params.push(id);
      conditions.push(`id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(voucher_no ILIKE $${params.length} OR payee ILIKE $${params.length} OR particulars ILIKE $${params.length} OR check_no ILIKE $${params.length} OR folder_name ILIKE $${params.length} OR bank ILIKE $${params.length})`);
    }

    if (folder) {
      params.push(`%${folder}%`);
      conditions.push(`folder_name ILIKE $${params.length}`);
    }

    if (bank) {
      params.push(`%${bank}%`);
      conditions.push(`bank ILIKE $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status.toLowerCase());
      conditions.push(`LOWER(COALESCE(status, 'edit')) = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(limit) || 25));
    const offset = (pageNum - 1) * pageSize;

    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) AS total FROM check_vouchers ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0]?.total || '0', 10);

    // Paginated data — oldest first (ascending by voucher_date, then voucher_no)
    params.push(pageSize);
    params.push(offset);
    const result = await query(
      `SELECT id, voucher_no, voucher_date, check_no, payee, bank, particulars,
              amount, managers_approval_date, date_released, folder_name, box_name, details, signatories,
              COALESCE(status, 'edit') AS status, created_at,
              (
                SELECT JSON_BUILD_OBJECT(
                  'id', rf.id,
                  'lf_no', rf.lf_no,
                  'sheet_name', rf.sheet_name,
                  'custodian_name', rf.custodian_name,
                  'total_liquidated', rf.total_liquidated
                )
                FROM revolving_fund_liquidations rf
                WHERE rf.check_voucher_id = check_vouchers.id OR rf.voucher_no = check_vouchers.voucher_no
                LIMIT 1
              ) AS revolving_fund
       FROM check_vouchers
       ${whereClause}
       ORDER BY voucher_date DESC NULLS LAST, voucher_no DESC, created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a check voucher by ID
// @route   PUT /api/accounts/check-vouchers/:id
// @access  Protected (Admin, Staff)
export const updateCheckVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      voucher_no,
      voucher_date,
      check_no,
      payee,
      bank,
      particulars,
      amount,
      date_released,
      managers_approval_date,
      folder_name,
      status,
      details,
      signatories
    } = req.body;

    const currentCvRes = await query('SELECT * FROM check_vouchers WHERE id = $1', [id]);
    if (currentCvRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Check voucher not found' }
      });
    }
    const currentCv = currentCvRes.rows[0];

    // If current status is 'filed', only admin can modify or unlock it
    if (currentCv.status === 'filed' && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'This check voucher is filed and locked. Only administrators can modify it.' }
      });
    }

    // Only admin can change status to 'filed'
    if (status === 'filed' && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Only an administrator can seal and file a check voucher.' }
      });
    }

    // Check vouchers in 'on process', 'for release', or 'filed' cannot be edited unless reverted to 'edit'
    const currentStatus = (currentCv.status || 'edit').toLowerCase();
    const isModifyingContent = details !== undefined || payee !== undefined || amount !== undefined || check_no !== undefined || particulars !== undefined || voucher_no !== undefined;
    if (currentStatus !== 'edit' && isModifyingContent && status !== 'edit') {
      return res.status(400).json({
        success: false,
        error: { message: `Check vouchers in '${currentStatus.toUpperCase()}' status cannot be edited. Revert to 'Edit' status first to modify.` }
      });
    }

    // Auto-set lifecycle dates
    let resolvedApprovalDate = managers_approval_date !== undefined ? (managers_approval_date || null) : currentCv.managers_approval_date;
    let resolvedDateReleased = date_released !== undefined ? (date_released || null) : currentCv.date_released;

    if (status === 'for release' && !resolvedApprovalDate) {
      resolvedApprovalDate = new Date().toISOString().split('T')[0];
    }
    if (status === 'filed' && !resolvedDateReleased) {
      resolvedDateReleased = new Date().toISOString().split('T')[0];
    }

    const resolvedVoucherNo = voucher_no !== undefined ? voucher_no : currentCv.voucher_no;
    const resolvedVoucherDate = voucher_date !== undefined ? (voucher_date || null) : currentCv.voucher_date;
    const resolvedCheckNo = check_no !== undefined ? check_no : currentCv.check_no;
    const resolvedPayee = payee !== undefined ? payee : currentCv.payee;
    const resolvedBank = bank !== undefined ? bank : currentCv.bank;
    const resolvedParticulars = particulars !== undefined ? particulars : currentCv.particulars;
    const resolvedAmount = amount !== undefined ? (amount !== null && amount !== '' ? parseFloat(amount) : null) : currentCv.amount;
    const resolvedFolderName = folder_name !== undefined ? folder_name : currentCv.folder_name;
    const resolvedStatus = status !== undefined ? status.toLowerCase() : currentCv.status;

    const formatJsonParam = (val, fallback = null) => {
      const target = val !== undefined ? val : fallback;
      if (target === undefined || target === null) return null;
      return typeof target === 'object' ? JSON.stringify(target) : target;
    };

    const resolvedDetails = formatJsonParam(details, currentCv.details);
    const resolvedSignatories = formatJsonParam(signatories, currentCv.signatories);

    const result = await query(
      `UPDATE check_vouchers
       SET voucher_no = $1,
           voucher_date = $2,
           check_no = $3,
           payee = $4,
           bank = $5,
           particulars = $6,
           amount = $7,
           date_released = $8,
           managers_approval_date = $9,
           folder_name = $10,
           status = $11,
           details = $12,
           signatories = $13,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [
        resolvedVoucherNo,
        resolvedVoucherDate,
        resolvedCheckNo,
        resolvedPayee,
        resolvedBank,
        resolvedParticulars,
        resolvedAmount,
        resolvedDateReleased,
        resolvedApprovalDate,
        resolvedFolderName,
        resolvedStatus,
        resolvedDetails,
        resolvedSignatories,
        id
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Check voucher updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record print event for check voucher, advancing status to 'on process' if it is currently 'edit'
// @route   POST /api/accounts/check-vouchers/:id/print
// @access  Protected (Admin, Staff)
export const printCheckVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE check_vouchers
       SET status = CASE WHEN LOWER(COALESCE(status, 'edit')) = 'edit' THEN 'on process' ELSE status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Check voucher not found' }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Check voucher print recorded',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new check voucher
// @route   POST /api/accounts/check-vouchers
// @access  Protected (Admin, Staff)
export const createCheckVoucher = async (req, res, next) => {
  try {
    const {
      voucher_no,
      voucher_date,
      check_no,
      payee,
      bank,
      particulars,
      amount,
      date_released,
      folder_name,
      status,
      details,
      signatories
    } = req.body;

    if (!payee || !voucher_no) {
      return res.status(400).json({
        success: false,
        error: { message: 'Voucher number and payee name are required' }
      });
    }

    const defaultSignatories = {
      prepared_by: 'LAMOSTE, CHINNETTE A.',
      checked_by: 'MARILOU LARIOSA',
      approved_by: 'MICHELLE M. PABLE'
    };

    const initialStatus = (status || 'edit').toLowerCase();

    const result = await query(
      `INSERT INTO check_vouchers (
        voucher_no,
        voucher_date,
        check_no,
        payee,
        bank,
        particulars,
        amount,
        date_released,
        folder_name,
        status,
        details,
        signatories
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        voucher_no.trim(),
        voucher_date || new Date().toISOString().split('T')[0],
        check_no || '',
        payee.trim(),
        bank || '',
        particulars || '',
        amount !== undefined ? parseFloat(amount) : 0,
        date_released || null,
        folder_name || null,
        initialStatus,
        details ? JSON.stringify(details) : '[]',
        JSON.stringify(signatories || defaultSignatories)
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Check voucher created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a single check voucher by ID
// @route   DELETE /api/accounts/check-vouchers/:id
// @access  Protected (Admin, Staff)
export const deleteCheckVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, voucher_no, payee, status FROM check_vouchers WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Check voucher not found or already removed' }
      });
    }

    if (existing.rows[0].status === 'filed') {
      return res.status(403).json({
        success: false,
        error: { message: `Check voucher ${existing.rows[0].voucher_no} is filed and locked. It cannot be deleted.` }
      });
    }

    const result = await query(
      'DELETE FROM check_vouchers WHERE id = $1 RETURNING id, voucher_no, payee',
      [id]
    );

    res.status(200).json({
      success: true,
      message: `Check voucher ${result.rows[0].voucher_no} deleted successfully`,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete check vouchers (by list of IDs or all)
// @route   POST /api/accounts/check-vouchers/bulk-delete
// @access  Protected (Admin, Staff)
export const bulkDeleteCheckVouchers = async (req, res, next) => {
  try {
    const { ids, all } = req.body;

    if (all === true) {
      const result = await query("DELETE FROM check_vouchers WHERE status IS NULL OR status != 'filed' RETURNING id");
      return res.status(200).json({
        success: true,
        message: `${result.rowCount} unfiled check voucher(s) removed successfully (filed/locked vouchers preserved)`,
        count: result.rowCount
      });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No check voucher IDs provided for deletion' }
      });
    }

    const result = await query(
      "DELETE FROM check_vouchers WHERE id = ANY($1::uuid[]) AND (status IS NULL OR status != 'filed') RETURNING id",
      [ids]
    );

    res.status(200).json({
      success: true,
      message: `${result.rowCount} check voucher(s) removed successfully (filed/locked vouchers preserved)`,
      count: result.rowCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync a Check Voucher with its linked Revolving Fund Liquidation Form
// @route   POST /api/accounts/check-vouchers/:id/sync-revolving-fund
// @access  Protected (Admin, Staff)
export const syncCheckVoucherWithRevolvingFund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cvRes = await query('SELECT * FROM check_vouchers WHERE id = $1', [id]);
    if (cvRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Check voucher not found.' } });
    }
    const cv = cvRes.rows[0];

    // Find linked liquidation form
    const lfRes = await query(`
      SELECT * FROM revolving_fund_liquidations
      WHERE check_voucher_id = $1 OR voucher_no = $2
      ORDER BY created_at DESC LIMIT 1
    `, [cv.id, cv.voucher_no]);

    if (lfRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No revolving fund liquidation form linked to this voucher.' }
      });
    }

    const lf = lfRes.rows[0];
    const { syncVoucherWithLiquidationData } = await import('./revolvingFundController.js');
    const result = await syncVoucherWithLiquidationData(lf.id, cv.id);

    // Also attach revolving_fund metadata to the response so the UI has complete info
    const fullCvRes = await query(`
      SELECT cv.*,
        (
          SELECT JSON_BUILD_OBJECT(
            'id', rf.id,
            'lf_no', rf.lf_no,
            'sheet_name', rf.sheet_name,
            'custodian_name', rf.custodian_name,
            'total_liquidated', rf.total_liquidated
          )
          FROM revolving_fund_liquidations rf
          WHERE rf.check_voucher_id = cv.id OR rf.voucher_no = cv.voucher_no
          LIMIT 1
        ) AS revolving_fund
      FROM check_vouchers cv
      WHERE cv.id = $1
    `, [cv.id]);

    res.status(200).json({
      success: true,
      data: fullCvRes.rows[0] || result.checkVoucher,
      lf: {
        id: lf.id,
        lf_no: lf.lf_no,
        sheet_name: lf.sheet_name,
        total_liquidated: result.totalLiquidated
      },
      message: `Successfully synchronized ₱${result.totalLiquidated.toLocaleString('en-US', { minimumFractionDigits: 2 })} from ${lf.lf_no} into Check Voucher #${cv.voucher_no}.`
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. SAVINGS ACCOUNTS & PASSBOOK LEDGER
// ==========================================

// @desc    Get all savings accounts summary and list
// @route   GET /api/accounts/savings
// @access  Protected (Admin, Staff)
export const getAllSavingsAccounts = async (req, res, next) => {
  try {
    const listQuery = `
      SELECT 
        sa.id,
        sa.member_id,
        sa.account_number,
        sa.balance,
        sa.maintaining_balance,
        sa.interest_rate,
        sa.status,
        sa.created_at,
        sa.updated_at,
        m.first_name,
        m.last_name,
        m.middle_name,
        m.member_no,
        m.email,
        m.phone
      FROM savings_accounts sa
      JOIN members m ON m.id = sa.member_id
      ORDER BY sa.balance DESC, m.last_name ASC
    `;

    const summaryQuery = `
      SELECT 
        COUNT(*)::int as total_accounts,
        COALESCE(SUM(balance), 0)::numeric as total_savings_pool,
        COALESCE(AVG(balance), 0)::numeric as avg_savings_balance,
        COUNT(CASE WHEN balance > 0 THEN 1 END)::int as funded_accounts
      FROM savings_accounts
      WHERE status = 'active'
    `;

    const [listResult, summaryResult] = await Promise.all([
      query(listQuery),
      query(summaryQuery)
    ]);

    res.status(200).json({
      success: true,
      data: {
        accounts: listResult.rows,
        summary: summaryResult.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get savings account and transaction ledger for a specific member
// @route   GET /api/accounts/savings/:memberId
// @access  Protected (Admin, Staff, Member)
export const getSavingsAccount = async (req, res, next) => {
  const client = await pool.connect();
  try {
    let { memberId } = req.params;

    if (req.user.role === 'member') {
      const authMemberId = req.user.profile?.id;
      if (!authMemberId) {
        const memLookup = await client.query('SELECT id FROM members WHERE user_id = $1 LIMIT 1', [req.user.id]);
        if (memLookup.rowCount > 0) {
          memberId = memLookup.rows[0].id;
        } else {
          return res.status(403).json({
            success: false,
            error: { message: 'Authenticated user session is not linked to a member profile.' }
          });
        }
      } else {
        memberId = authMemberId;
      }
    }

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Member ID is required.' }
      });
    }

    // Ensure savings account exists for member, otherwise create it
    let accountCheck = await client.query(
      `SELECT sa.*, m.first_name, m.last_name, m.middle_name, m.member_no, m.email, m.phone
       FROM savings_accounts sa
       JOIN members m ON m.id = sa.member_id
       WHERE sa.member_id = $1`,
      [memberId]
    );

    if (accountCheck.rowCount === 0) {
      const memberInfo = await client.query('SELECT id, member_no FROM members WHERE id = $1', [memberId]);
      if (memberInfo.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Member not found.' }
        });
      }

      const rawNo = memberInfo.rows[0].member_no
        ? memberInfo.rows[0].member_no.replace(/[^a-zA-Z0-9]/g, '')
        : memberInfo.rows[0].id.slice(0, 8);
      const generatedAccountNo = `SAV-${rawNo}`;

      await client.query(
        `INSERT INTO savings_accounts (member_id, account_number, balance, maintaining_balance, status)
         VALUES ($1, $2, 0.00, 100.00, 'active')
         ON CONFLICT (member_id) DO NOTHING`,
        [memberId, generatedAccountNo]
      );

      accountCheck = await client.query(
        `SELECT sa.*, m.first_name, m.last_name, m.middle_name, m.member_no, m.email, m.phone
         FROM savings_accounts sa
         JOIN members m ON m.id = sa.member_id
         WHERE sa.member_id = $1`,
        [memberId]
      );
    }

    const account = accountCheck.rows[0];

    // Fetch transactions
    const txResult = await client.query(
      `SELECT st.*, u.username as performer_name
       FROM savings_transactions st
       LEFT JOIN users u ON u.id = st.performed_by
       WHERE st.savings_account_id = $1
       ORDER BY st.transaction_date DESC, st.id DESC`,
      [account.id]
    );

    res.status(200).json({
      success: true,
      data: {
        account,
        transactions: txResult.rows
      }
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Deposit cash/funds into Member Savings Account
// @route   POST /api/accounts/savings/deposit
// @access  Protected (Admin, Staff, Member)
export const postSavingsDeposit = async (req, res, next) => {
  const client = await pool.connect();
  try {
    let { member_id, amount, reference_no, payment_method, remarks } = req.body;

    if (req.user.role === 'member') {
      member_id = req.user.profile?.id;
      if (!member_id) {
        const memLookup = await client.query('SELECT id FROM members WHERE user_id = $1 LIMIT 1', [req.user.id]);
        if (memLookup.rowCount > 0) {
          member_id = memLookup.rows[0].id;
        } else {
          return res.status(400).json({
            success: false,
            error: { message: 'Authenticated user session is not linked to a member profile.' }
          });
        }
      }
    }

    if (!member_id || !amount) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide member_id and amount.' }
      });
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Deposit amount must be a positive number.' }
      });
    }

    await client.query('BEGIN');

    // Fetch and lock savings account
    let accountResult = await client.query(
      'SELECT id, balance, status FROM savings_accounts WHERE member_id = $1 FOR UPDATE',
      [member_id]
    );

    if (accountResult.rowCount === 0) {
      const memberInfo = await client.query('SELECT id, member_no FROM members WHERE id = $1', [member_id]);
      if (memberInfo.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: { message: 'Member not found.' }
        });
      }

      const rawNo = memberInfo.rows[0].member_no
        ? memberInfo.rows[0].member_no.replace(/[^a-zA-Z0-9]/g, '')
        : memberInfo.rows[0].id.slice(0, 8);
      const generatedAccountNo = `SAV-${rawNo}`;

      await client.query(
        `INSERT INTO savings_accounts (member_id, account_number, balance, maintaining_balance, status)
         VALUES ($1, $2, 0.00, 100.00, 'active')`,
        [member_id, generatedAccountNo]
      );

      accountResult = await client.query(
        'SELECT id, balance, status FROM savings_accounts WHERE member_id = $1 FOR UPDATE',
        [member_id]
      );
    }

    const account = accountResult.rows[0];

    if (account.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: { message: `Cannot deposit into an account with status '${account.status}'.` }
      });
    }

    const currentBalance = parseFloat(account.balance || 0);
    const newBalance = currentBalance + depositAmount;

    // Insert transaction
    const txInsert = await client.query(
      `INSERT INTO savings_transactions (
        savings_account_id,
        transaction_type,
        amount,
        balance_after,
        reference_no,
        payment_method,
        performed_by,
        remarks,
        status
      ) VALUES ($1, 'deposit', $2, $3, $4, $5, $6, $7, 'completed')
      RETURNING *`,
      [
        account.id,
        depositAmount,
        newBalance,
        reference_no || `DEP-${Date.now().toString().slice(-6)}`,
        payment_method || 'cash',
        req.user.id,
        remarks || 'Cash deposit to savings account'
      ]
    );

    // Update account balance
    await client.query(
      'UPDATE savings_accounts SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newBalance, account.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Successfully deposited ₱${depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} into Savings Account.`,
      data: {
        transaction: txInsert.rows[0],
        new_balance: newBalance
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Withdraw cash/funds from Member Savings Account
// @route   POST /api/accounts/savings/withdraw
// @access  Protected (Admin, Staff)
export const postSavingsWithdrawal = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { member_id, amount, reference_no, payment_method, remarks } = req.body;

    if (!member_id || !amount) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide member_id and withdrawal amount.' }
      });
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Withdrawal amount must be a positive number.' }
      });
    }

    await client.query('BEGIN');

    // Fetch and lock savings account
    const accountResult = await client.query(
      'SELECT id, balance, maintaining_balance, status FROM savings_accounts WHERE member_id = $1 FOR UPDATE',
      [member_id]
    );

    if (accountResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { message: 'Savings account not found for this member.' }
      });
    }

    const account = accountResult.rows[0];

    if (account.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: { message: `Cannot withdraw from an account with status '${account.status}'.` }
      });
    }

    const currentBalance = parseFloat(account.balance || 0);
    const maintainingBalance = parseFloat(account.maintaining_balance || 100);

    if (currentBalance < withdrawAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: {
          message: `Insufficient savings balance. Current balance is ₱${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
        }
      });
    }

    const balanceAfter = currentBalance - withdrawAmount;

    if (balanceAfter < maintainingBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: {
          message: `Withdrawal violates maintaining balance policy. Minimum maintaining balance required is ₱${maintainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Maximum withdrawable: ₱${Math.max(0, currentBalance - maintainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
        }
      });
    }

    // Insert withdrawal transaction
    const txInsert = await client.query(
      `INSERT INTO savings_transactions (
        savings_account_id,
        transaction_type,
        amount,
        balance_after,
        reference_no,
        payment_method,
        performed_by,
        remarks,
        status
      ) VALUES ($1, 'withdrawal', $2, $3, $4, $5, $6, $7, 'completed')
      RETURNING *`,
      [
        account.id,
        withdrawAmount,
        balanceAfter,
        reference_no || `WDL-${Date.now().toString().slice(-6)}`,
        payment_method || 'cash',
        req.user.id,
        remarks || 'Counter cash withdrawal from savings account'
      ]
    );

    // Update account balance
    await client.query(
      'UPDATE savings_accounts SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [balanceAfter, account.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Successfully processed withdrawal of ₱${withdrawAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
      data: {
        transaction: txInsert.rows[0],
        new_balance: balanceAfter
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
