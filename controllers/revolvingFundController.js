import { query } from '../config/db.js';

// @desc    Get all Revolving Fund Liquidation Forms with stats & pagination
// @route   GET /api/revolving-funds
// @access  Protected (Admin, Staff)
export const getLiquidations = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 25 } = req.query;

    const conditions = [];
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      conditions.push(`(
        rf.lf_no ILIKE $${pIdx} OR 
        rf.sheet_name ILIKE $${pIdx} OR 
        rf.voucher_no ILIKE $${pIdx} OR 
        rf.custodian_name ILIKE $${pIdx} OR 
        cv.payee ILIKE $${pIdx} OR 
        cv.check_no ILIKE $${pIdx}
      )`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`rf.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const offset = (pageNum - 1) * pageSize;

    // Overall summary metrics across all liquidations
    const summaryQuery = await query(`
      SELECT 
        COUNT(*)::int AS total_forms,
        COALESCE(SUM(authorized_amount), 0)::numeric(15,2) AS total_authorized,
        COALESCE(SUM(total_liquidated), 0)::numeric(15,2) AS total_liquidated,
        COALESCE(SUM(authorized_amount - total_liquidated), 0)::numeric(15,2) AS total_balance
      FROM revolving_fund_liquidations
    `);

    // Total filtered count for pagination
    const countQuery = await query(`
      SELECT COUNT(*)::int AS total
      FROM revolving_fund_liquidations rf
      LEFT JOIN check_vouchers cv ON rf.check_voucher_id = cv.id
      ${whereClause}
    `, params);

    const totalFiltered = countQuery.rows[0]?.total || 0;

    // Paginated list with linked CV details and item count
    const listParams = [...params, pageSize, offset];
    const listQuery = await query(`
      SELECT 
        rf.id,
        rf.lf_no,
        rf.sheet_name,
        rf.check_voucher_id,
        rf.voucher_no,
        rf.authorized_amount,
        rf.total_liquidated,
        (rf.authorized_amount - rf.total_liquidated) AS balance_remaining,
        rf.status,
        rf.custodian_name,
        rf.period_start,
        rf.period_end,
        rf.notes,
        rf.created_at,
        rf.updated_at,
        cv.voucher_no AS cv_voucher_no,
        cv.check_no AS cv_check_no,
        cv.payee AS cv_payee,
        cv.bank AS cv_bank,
        cv.amount AS cv_amount,
        cv.voucher_date AS cv_voucher_date,
        COUNT(items.id)::int AS item_count
      FROM revolving_fund_liquidations rf
      LEFT JOIN check_vouchers cv ON rf.check_voucher_id = cv.id
      LEFT JOIN rf_liquidation_items items ON rf.id = items.liquidation_id
      ${whereClause}
      GROUP BY rf.id, cv.id
      ORDER BY 
        CASE 
          WHEN rf.lf_no ~ '^[0-9]+$' THEN LPAD(rf.lf_no, 10, '0')
          WHEN rf.lf_no ~ '^LF[-_ ]*[0-9]+' THEN LPAD(REGEXP_REPLACE(rf.lf_no, '[^0-9]', '', 'g'), 10, '0')
          ELSE rf.lf_no
        END DESC,
        rf.created_at DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
    `, listParams);

    res.status(200).json({
      success: true,
      data: listQuery.rows,
      summary: summaryQuery.rows[0] || {
        total_forms: 0,
        total_authorized: 0,
        total_liquidated: 0,
        total_balance: 0
      },
      pagination: {
        total: totalFiltered,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(totalFiltered / pageSize) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single Liquidation Form by ID with all items & breakdown
// @route   GET /api/revolving-funds/:id
// @access  Protected (Admin, Staff)
export const getLiquidationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lfResult = await query(`
      SELECT 
        rf.*,
        (rf.authorized_amount - rf.total_liquidated) AS balance_remaining,
        cv.voucher_no AS cv_voucher_no,
        cv.check_no AS cv_check_no,
        cv.payee AS cv_payee,
        cv.bank AS cv_bank,
        cv.amount AS cv_amount,
        cv.voucher_date AS cv_voucher_date
      FROM revolving_fund_liquidations rf
      LEFT JOIN check_vouchers cv ON rf.check_voucher_id = cv.id
      WHERE rf.id = $1
    `, [id]);

    if (lfResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Revolving Fund Liquidation Form not found.' }
      });
    }

    const itemsResult = await query(`
      SELECT *
      FROM rf_liquidation_items
      WHERE liquidation_id = $1
      ORDER BY sort_order ASC, item_date ASC NULLS LAST, created_at ASC
    `, [id]);

    // Calculate account summaries (e.g. Office Supplies: ₱..., Wages: ₱...)
    const accountSummary = {};
    const categorySummary = {};
    let validItemTotal = 0;

    for (const item of itemsResult.rows) {
      if (!item.is_cancelled) {
        const amt = parseFloat(item.amount) || 0;
        if (amt > 0) {
          validItemTotal += amt;

          const acct = (item.account_name || '').trim();
          if (acct && !/date\s*submitted|date\s*approved|prepared|approved|checked|received|unassigned/i.test(acct)) {
            accountSummary[acct] = (accountSummary[acct] || 0) + amt;
          }

          const cat = (item.category || '').trim();
          if (cat) {
            categorySummary[cat] = (categorySummary[cat] || 0) + amt;
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...lfResult.rows[0],
        items: itemsResult.rows,
        accountSummary,
        categorySummary,
        validItemTotal
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Revolving Fund Liquidation Form
// @route   POST /api/revolving-funds
// @access  Protected (Admin, Staff)
export const createLiquidation = async (req, res, next) => {
  try {
    const {
      lf_no,
      sheet_name,
      check_voucher_id,
      voucher_no,
      authorized_amount = 0,
      custodian_name = 'Michelle M. Pable',
      period_start,
      period_end,
      notes,
      items = []
    } = req.body;

    if (!lf_no) {
      return res.status(400).json({
        success: false,
        error: { message: 'Liquidation Form Number (LF No.) is required.' }
      });
    }

    // Check if check_voucher_id provided, fetch voucher_no if needed
    let finalVoucherNo = voucher_no;
    if (check_voucher_id && !finalVoucherNo) {
      const cvRes = await query('SELECT voucher_no FROM check_vouchers WHERE id = $1', [check_voucher_id]);
      if (cvRes.rows.length > 0) {
        finalVoucherNo = cvRes.rows[0].voucher_no;
      }
    }

    // Insert LF
    const insertLfQuery = await query(`
      INSERT INTO revolving_fund_liquidations
        (lf_no, sheet_name, check_voucher_id, voucher_no, authorized_amount, custodian_name, period_start, period_end, notes)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      lf_no.trim(),
      sheet_name || lf_no.trim(),
      check_voucher_id || null,
      finalVoucherNo || null,
      parseFloat(authorized_amount) || 0,
      custodian_name || 'Michelle M. Pable',
      period_start || null,
      period_end || null,
      notes || null
    ]);

    const createdLf = insertLfQuery.rows[0];

    // Insert items if provided
    let totalLiq = 0;
    if (Array.isArray(items) && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const amt = parseFloat(item.amount) || 0;
        const isCancelled = Boolean(item.is_cancelled || /cancelled/i.test(item.particulars || '') || /cancelled/i.test(item.remarks || ''));
        if (!isCancelled) totalLiq += amt;

        let itemDate = item.item_date || null;
        if (!itemDate && item.item_date_raw) {
          const parsed = new Date(item.item_date_raw);
          if (!isNaN(parsed.getTime())) {
            itemDate = parsed.toISOString().split('T')[0];
          }
        }

        await query(`
          INSERT INTO rf_liquidation_items
            (liquidation_id, item_date, item_date_raw, particulars, amount, account_name, category, remarks, is_cancelled, sort_order)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          createdLf.id,
          itemDate,
          item.item_date_raw || null,
          item.particulars || '',
          amt,
          item.account_name || '',
          item.category || '',
          item.remarks || '',
          isCancelled,
          i + 1
        ]);
      }

      await recalculateLfTotal(createdLf.id);
      createdLf.total_liquidated = totalLiq;
    }

    res.status(201).json({
      success: true,
      data: createdLf,
      message: `Liquidation Form ${createdLf.lf_no} created successfully.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Revolving Fund Liquidation Form
// @route   PUT /api/revolving-funds/:id
// @access  Protected (Admin, Staff)
export const updateLiquidation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      lf_no,
      sheet_name,
      check_voucher_id,
      voucher_no,
      authorized_amount,
      status,
      custodian_name,
      period_start,
      period_end,
      notes,
      items
    } = req.body;

    let finalVoucherNo = voucher_no;
    if (check_voucher_id) {
      const cvRes = await query('SELECT voucher_no FROM check_vouchers WHERE id = $1', [check_voucher_id]);
      if (cvRes.rows.length > 0) {
        finalVoucherNo = cvRes.rows[0].voucher_no;
      }
    } else if (check_voucher_id === null) {
      finalVoucherNo = null;
    }

    const updateRes = await query(`
      UPDATE revolving_fund_liquidations
      SET
        lf_no = COALESCE($1, lf_no),
        sheet_name = COALESCE($2, sheet_name),
        check_voucher_id = $3,
        voucher_no = $4,
        authorized_amount = COALESCE($5, authorized_amount),
        status = COALESCE($6, status),
        custodian_name = COALESCE($7, custodian_name),
        period_start = COALESCE($8, period_start),
        period_end = COALESCE($9, period_end),
        notes = COALESCE($10, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [
      lf_no ? lf_no.trim() : null,
      sheet_name || null,
      check_voucher_id !== undefined ? check_voucher_id : null,
      finalVoucherNo,
      authorized_amount !== undefined ? parseFloat(authorized_amount) : null,
      status || null,
      custodian_name || null,
      period_start || null,
      period_end || null,
      notes || null,
      id
    ]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Liquidation Form not found.' }
      });
    }

    // Upsert items if provided
    if (Array.isArray(items)) {
      // 1. Delete removed items
      const incomingIds = items.filter(it => it.id).map(it => it.id);
      if (incomingIds.length > 0) {
        await query(
          `DELETE FROM rf_liquidation_items WHERE liquidation_id = $1 AND id NOT IN (${incomingIds.map((_, idx) => `$${idx + 2}`).join(', ')})`,
          [id, ...incomingIds]
        );
      } else if (items.length === 0) {
        await query('DELETE FROM rf_liquidation_items WHERE liquidation_id = $1', [id]);
      }

      // 2. Insert or update items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const amt = parseFloat(item.amount) || 0;
        const isCancelled = Boolean(item.is_cancelled || /cancelled/i.test(item.particulars || '') || /cancelled/i.test(item.remarks || ''));

        let itemDate = item.item_date || null;
        if (!itemDate && item.item_date_raw) {
          const parsed = new Date(item.item_date_raw);
          if (!isNaN(parsed.getTime())) {
            itemDate = parsed.toISOString().split('T')[0];
          }
        }

        if (item.id) {
          // Update existing item
          await query(`
            UPDATE rf_liquidation_items
            SET
              item_date = $1,
              item_date_raw = $2,
              particulars = $3,
              amount = $4,
              account_name = $5,
              category = $6,
              remarks = $7,
              is_cancelled = $8,
              sort_order = $9
            WHERE id = $10 AND liquidation_id = $11
          `, [
            itemDate,
            item.item_date_raw || null,
            item.particulars || '',
            amt,
            item.account_name || '',
            item.category || '',
            item.remarks || '',
            isCancelled,
            i + 1,
            item.id,
            id
          ]);
        } else {
          // Insert new item
          await query(`
            INSERT INTO rf_liquidation_items
              (liquidation_id, item_date, item_date_raw, particulars, amount, account_name, category, remarks, is_cancelled, sort_order)
            VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            id,
            itemDate,
            item.item_date_raw || null,
            item.particulars || '',
            amt,
            item.account_name || '',
            item.category || '',
            item.remarks || '',
            isCancelled,
            i + 1
          ]);
        }
      }

      // Recalculate totals and period
      await recalculateLfTotal(id);
    }

    const updatedLf = await query('SELECT * FROM revolving_fund_liquidations WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      data: updatedLf.rows[0] || updateRes.rows[0],
      message: 'Liquidation Form updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};


// Helper to sync category breakdown amounts from an LF into its linked Check Voucher
export const syncVoucherWithLiquidationData = async (liquidationId, checkVoucherId) => {
  // 1. Get liquidation form details
  const lfRes = await query('SELECT * FROM revolving_fund_liquidations WHERE id = $1', [liquidationId]);
  if (lfRes.rows.length === 0) {
    throw new Error('Liquidation form not found');
  }
  const lf = lfRes.rows[0];

  // 2. Get active items
  const itemsRes = await query(`
    SELECT particulars, account_name, category, amount
    FROM rf_liquidation_items
    WHERE liquidation_id = $1 AND is_cancelled = false
    ORDER BY sort_order ASC, item_date ASC NULLS LAST
  `, [liquidationId]);

  const categoryTotals = {};
  const accountTotals = {};
  let rawTotal = 0;

  for (const item of itemsRes.rows) {
    const amt = parseFloat(item.amount) || 0;
    if (amt > 0) {
      rawTotal += amt;
      const cat = (item.category || 'Operation').trim();
      categoryTotals[cat] = Math.round(((categoryTotals[cat] || 0) + amt) * 100) / 100;

      const acct = (item.account_name || '').trim();
      if (acct) {
        accountTotals[acct] = Math.round(((accountTotals[acct] || 0) + amt) * 100) / 100;
      }
    }
  }

  const totalLiquidated = Math.round(rawTotal * 100) / 100;

  // 3. Get check voucher
  const cvRes = await query('SELECT * FROM check_vouchers WHERE id = $1', [checkVoucherId]);
  if (cvRes.rows.length === 0) {
    throw new Error('Check voucher not found');
  }
  const cv = cvRes.rows[0];

  // Parse existing details
  let existingDetails = [];
  if (Array.isArray(cv.details)) {
    existingDetails = cv.details;
  } else if (typeof cv.details === 'string') {
    try {
      const parsed = JSON.parse(cv.details);
      if (Array.isArray(parsed)) existingDetails = parsed;
    } catch {}
  }

  const updatedRows = [];
  const matchedCategories = new Set();
  let hasBankRow = false;

  if (existingDetails.length > 0) {
    for (const row of existingDetails) {
      const desc = (row.book_of_account || row.description || '').trim();
      const descLower = desc.toLowerCase();

      // Check if this row is a bank / credit account
      if (
        /cib\b|cash\s*in\s*bank|metrobank|bdo|landbank|pnb|bpi|bank/i.test(descLower) ||
        (parseFloat(row.credit) > 0) ||
        (parseFloat(row.amount) < 0)
      ) {
        hasBankRow = true;
        updatedRows.push({
          book_of_account: desc || `CIB-${cv.bank || 'Metrobank'}`,
          amount: -totalLiquidated
        });
        continue;
      }

      // Check if row matches a category (exact or case-insensitive)
      const matchedCat = Object.keys(categoryTotals).find(c => c.toLowerCase() === descLower);
      if (matchedCat) {
        matchedCategories.add(matchedCat.toLowerCase());
        updatedRows.push({
          book_of_account: desc,
          amount: categoryTotals[matchedCat]
        });
        continue;
      }

      // Check if row matches an account
      const matchedAcct = Object.keys(accountTotals).find(a => a.toLowerCase() === descLower);
      if (matchedAcct) {
        updatedRows.push({
          book_of_account: desc,
          amount: accountTotals[matchedAcct]
        });
        continue;
      }

      // Preserve row as-is
      updatedRows.push({
        book_of_account: desc,
        amount: parseFloat(row.amount) || parseFloat(row.debit) || 0
      });
    }
  }

  // If there are categories not yet present in existing rows, add them
  for (const [cat, amt] of Object.entries(categoryTotals)) {
    if (!matchedCategories.has(cat.toLowerCase())) {
      const bankIdx = updatedRows.findIndex(r => r.amount < 0);
      const newRow = { book_of_account: cat, amount: amt };
      if (bankIdx >= 0) {
        updatedRows.splice(bankIdx, 0, newRow);
      } else {
        updatedRows.push(newRow);
      }
    }
  }

  // If no bank row exists, append one for balancing credit
  if (!hasBankRow) {
    const bankName = cv.bank ? `CIB-${cv.bank}` : 'CIB-Metrobank';
    updatedRows.push({
      book_of_account: bankName,
      amount: -totalLiquidated
    });
  }

  // Update check voucher with balanced rows and amount
  const updateCvRes = await query(`
    UPDATE check_vouchers
    SET
      amount = $1,
      details = $2::jsonb,
      particulars = COALESCE(NULLIF(particulars, ''), $3),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
  `, [
    totalLiquidated,
    JSON.stringify(updatedRows),
    `Revolving Fund Replenishment - ${lf.sheet_name || lf.lf_no}`,
    checkVoucherId
  ]);

  return {
    checkVoucher: updateCvRes.rows[0],
    categoryTotals,
    totalLiquidated,
    rows: updatedRows
  };
};

// @desc    Quick link / unlink a Check Voucher to a Liquidation Form (with optional auto-sync)
// @route   POST /api/revolving-funds/:id/link-voucher
// @access  Protected (Admin, Staff)
export const linkCheckVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { check_voucher_id, auto_sync_amounts } = req.body;

    let voucherNo = null;
    if (check_voucher_id) {
      const cvRes = await query('SELECT voucher_no FROM check_vouchers WHERE id = $1', [check_voucher_id]);
      if (cvRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Check voucher not found.' }
        });
      }
      voucherNo = cvRes.rows[0].voucher_no;
    }

    const updateRes = await query(`
      UPDATE revolving_fund_liquidations
      SET 
        check_voucher_id = $1,
        voucher_no = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [check_voucher_id || null, voucherNo, id]);

    let syncResult = null;
    if (check_voucher_id && auto_sync_amounts) {
      try {
        syncResult = await syncVoucherWithLiquidationData(id, check_voucher_id);
      } catch (err) {
        console.warn('Auto-sync check voucher amounts failed:', err);
      }
    }

    res.status(200).json({
      success: true,
      data: updateRes.rows[0],
      syncResult,
      message: check_voucher_id
        ? `Linked to Check Voucher ${voucherNo}${syncResult ? ` and synchronized ₱${syncResult.totalLiquidated.toLocaleString('en-US', { minimumFractionDigits: 2 })}.` : '.'}`
        : 'Unlinked from Check Voucher.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Explicitly sync / auto-populate amounts from Liquidation Form to its linked Check Voucher
// @route   POST /api/revolving-funds/:id/sync-voucher-amounts
// @access  Protected (Admin, Staff)
export const syncVoucherAmounts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lfRes = await query('SELECT * FROM revolving_fund_liquidations WHERE id = $1', [id]);
    if (lfRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Liquidation form not found' } });
    }
    const lf = lfRes.rows[0];
    const cvId = req.body.check_voucher_id || lf.check_voucher_id;
    if (!cvId) {
      return res.status(400).json({
        success: false,
        error: { message: 'No check voucher linked to this liquidation form' }
      });
    }

    const result = await syncVoucherWithLiquidationData(id, cvId);
    res.status(200).json({
      success: true,
      data: result,
      message: `Successfully synchronized ₱${result.totalLiquidated.toLocaleString('en-US', { minimumFractionDigits: 2 })} from ${lf.lf_no} to Check Voucher.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Liquidation Form
// @route   DELETE /api/revolving-funds/:id
// @access  Protected (Admin, Staff)
export const deleteLiquidation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM revolving_fund_liquidations WHERE id = $1 RETURNING lf_no', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Liquidation Form not found.' }
      });
    }
    res.status(200).json({
      success: true,
      message: `Liquidation Form ${result.rows[0].lf_no} deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add line item to Liquidation Form
// @route   POST /api/revolving-funds/:id/items
// @access  Protected (Admin, Staff)
export const addLiquidationItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      item_date,
      item_date_raw,
      particulars,
      amount,
      account_name,
      category,
      remarks,
      is_cancelled = false
    } = req.body;

    const amt = parseFloat(amount) || 0;

    const insertRes = await query(`
      INSERT INTO rf_liquidation_items
        (liquidation_id, item_date, item_date_raw, particulars, amount, account_name, category, remarks, is_cancelled)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      item_date || null,
      item_date_raw || null,
      particulars || '',
      amt,
      account_name || '',
      category || '',
      remarks || '',
      Boolean(is_cancelled)
    ]);

    // Recalculate total_liquidated on LF
    await recalculateLfTotal(id);

    res.status(201).json({
      success: true,
      data: insertRes.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update line item
// @route   PUT /api/revolving-funds/items/:itemId
// @access  Protected (Admin, Staff)
export const updateLiquidationItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const {
      item_date,
      item_date_raw,
      particulars,
      amount,
      account_name,
      category,
      remarks,
      is_cancelled
    } = req.body;

    const updateRes = await query(`
      UPDATE rf_liquidation_items
      SET
        item_date = COALESCE($1, item_date),
        item_date_raw = COALESCE($2, item_date_raw),
        particulars = COALESCE($3, particulars),
        amount = COALESCE($4, amount),
        account_name = COALESCE($5, account_name),
        category = COALESCE($6, category),
        remarks = COALESCE($7, remarks),
        is_cancelled = COALESCE($8, is_cancelled)
      WHERE id = $9
      RETURNING *
    `, [
      item_date || null,
      item_date_raw || null,
      particulars !== undefined ? particulars : null,
      amount !== undefined ? parseFloat(amount) : null,
      account_name !== undefined ? account_name : null,
      category !== undefined ? category : null,
      remarks !== undefined ? remarks : null,
      is_cancelled !== undefined ? Boolean(is_cancelled) : null,
      itemId
    ]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Item not found.' }
      });
    }

    const item = updateRes.rows[0];
    await recalculateLfTotal(item.liquidation_id);

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete line item
// @route   DELETE /api/revolving-funds/items/:itemId
// @access  Protected (Admin, Staff)
export const deleteLiquidationItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const delRes = await query('DELETE FROM rf_liquidation_items WHERE id = $1 RETURNING liquidation_id', [itemId]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Item not found.' }
      });
    }
    await recalculateLfTotal(delRes.rows[0].liquidation_id);
    res.status(200).json({
      success: true,
      message: 'Item deleted.'
    });
  } catch (error) {
    next(error);
  }
};

// Helper: Recalculate LF total_liquidated and period dates
async function recalculateLfTotal(liquidationId) {
  const sumRes = await query(`
    SELECT 
      COALESCE(SUM(amount), 0)::numeric(15,2) AS total,
      MIN(item_date) AS p_start,
      MAX(item_date) AS p_end
    FROM rf_liquidation_items
    WHERE liquidation_id = $1 AND is_cancelled = false
  `, [liquidationId]);

  const { total, p_start, p_end } = sumRes.rows[0];

  await query(`
    UPDATE revolving_fund_liquidations
    SET 
      total_liquidated = $1,
      period_start = COALESCE($2, period_start),
      period_end = COALESCE($3, period_end),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [total, p_start, p_end, liquidationId]);
}

// @desc    Get all Revolving Fund accounts (predefined + custom + existing in items)
// @route   GET /api/revolving-funds/accounts
// @access  Protected (Admin, Staff)
export const getRevolvingFundAccounts = async (req, res, next) => {
  try {
    const customRes = await query('SELECT name, category FROM rf_custom_accounts ORDER BY name ASC');
    const itemsRes = await query(`
      SELECT DISTINCT account_name, category 
      FROM rf_liquidation_items 
      WHERE account_name IS NOT NULL AND TRIM(account_name) != ''
      ORDER BY account_name ASC
    `);

    // Combine unique account names
    const accountMap = new Map();

    // 1. Add DB items
    for (const row of itemsRes.rows) {
      if (row.account_name && row.account_name.trim()) {
        const clean = row.account_name.trim();
        accountMap.set(clean.toLowerCase(), { name: clean, category: row.category || 'Operation' });
      }
    }

    // 2. Add custom accounts table (overrides or adds)
    for (const row of customRes.rows) {
      if (row.name && row.name.trim()) {
        const clean = row.name.trim();
        accountMap.set(clean.toLowerCase(), { name: clean, category: row.category || 'Operation' });
      }
    }

    res.status(200).json({
      success: true,
      data: Array.from(accountMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save/add custom revolving fund account
// @route   POST /api/revolving-funds/accounts
// @access  Protected (Admin, Staff)
export const saveRevolvingFundAccount = async (req, res, next) => {
  try {
    const { name, category = 'Operation' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Account name is required' });
    }

    const cleanName = name.trim();
    const cleanCat = (category || 'Operation').trim();

    await query(`
      INSERT INTO rf_custom_accounts (name, category)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category
    `, [cleanName, cleanCat]);

    res.status(200).json({
      success: true,
      data: { name: cleanName, category: cleanCat }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete custom revolving fund account
// @route   DELETE /api/revolving-funds/accounts/:name
// @access  Protected (Admin, Staff)
export const deleteRevolvingFundAccount = async (req, res, next) => {
  try {
    const { name } = req.params;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Account name is required' });
    }

    await query('DELETE FROM rf_custom_accounts WHERE LOWER(name) = LOWER($1)', [decodeURIComponent(name).trim()]);

    res.status(200).json({
      success: true,
      message: 'Account removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
