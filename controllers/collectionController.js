import pool from '../config/db.js';

/**
 * Format collection row from PostgreSQL into CollectionItem shape
 */
function formatCollectionRow(row) {
  // Format date to YYYY-MM-DD
  let dateStr = row.date;
  if (dateStr instanceof Date) {
    const y = dateStr.getFullYear();
    const m = String(dateStr.getMonth() + 1).padStart(2, '0');
    const d = String(dateStr.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }
  return {
    id: row.id,
    tab: row.tab,
    date: dateStr,
    or_no: row.or_no ? String(row.or_no).replace(/^INV#\s*/i, '').trim() : '',
    payor_name: row.payor_name,
    member_id: row.member_id || undefined,
    loans: Array.isArray(row.loans) ? row.loans : (typeof row.loans === 'string' ? JSON.parse(row.loans) : undefined),
    loan_account: row.loan_account || undefined,
    principal_amount: row.principal_amount !== null && row.principal_amount !== undefined ? parseFloat(row.principal_amount) : undefined,
    interest_account: row.interest_account || undefined,
    interest_amount: row.interest_amount !== null && row.interest_amount !== undefined ? parseFloat(row.interest_amount) : undefined,
    fines_account: row.fines_account || undefined,
    fines_amount: row.fines_amount !== null && row.fines_amount !== undefined ? parseFloat(row.fines_amount) : undefined,
    common_share_amount: row.common_share_amount !== null && row.common_share_amount !== undefined ? parseFloat(row.common_share_amount) : undefined,
    item_name: row.item_name || undefined,
    item_category: row.item_category || undefined,
    quantity: row.quantity !== null && row.quantity !== undefined ? parseInt(row.quantity, 10) : undefined,
    unit_price: row.unit_price !== null && row.unit_price !== undefined ? parseFloat(row.unit_price) : undefined,
    service_type: row.service_type || undefined,
    service_copies: row.service_copies !== null && row.service_copies !== undefined ? parseInt(row.service_copies, 10) : undefined,
    service_rate: row.service_rate !== null && row.service_rate !== undefined ? parseFloat(row.service_rate) : undefined,
    particulars: row.particulars || undefined,
    other_category: row.other_category || undefined,
    amount: parseFloat(row.amount || 0),
    payment_method: row.payment_method || 'Cash',
    reference_no: row.reference_no || undefined,
    bank_name: row.bank_name || undefined,
    status: row.status || 'completed',
    remarks: row.remarks || undefined,
    collected_by: row.collected_by || 'CHINNETTE A. LAMOSTE',
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * @desc Get all collections
 * @route GET /api/collections
 * @access Private (Admin, Staff)
 */
export async function getCollections(req, res) {
  try {
    const { tab, search, payment_method, status } = req.query;

    let query = `SELECT * FROM collections WHERE 1=1`;
    const params = [];

    if (tab && tab !== 'all') {
      if (tab === 'sales_services' || tab === 'sales' || tab === 'services') {
        query += ` AND tab IN ('sales', 'services', 'sales_services')`;
      } else {
        params.push(tab);
        query += ` AND tab = $${params.length}`;
      }
    }

    if (payment_method && payment_method !== 'all') {
      params.push(payment_method);
      query += ` AND payment_method = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(or_no) LIKE $${params.length} OR
        LOWER(payor_name) LIKE $${params.length} OR
        LOWER(COALESCE(loan_account, '')) LIKE $${params.length} OR
        LOWER(COALESCE(item_name, '')) LIKE $${params.length} OR
        LOWER(COALESCE(service_type, '')) LIKE $${params.length} OR
        LOWER(COALESCE(particulars, '')) LIKE $${params.length} OR
        LOWER(COALESCE(bank_name, '')) LIKE $${params.length} OR
        LOWER(COALESCE(reference_no, '')) LIKE $${params.length} OR
        LOWER(COALESCE(remarks, '')) LIKE $${params.length}
      )`;
    }

    query += ` ORDER BY date DESC, or_no DESC, created_at DESC`;

    const result = await pool.query(query, params);
    const collections = result.rows.map(formatCollectionRow);

    return res.status(200).json({
      success: true,
      count: collections.length,
      data: collections
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve collections' }
    });
  }
}

/**
 * Compute the next sequential numeric receipt number.
 * MUST be called within a transaction holding an advisory lock or as a read query.
 */
export async function computeNextReceiptNo(clientOrPool) {
  const result = await clientOrPool.query(`
    SELECT or_no 
    FROM collections 
    WHERE or_no ~ '^[0-9]+$' 
    ORDER BY CAST(or_no AS BIGINT) DESC 
    LIMIT 1
  `);

  let nextSeq = 1001;
  if (result.rowCount > 0 && result.rows[0].or_no) {
    const currentSeq = parseInt(result.rows[0].or_no, 10);
    if (!isNaN(currentSeq)) {
      nextSeq = currentSeq + 1;
    }
  }

  return String(nextSeq);
}

/**
 * @desc Get next sequential receipt number
 * @route GET /api/collections/next-receipt-no
 * @access Private (Admin, Staff)
 */
export async function getNextReceiptNumber(req, res) {
  try {
    const nextReceiptNo = await computeNextReceiptNo(pool);
    return res.status(200).json({
      success: true,
      data: {
        next_receipt_no: nextReceiptNo
      }
    });
  } catch (error) {
    console.error('Error computing next receipt number:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to compute next receipt number' }
    });
  }
}

/**
 * @desc Create single collection
 * @route POST /api/collections
 * @access Private (Admin, Staff)
 */
export async function createCollection(req, res) {
  const client = await pool.connect();
  try {
    const item = req.body;

    await client.query('BEGIN');

    // 1. Acquire transaction-level advisory lock specifically for collection receipt sequencing.
    // Serializes concurrent submissions so the first to record gets the number,
    // and subsequent concurrent submissions automatically advance to the next sequential number.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('collection_receipt_number_lock'))");

    let finalOrNo = item.or_no ? String(item.or_no).replace(/^INV#\s*/i, '').trim() : '';

    const isAutoRequested = !finalOrNo || finalOrNo.toUpperCase() === 'AUTO';

    if (isAutoRequested) {
      finalOrNo = await computeNextReceiptNo(client);
    } else {
      // Check if provided receipt number already exists in the database
      const existingCheck = await client.query(
        'SELECT id, or_no, payor_name FROM collections WHERE or_no = $1 LIMIT 1',
        [finalOrNo]
      );

      if (existingCheck.rowCount > 0) {
        // If it's a numeric receipt number, it collided because another user concurrently
        // recorded that number first! Automatically advance to the next available number!
        if (/^\d+$/.test(finalOrNo)) {
          finalOrNo = await computeNextReceiptNo(client);
        } else {
          await client.query('ROLLBACK');
          return res.status(409).json({
            success: false,
            error: { message: `Receipt number "${finalOrNo}" already exists in the system.` }
          });
        }
      }
    }

    const id = item.id || `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const tab = item.tab || 'credit';
    const date = item.date || new Date().toISOString().split('T')[0];
    const payor_name = item.payor_name ? item.payor_name.trim() : '';
    const member_id = item.member_id ? item.member_id.trim() : null;
    const loans = item.loans ? JSON.stringify(item.loans) : '[]';
    const loan_account = item.loan_account || null;
    const principal_amount = item.principal_amount || 0;
    const interest_account = item.interest_account || null;
    const interest_amount = item.interest_amount || 0;
    const fines_account = item.fines_account || null;
    const fines_amount = item.fines_amount || 0;
    const common_share_amount = item.common_share_amount || 0;
    const item_name = item.item_name || null;
    const item_category = item.item_category || null;
    const quantity = item.quantity || 1;
    const unit_price = item.unit_price || 0;
    const service_type = item.service_type || null;
    const service_copies = item.service_copies || 1;
    const service_rate = item.service_rate || 0;
    const particulars = item.particulars || null;
    const other_category = item.other_category || null;
    const amount = item.amount || 0;
    const payment_method = item.payment_method || 'Cash';
    const reference_no = item.reference_no || null;
    const bank_name = item.bank_name || null;
    const status = item.status || 'completed';
    const remarks = item.remarks || null;
    const collected_by = item.collected_by || 'CHINNETTE A. LAMOSTE';

    const insertQuery = `
      INSERT INTO collections (
        id, tab, date, or_no, payor_name, member_id,
        loans, loan_account, principal_amount, interest_account, interest_amount,
        fines_account, fines_amount, common_share_amount,
        item_name, item_category, quantity, unit_price,
        service_type, service_copies, service_rate,
        particulars, other_category,
        amount, payment_method, reference_no, bank_name, status, remarks, collected_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7::jsonb, $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23,
        $24, $25, $26, $27, $28, $29, $30
      )
      RETURNING *;
    `;

    const values = [
      id, tab, date, finalOrNo, payor_name, member_id,
      loans, loan_account, principal_amount, interest_account, interest_amount,
      fines_account, fines_amount, common_share_amount,
      item_name, item_category, quantity, unit_price,
      service_type, service_copies, service_rate,
      particulars, other_category,
      amount, payment_method, reference_no, bank_name, status, remarks, collected_by
    ];

    const result = await client.query(insertQuery, values);
    await client.query('COMMIT');

    const createdItem = formatCollectionRow(result.rows[0]);

    return res.status(201).json({
      success: true,
      data: createdItem
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating collection:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to create collection entry' }
    });
  } finally {
    client.release();
  }
}

/**
 * @desc Bulk import or replace collections
 * @route POST /api/collections/bulk
 * @access Private (Admin, Staff)
 */
export async function bulkImportCollections(req, res) {
  const client = await pool.connect();
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No items provided for bulk import' }
      });
    }

    await client.query('BEGIN');

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const processedRows = [];

    const upsertSql = `
      INSERT INTO collections (
        id, tab, date, or_no, payor_name, member_id,
        loans, loan_account, principal_amount, interest_account, interest_amount,
        fines_account, fines_amount, common_share_amount,
        item_name, item_category, quantity, unit_price,
        service_type, service_copies, service_rate,
        particulars, other_category,
        amount, payment_method, reference_no, bank_name, status, remarks, collected_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7::jsonb, $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23,
        $24, $25, $26, $27, $28, $29, $30
      )
      ON CONFLICT (id) DO UPDATE SET
        tab = EXCLUDED.tab,
        date = EXCLUDED.date,
        or_no = EXCLUDED.or_no,
        payor_name = EXCLUDED.payor_name,
        member_id = EXCLUDED.member_id,
        loans = EXCLUDED.loans,
        loan_account = EXCLUDED.loan_account,
        principal_amount = EXCLUDED.principal_amount,
        interest_account = EXCLUDED.interest_account,
        interest_amount = EXCLUDED.interest_amount,
        fines_account = EXCLUDED.fines_account,
        fines_amount = EXCLUDED.fines_amount,
        common_share_amount = EXCLUDED.common_share_amount,
        item_name = EXCLUDED.item_name,
        item_category = EXCLUDED.item_category,
        quantity = EXCLUDED.quantity,
        unit_price = EXCLUDED.unit_price,
        service_type = EXCLUDED.service_type,
        service_copies = EXCLUDED.service_copies,
        service_rate = EXCLUDED.service_rate,
        particulars = EXCLUDED.particulars,
        other_category = EXCLUDED.other_category,
        amount = EXCLUDED.amount,
        payment_method = EXCLUDED.payment_method,
        reference_no = EXCLUDED.reference_no,
        bank_name = EXCLUDED.bank_name,
        status = CASE WHEN collections.status = 'filed' THEN 'filed' ELSE EXCLUDED.status END,
        remarks = EXCLUDED.remarks,
        collected_by = EXCLUDED.collected_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    for (const item of items) {
      const or_no = item.or_no ? item.or_no.trim() : '';
      let targetId = item.id;
      let isExisting = false;

      // 1. Direct match by ID
      if (targetId) {
        const idCheck = await client.query('SELECT id, status FROM collections WHERE id = $1 LIMIT 1', [targetId]);
        if (idCheck.rowCount > 0) {
          isExisting = true;
          if (idCheck.rows[0].status === 'filed') {
            skippedCount++;
            continue;
          }
        }
      }

      // 2. Receipt Number (or_no) match if ID not already matched
      if (!isExisting && or_no) {
        const orCheck = await client.query(
          'SELECT id, status FROM collections WHERE LOWER(TRIM(or_no)) = LOWER(TRIM($1)) LIMIT 1',
          [or_no]
        );
        if (orCheck.rowCount > 0) {
          targetId = orCheck.rows[0].id;
          isExisting = true;
          if (orCheck.rows[0].status === 'filed') {
            skippedCount++;
            continue;
          }
        }
      }

      if (!targetId) {
        targetId = `imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      }

      const tab = item.tab === 'others' ? 'credit' : (item.tab || 'credit');
      const date = item.date || new Date().toISOString().split('T')[0];
      const payor_name = item.payor_name ? item.payor_name.trim() : '';
      const member_id = item.member_id ? item.member_id.trim() : null;
      const loans = item.loans ? JSON.stringify(item.loans) : '[]';
      const loan_account = item.loan_account || null;
      const principal_amount = item.principal_amount || 0;
      const interest_account = item.interest_account || null;
      const interest_amount = item.interest_amount || 0;
      const fines_account = item.fines_account || null;
      const fines_amount = item.fines_amount || 0;
      const common_share_amount = item.common_share_amount || 0;
      const item_name = item.item_name || null;
      const item_category = item.item_category || null;
      const quantity = item.quantity || 1;
      const unit_price = item.unit_price || 0;
      const service_type = item.service_type || null;
      const service_copies = item.service_copies || 1;
      const service_rate = item.service_rate || 0;
      const particulars = item.particulars || null;
      const other_category = item.other_category || null;
      const amount = item.amount || 0;
      const payment_method = item.payment_method || 'Cash';
      const reference_no = item.reference_no || null;
      const bank_name = item.bank_name || null;
      const status = item.status || 'completed';
      const remarks = item.remarks || null;
      const collected_by = item.collected_by || 'CHINNETTE A. LAMOSTE';

      const values = [
        targetId, tab, date, or_no, payor_name, member_id,
        loans, loan_account, principal_amount, interest_account, interest_amount,
        fines_account, fines_amount, common_share_amount,
        item_name, item_category, quantity, unit_price,
        service_type, service_copies, service_rate,
        particulars, other_category,
        amount, payment_method, reference_no, bank_name, status, remarks, collected_by
      ];

      const resRow = await client.query(upsertSql, values);
      processedRows.push(formatCollectionRow(resRow.rows[0]));

      if (isExisting) {
        updatedCount++;
      } else {
        insertedCount++;
      }
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      count: processedRows.length,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      data: processedRows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during bulk import of collections:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to import collection records' }
    });
  } finally {
    client.release();
  }
}

/**
 * @desc Update single collection (Edit & Seal/File)
 * @route PUT /api/collections/:id
 * @access Private (Admin)
 */
export async function updateCollection(req, res) {
  try {
    const { id } = req.params;
    const item = req.body;

    // Check existing
    const existingRes = await pool.query('SELECT * FROM collections WHERE id = $1', [id]);
    if (existingRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Collection entry not found' }
      });
    }

    const existing = existingRes.rows[0];

    const tab = item.tab || existing.tab;
    const date = item.date || existing.date;
    const or_no = item.or_no ? item.or_no.trim() : existing.or_no;
    const payor_name = item.payor_name ? item.payor_name.trim() : existing.payor_name;
    const member_id = item.member_id !== undefined ? (item.member_id ? item.member_id.trim() : null) : existing.member_id;
    const loans = item.loans !== undefined ? JSON.stringify(item.loans) : (existing.loans ? JSON.stringify(existing.loans) : '[]');
    const loan_account = item.loan_account !== undefined ? item.loan_account : existing.loan_account;
    const principal_amount = item.principal_amount !== undefined ? item.principal_amount : existing.principal_amount;
    const interest_account = item.interest_account !== undefined ? item.interest_account : existing.interest_account;
    const interest_amount = item.interest_amount !== undefined ? item.interest_amount : existing.interest_amount;
    const fines_account = item.fines_account !== undefined ? item.fines_account : existing.fines_account;
    const fines_amount = item.fines_amount !== undefined ? item.fines_amount : existing.fines_amount;
    const common_share_amount = item.common_share_amount !== undefined ? item.common_share_amount : existing.common_share_amount;
    const item_name = item.item_name !== undefined ? item.item_name : existing.item_name;
    const item_category = item.item_category !== undefined ? item.item_category : existing.item_category;
    const quantity = item.quantity !== undefined ? item.quantity : existing.quantity;
    const unit_price = item.unit_price !== undefined ? item.unit_price : existing.unit_price;
    const service_type = item.service_type !== undefined ? item.service_type : existing.service_type;
    const service_copies = item.service_copies !== undefined ? item.service_copies : existing.service_copies;
    const service_rate = item.service_rate !== undefined ? item.service_rate : existing.service_rate;
    const particulars = item.particulars !== undefined ? item.particulars : existing.particulars;
    const other_category = item.other_category !== undefined ? item.other_category : existing.other_category;
    const amount = item.amount !== undefined ? item.amount : existing.amount;
    const payment_method = item.payment_method || existing.payment_method;
    const reference_no = item.reference_no !== undefined ? item.reference_no : existing.reference_no;
    const bank_name = item.bank_name !== undefined ? item.bank_name : existing.bank_name;
    const status = item.status || existing.status;
    const remarks = item.remarks !== undefined ? item.remarks : existing.remarks;
    const collected_by = item.collected_by || existing.collected_by;

    const updateQuery = `
      UPDATE collections SET
        tab = $1, date = $2, or_no = $3, payor_name = $4, member_id = $5,
        loans = $6::jsonb, loan_account = $7, principal_amount = $8, interest_account = $9, interest_amount = $10,
        fines_account = $11, fines_amount = $12, common_share_amount = $13,
        item_name = $14, item_category = $15, quantity = $16, unit_price = $17,
        service_type = $18, service_copies = $19, service_rate = $20,
        particulars = $21, other_category = $22,
        amount = $23, payment_method = $24, reference_no = $25, bank_name = $26,
        status = $27, remarks = $28, collected_by = $29, updated_at = CURRENT_TIMESTAMP
      WHERE id = $30
      RETURNING *;
    `;

    const values = [
      tab, date, or_no, payor_name, member_id,
      loans, loan_account, principal_amount, interest_account, interest_amount,
      fines_account, fines_amount, common_share_amount,
      item_name, item_category, quantity, unit_price,
      service_type, service_copies, service_rate,
      particulars, other_category,
      amount, payment_method, reference_no, bank_name,
      status, remarks, collected_by,
      id
    ];

    const result = await pool.query(updateQuery, values);
    const updated = formatCollectionRow(result.rows[0]);

    return res.status(200).json({
      success: true,
      data: updated,
      message: status === 'filed' ? 'Collection entry sealed and filed successfully' : 'Collection entry updated successfully'
    });
  } catch (error) {
    console.error('Error updating collection:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to update collection entry' }
    });
  }
}

/**
 * @desc Delete single collection
 * @route DELETE /api/collections/:id
 * @access Private (Admin, Staff)
 */
export async function deleteCollection(req, res) {
  try {
    const { id } = req.params;

    // Check if status is filed
    const check = await pool.query('SELECT status FROM collections WHERE id = $1', [id]);
    if (check.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Collection entry not found' }
      });
    }

    if (check.rows[0].status === 'filed') {
      return res.status(403).json({
        success: false,
        error: { message: 'This collection entry is Sealed & Filed and cannot be deleted.' }
      });
    }

    await pool.query('DELETE FROM collections WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: 'Collection entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting collection:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to delete collection' }
    });
  }
}

/**
 * @desc Bulk delete collections
 * @route POST /api/collections/bulk-delete
 * @access Private (Admin, Staff)
 */
export async function bulkDeleteCollections(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No IDs provided for bulk deletion' }
      });
    }

    const result = await pool.query(
      "DELETE FROM collections WHERE id = ANY($1::text[]) AND status != 'filed' RETURNING id",
      [ids]
    );

    return res.status(200).json({
      success: true,
      deletedCount: result.rowCount,
      message: `${result.rowCount} collection entries deleted successfully`
    });
  } catch (error) {
    console.error('Error bulk deleting collections:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to bulk delete collections' }
    });
  }
}
