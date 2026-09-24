import { query } from '../config/db.js';

// @desc    Get all STL Liquidation Forms with stats & pagination
// @route   GET /api/stl-liquidations
// @access  Protected (Admin, Staff)
export const getStlLiquidations = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;

    const conditions = [];
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      conditions.push(`(
        stl.lf_no ILIKE $${pIdx} OR 
        stl.voucher_no ILIKE $${pIdx} OR 
        stl.prepared_by ILIKE $${pIdx} OR 
        stl.approved_by ILIKE $${pIdx} OR 
        cv.payee ILIKE $${pIdx} OR 
        cv.check_no ILIKE $${pIdx} OR
        EXISTS (
          SELECT 1 FROM stl_liquidation_items it 
          WHERE it.liquidation_id = stl.id 
          AND (it.particulars ILIKE $${pIdx} OR it.remarks ILIKE $${pIdx})
        )
      )`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`stl.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * pageSize;

    // Overall summary metrics across all STL liquidations
    const summaryQuery = await query(`
      SELECT 
        COUNT(*)::int AS total_forms,
        COUNT(CASE WHEN status = 'open' THEN 1 END)::int AS open_forms,
        COUNT(CASE WHEN status = 'replenished' THEN 1 END)::int AS replenished_forms,
        COALESCE(SUM(authorized_amount), 0)::numeric(15,2) AS total_authorized,
        COALESCE(SUM(total_expense), 0)::numeric(15,2) AS total_expense,
        COALESCE(SUM(cash_on_hand), 0)::numeric(15,2) AS total_cash_on_hand
      FROM stl_liquidations
    `);

    // Total filtered count for pagination
    const countQuery = await query(`
      SELECT COUNT(*)::int AS total
      FROM stl_liquidations stl
      LEFT JOIN check_vouchers cv ON stl.check_voucher_id = cv.id
      ${whereClause}
    `, params);

    const totalFiltered = countQuery.rows[0]?.total || 0;

    // Paginated list
    const listParams = [...params, pageSize, offset];
    const listQuery = await query(`
      SELECT 
        stl.id,
        stl.lf_no,
        stl.check_voucher_id,
        stl.voucher_no,
        stl.authorized_amount,
        stl.total_expense,
        stl.cash_on_hand,
        stl.status,
        stl.prepared_by,
        stl.prepared_designation,
        stl.date_submitted,
        stl.approved_by,
        stl.approved_designation,
        stl.date_approved,
        stl.period_start,
        stl.period_end,
        stl.notes,
        stl.created_at,
        stl.updated_at,
        cv.voucher_no AS cv_voucher_no,
        cv.check_no AS cv_check_no,
        cv.payee AS cv_payee,
        cv.bank AS cv_bank,
        cv.amount AS cv_amount,
        cv.voucher_date AS cv_voucher_date,
        COUNT(items.id)::int AS item_count
      FROM stl_liquidations stl
      LEFT JOIN check_vouchers cv ON stl.check_voucher_id = cv.id
      LEFT JOIN stl_liquidation_items items ON stl.id = items.liquidation_id
      ${whereClause}
      GROUP BY stl.id, cv.id
      ORDER BY 
        CASE 
          WHEN stl.lf_no ~ '^[0-9]+' THEN LPAD(REGEXP_REPLACE(stl.lf_no, '[^0-9]', '', 'g'), 10, '0')
          ELSE stl.lf_no
        END DESC,
        stl.created_at DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
    `, listParams);

    res.status(200).json({
      success: true,
      data: listQuery.rows,
      summary: summaryQuery.rows[0] || {
        total_forms: 0,
        open_forms: 0,
        replenished_forms: 0,
        total_authorized: 0,
        total_expense: 0,
        total_cash_on_hand: 0
      },
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search and list loans for linking to STL liquidation items
// @route   GET /api/stl-liquidations/loans
// @access  Protected (Admin, Staff)
export const searchLoansForLiquidation = async (req, res, next) => {
  try {
    const { query: searchStr = '' } = req.query;
    const term = searchStr ? String(searchStr).trim() : '';

    let sql = `
      SELECT 
        l.id,
        l.laf_no,
        l.principal_amount,
        l.net_proceeds,
        l.disbursed_at,
        l.created_at,
        l.status,
        CONCAT(m.first_name, ' ', m.last_name) AS borrower_name,
        m.member_no,
        lp.name AS product_name
      FROM loans l
      LEFT JOIN members m ON l.member_id = m.id
      LEFT JOIN loan_products lp ON l.loan_product_id = lp.id
      WHERE 1=1
    `;
    const params = [];

    if (term) {
      params.push(`%${term}%`);
      sql += ` AND (
        l.laf_no ILIKE $1 OR 
        m.first_name ILIKE $1 OR 
        m.last_name ILIKE $1 OR 
        CONCAT(m.first_name, ' ', m.last_name) ILIKE $1 OR
        COALESCE(m.member_no, '') ILIKE $1 OR
        lp.name ILIKE $1
      )`;
    }

    sql += `
      ORDER BY 
        CASE WHEN l.laf_no ~ '^[0-9]+-[0-9]+$' THEN CAST(SPLIT_PART(l.laf_no, '-', 1) AS INTEGER) ELSE 9999 END DESC,
        CASE WHEN l.laf_no ~ '^[0-9]+-[0-9]+$' THEN CAST(SPLIT_PART(l.laf_no, '-', 2) AS INTEGER) ELSE 9999 END DESC,
        l.disbursed_at DESC NULLS LAST,
        l.created_at DESC
      LIMIT 60
    `;

    const result = await query(sql, params);
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single STL Liquidation with all line items
// @route   GET /api/stl-liquidations/:id
// @access  Protected (Admin, Staff)
export const getStlLiquidationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const formQuery = await query(`
      SELECT 
        stl.*,
        cv.voucher_no AS cv_voucher_no,
        cv.check_no AS cv_check_no,
        cv.payee AS cv_payee,
        cv.bank AS cv_bank,
        cv.amount AS cv_amount,
        cv.voucher_date AS cv_voucher_date,
        cv.status AS cv_status
      FROM stl_liquidations stl
      LEFT JOIN check_vouchers cv ON stl.check_voucher_id = cv.id
      WHERE stl.id = $1
    `, [id]);

    if (formQuery.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'STL Liquidation form not found' }
      });
    }

    const itemsQuery = await query(`
      SELECT 
        it.*,
        l.laf_no AS loan_laf_no,
        l.status AS loan_status,
        l.principal_amount AS loan_principal,
        l.net_proceeds AS loan_net_proceeds,
        l.disbursed_at AS loan_disbursed_at,
        CONCAT(m.first_name, ' ', m.last_name) AS borrower_name,
        m.member_no,
        lp.name AS product_name
      FROM stl_liquidation_items it
      LEFT JOIN loans l ON it.loan_id = l.id
      LEFT JOIN members m ON l.member_id = m.id
      LEFT JOIN loan_products lp ON l.loan_product_id = lp.id
      WHERE it.liquidation_id = $1
      ORDER BY it.sort_order ASC, it.release_date ASC, it.created_at ASC
    `, [id]);

    res.status(200).json({
      success: true,
      data: {
        ...formQuery.rows[0],
        items: itemsQuery.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new STL Liquidation Form
// @route   POST /api/stl-liquidations
// @access  Protected (Admin, Staff)
export const createStlLiquidation = async (req, res, next) => {
  try {
    const {
      lf_no,
      authorized_amount = 100000.00,
      prepared_by = 'Vanessa Mae A. Mondrano',
      prepared_designation = 'Staff',
      date_submitted = new Date().toISOString().split('T')[0],
      approved_by = 'Michelle Pable',
      approved_designation = 'Manager',
      date_approved = new Date().toISOString().split('T')[0],
      period_start,
      period_end,
      notes,
      items = []
    } = req.body;

    if (!lf_no || !String(lf_no).trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Liquidation Form number (LF no.) is required' }
      });
    }

    // Calculate total expense from valid items
    const parsedAuthorized = Math.max(0, parseFloat(authorized_amount) || 100000.00);
    let totalExpense = 0;
    const cleanItems = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const amt = parseFloat(it.amount) || 0;
      if (it.particulars && String(it.particulars).trim()) {
        totalExpense += amt;
        const resolvedLoanId = await resolveLoanId(it.loan_id, it.particulars);
        cleanItems.push({
          release_date: it.release_date || null,
          release_date_raw: it.release_date_raw || (it.release_date ? formatRawDate(it.release_date) : null),
          particulars: String(it.particulars).trim(),
          amount: amt,
          remarks: it.remarks ? String(it.remarks).trim() : null,
          sort_order: i + 1,
          loan_id: resolvedLoanId || null
        });
      }
    }

    const cashOnHand = parsedAuthorized - totalExpense;

    const insertForm = await query(`
      INSERT INTO stl_liquidations (
        lf_no,
        authorized_amount,
        total_expense,
        cash_on_hand,
        status,
        prepared_by,
        prepared_designation,
        date_submitted,
        approved_by,
        approved_designation,
        date_approved,
        period_start,
        period_end,
        notes
      ) VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      String(lf_no).trim(),
      parsedAuthorized,
      totalExpense,
      cashOnHand,
      prepared_by ? String(prepared_by).trim() : 'Vanessa Mae A. Mondrano',
      prepared_designation ? String(prepared_designation).trim() : 'Staff',
      date_submitted || null,
      approved_by ? String(approved_by).trim() : 'Michelle Pable',
      approved_designation ? String(approved_designation).trim() : 'Manager',
      date_approved || null,
      period_start || null,
      period_end || null,
      notes || null
    ]);

    const newForm = insertForm.rows[0];

    // Insert items
    for (const item of cleanItems) {
      await query(`
        INSERT INTO stl_liquidation_items (
          liquidation_id,
          release_date,
          release_date_raw,
          particulars,
          amount,
          remarks,
          sort_order,
          loan_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        newForm.id,
        item.release_date,
        item.release_date_raw,
        item.particulars,
        item.amount,
        item.remarks,
        item.sort_order,
        item.loan_id
      ]);
    }

    res.status(201).json({
      success: true,
      message: 'STL Liquidation Form created successfully',
      data: {
        ...newForm,
        items: cleanItems
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update STL Liquidation Form and items
// @route   PUT /api/stl-liquidations/:id
// @access  Protected (Admin, Staff)
export const updateStlLiquidation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      lf_no,
      authorized_amount,
      status,
      prepared_by,
      prepared_designation,
      date_submitted,
      approved_by,
      approved_designation,
      date_approved,
      period_start,
      period_end,
      notes,
      items
    } = req.body;

    const checkRes = await query('SELECT * FROM stl_liquidations WHERE id = $1', [id]);
    if (checkRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'STL Liquidation form not found' }
      });
    }

    const currentForm = checkRes.rows[0];
    const parsedAuthorized = authorized_amount !== undefined 
      ? Math.max(0, parseFloat(authorized_amount) || 0)
      : parseFloat(currentForm.authorized_amount);

    let totalExpense = parseFloat(currentForm.total_expense);
    let updatedItems = [];

    if (Array.isArray(items)) {
      totalExpense = 0;
      await query('DELETE FROM stl_liquidation_items WHERE liquidation_id = $1', [id]);

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const amt = parseFloat(it.amount) || 0;
        if (it.particulars && String(it.particulars).trim()) {
          totalExpense += amt;
          const release_date_raw = it.release_date_raw || (it.release_date ? formatRawDate(it.release_date) : null);
          const resolvedLoanId = await resolveLoanId(it.loan_id, it.particulars);
          const ins = await query(`
            INSERT INTO stl_liquidation_items (
              liquidation_id,
              release_date,
              release_date_raw,
              particulars,
              amount,
              remarks,
              sort_order,
              loan_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
          `, [
            id,
            it.release_date || null,
            release_date_raw,
            String(it.particulars).trim(),
            amt,
            it.remarks ? String(it.remarks).trim() : null,
            i + 1,
            resolvedLoanId || null
          ]);
          updatedItems.push(ins.rows[0]);
        }
      }
    }

    const cashOnHand = parsedAuthorized - totalExpense;

    const updateForm = await query(`
      UPDATE stl_liquidations
      SET 
        lf_no = COALESCE($1, lf_no),
        authorized_amount = $2,
        total_expense = $3,
        cash_on_hand = $4,
        status = COALESCE($5, status),
        prepared_by = COALESCE($6, prepared_by),
        prepared_designation = COALESCE($7, prepared_designation),
        date_submitted = COALESCE($8, date_submitted),
        approved_by = COALESCE($9, approved_by),
        approved_designation = COALESCE($10, approved_designation),
        date_approved = COALESCE($11, date_approved),
        period_start = COALESCE($12, period_start),
        period_end = COALESCE($13, period_end),
        notes = COALESCE($14, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
    `, [
      lf_no ? String(lf_no).trim() : null,
      parsedAuthorized,
      totalExpense,
      cashOnHand,
      status || null,
      prepared_by || null,
      prepared_designation || null,
      date_submitted || null,
      approved_by || null,
      approved_designation || null,
      date_approved || null,
      period_start || null,
      period_end || null,
      notes || null,
      id
    ]);

    res.status(200).json({
      success: true,
      message: 'STL Liquidation Form updated successfully',
      data: {
        ...updateForm.rows[0],
        items: updatedItems.length > 0 ? updatedItems : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete STL Liquidation Form
// @route   DELETE /api/stl-liquidations/:id
// @access  Protected (Admin only)
export const deleteStlLiquidation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM stl_liquidations WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'STL Liquidation form not found' }
      });
    }

    res.status(200).json({
      success: true,
      message: 'STL Liquidation Form deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Link check voucher to STL liquidation
// @route   POST /api/stl-liquidations/:id/link-voucher
// @access  Protected (Admin, Staff)
export const linkCheckVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { check_voucher_id } = req.body;

    if (!check_voucher_id) {
      // Unlink
      const updateRes = await query(`
        UPDATE stl_liquidations
        SET check_voucher_id = NULL, voucher_no = NULL, status = 'open', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id]);

      return res.status(200).json({
        success: true,
        message: 'Check voucher unlinked successfully',
        data: updateRes.rows[0]
      });
    }

    const cvQuery = await query('SELECT * FROM check_vouchers WHERE id = $1', [check_voucher_id]);
    if (cvQuery.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Check voucher not found' }
      });
    }

    const cv = cvQuery.rows[0];

    const updateRes = await query(`
      UPDATE stl_liquidations
      SET check_voucher_id = $1, voucher_no = $2, status = 'replenished', updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [cv.id, cv.voucher_no, id]);

    res.status(200).json({
      success: true,
      message: `Linked to Check Voucher #${cv.voucher_no}`,
      data: updateRes.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Helper to convert YYYY-MM-DD to '07-Sep'
function formatRawDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    return `${day}-${mon}`;
  } catch {
    return dateStr;
  }
}

// Helper to find loan_id if not provided by parsing LAF no.
async function resolveLoanId(providedLoanId, particulars) {
  if (providedLoanId) return providedLoanId;
  if (!particulars) return null;
  const m = particulars.match(/(\d+-\d+|\d+)/);
  if (m) {
    const rawNo = m[1];
    const matchRes = await query(`
      SELECT id FROM loans 
      WHERE laf_no = $1 
         OR laf_no ILIKE $2
         OR laf_no LIKE '%' || $1
      ORDER BY created_at DESC 
      LIMIT 1
    `, [rawNo, `%${rawNo}%`]);
    if (matchRes.rowCount > 0) {
      return matchRes.rows[0].id;
    }
  }
  return null;
}

