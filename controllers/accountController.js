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
    const { member_id, transaction_type, amount, remarks } = req.body;

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
      'SELECT balance_after FROM share_capital_transactions WHERE member_id = $1 ORDER BY transaction_date DESC, id DESC LIMIT 1',
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

    // Write transaction record
    const insertTx = `
      INSERT INTO share_capital_transactions (member_id, transaction_type, amount, balance_after, remarks)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await client.query(insertTx, [
      member_id,
      transaction_type,
      amount,
      newBalance,
      remarks || `${transaction_type === 'credit' ? 'Equity contribution' : 'Equity withdrawal'}`
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
      'SELECT * FROM share_capital_transactions WHERE member_id = $1 ORDER BY transaction_date DESC, id DESC',
      [memberId]
    );

    const balance = txs.rowCount > 0 ? parseFloat(txs.rows[0].balance_after) : 0;

    res.status(200).json({
      success: true,
      balance,
      transactions: txs.rows
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
    const { member_id, principal_amount, interest_rate, duration_months } = req.body;

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

    // 1. Insert fixed deposit registry item
    const insertFD = `
      INSERT INTO fixed_deposits (member_id, principal_amount, interest_rate, placement_date, maturity_date, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `;
    const fdResult = await client.query(insertFD, [
      member_id,
      principal_amount,
      interest_rate,
      placementDate.toISOString().split('T')[0],
      maturityDate.toISOString().split('T')[0]
    ]);

    const newFD = fdResult.rows[0];

    // 2. Post initial deposit transaction log
    const insertFDTx = `
      INSERT INTO fixed_deposit_transactions (fixed_deposit_id, transaction_type, amount)
      VALUES ($1, 'deposit', $2)
    `;
    await client.query(insertFDTx, [newFD.id, principal_amount]);

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
       COALESCE(json_agg(fdt.* ORDER BY fdt.transaction_date DESC) FILTER (WHERE fdt.id IS NOT NULL), '[]') as transactions
       FROM fixed_deposits fd
       LEFT JOIN fixed_deposit_transactions fdt ON fd.id = fdt.fixed_deposit_id
       WHERE fd.member_id = $1
       GROUP BY fd.id
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
    const { member_id, investment_name, principal_amount } = req.body;

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
       COALESCE(json_agg(it.* ORDER BY it.transaction_date DESC) FILTER (WHERE it.id IS NOT NULL), '[]') as transactions
       FROM investments i
       LEFT JOIN investment_transactions it ON i.id = it.investment_id
       WHERE i.member_id = $1
       GROUP BY i.id
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
