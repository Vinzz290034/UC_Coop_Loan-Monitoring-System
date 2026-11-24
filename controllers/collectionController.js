import pool from '../config/db.js';

let particularsColEnsured = false;
async function ensureParticularsColumn(db) {
  if (particularsColEnsured) return;
  await db.query(`ALTER TABLE collections ADD COLUMN IF NOT EXISTS particulars_amount NUMERIC(15, 2) DEFAULT 0;`);
  await db.query(`ALTER TABLE collections ADD COLUMN IF NOT EXISTS deposit_confirmed BOOLEAN NOT NULL DEFAULT FALSE;`);
  await db.query(`ALTER TABLE collections ADD COLUMN IF NOT EXISTS pre_deposit_status VARCHAR(50);`);
  await db.query(`
    -- Automatically correct all collection receipts with year < 2026 to 2026 (preserving month and day)
    UPDATE collections
    SET date = (date::DATE + ((2026 - EXTRACT(YEAR FROM date::DATE))::INT || ' years')::INTERVAL)::DATE
    WHERE EXTRACT(YEAR FROM date::DATE) < 2026;

    UPDATE collections
    SET
      common_share_amount = CASE
        WHEN COALESCE(common_share_amount, 0) > 0 THEN common_share_amount
        ELSE COALESCE(NULLIF(principal_amount, 0), amount, 0)
      END,
      amount = CASE
        WHEN COALESCE(common_share_amount, 0) > 0 AND COALESCE(principal_amount, 0) > 0 AND amount >= (COALESCE(common_share_amount, 0) + COALESCE(principal_amount, 0))
        THEN amount - COALESCE(principal_amount, 0)
        ELSE amount
      END,
      principal_amount = 0,
      loan_account = NULL,
      loans = '[]'::jsonb,
      particulars = 'Common Share'
    WHERE tab = 'credit'
      AND (
        LOWER(COALESCE(loan_account, '')) LIKE '%shared capital%'
        OR LOWER(COALESCE(loan_account, '')) LIKE '%share capital%'
        OR LOWER(COALESCE(loan_account, '')) LIKE '%fixed deposit%'
        OR LOWER(COALESCE(loan_account, '')) LIKE '%common share%'
      );

    -- Reclassify pure Membership Fee / Membership Application Fee collections from Sales & Services into Credit
    UPDATE collections
    SET
      tab = 'credit',
      membership_fee = CASE
        WHEN COALESCE(membership_fee, 0) > 0 THEN membership_fee
        ELSE COALESCE(NULLIF(amount, 0), 200)
      END,
      particulars = 'Membership Fee',
      items = '[]'::jsonb,
      item_name = NULL,
      item_category = NULL,
      quantity = NULL,
      unit_price = NULL,
      service_type = NULL,
      service_copies = NULL,
      service_rate = NULL
    WHERE LOWER(TRIM(COALESCE(tab, ''))) IN ('sales', 'services', 'sales_services')
      AND (
        LOWER(COALESCE(item_name, '')) LIKE '%membership%'
        OR LOWER(COALESCE(service_type, '')) LIKE '%membership%'
        OR LOWER(COALESCE(particulars, '')) LIKE '%membership%'
        OR LOWER(COALESCE(items::text, '')) LIKE '%membership%'
      )
      AND (
        items IS NULL
        OR jsonb_typeof(items) != 'array'
        OR jsonb_array_length(items) = 0
        OR NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(items) AS elem
          WHERE LOWER(COALESCE(elem->>'item', elem->>'item_name', '')) NOT LIKE '%membership%'
        )
      );

    -- For mixed Sales & Services receipts that also contain a Membership Fee line item,
    -- move the Membership Fee amount into membership_fee and remove it from Merchandise/Service items
    UPDATE collections c
    SET
      membership_fee = COALESCE(c.membership_fee, 0) + COALESCE((
        SELECT SUM(COALESCE(NULLIF(elem->>'revenue', '')::numeric, (COALESCE(NULLIF(elem->>'quantity', '')::numeric, 1) * COALESCE(NULLIF(elem->>'selling_price', '')::numeric, 0)), 0))
        FROM jsonb_array_elements(c.items) AS elem
        WHERE LOWER(COALESCE(elem->>'item', elem->>'item_name', '')) LIKE '%membership%'
      ), 0),
      items = COALESCE((
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(c.items) AS elem
        WHERE LOWER(COALESCE(elem->>'item', elem->>'item_name', '')) NOT LIKE '%membership%'
      ), '[]'::jsonb)
    WHERE LOWER(TRIM(COALESCE(c.tab, ''))) IN ('sales', 'services', 'sales_services')
      AND jsonb_typeof(c.items) = 'array'
      AND jsonb_array_length(c.items) > 0
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(c.items) AS elem
        WHERE LOWER(COALESCE(elem->>'item', elem->>'item_name', '')) LIKE '%membership%'
      )
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(c.items) AS elem
        WHERE LOWER(COALESCE(elem->>'item', elem->>'item_name', '')) NOT LIKE '%membership%'
      );

    -- All Sales & Services from January to October 2026 -> Cash in MBTC
    UPDATE collections
    SET status = 'Cash in MBTC'
    WHERE LOWER(TRIM(COALESCE(tab, ''))) IN ('sales', 'services', 'sales_services')
      AND (
        (date::DATE >= '2026-01-01'::DATE AND date::DATE < '2026-11-01'::DATE)
        OR (EXTRACT(YEAR FROM date) = 2026 AND EXTRACT(MONTH FROM date) <= 10)
      );

    -- All Credit from January to October 2026 -> Cash in BDO
    UPDATE collections
    SET status = 'Cash in BDO'
    WHERE LOWER(TRIM(COALESCE(tab, ''))) IN ('credit', 'billing')
      AND (
        (date::DATE >= '2026-01-01'::DATE AND date::DATE < '2026-11-01'::DATE)
        OR (EXTRACT(YEAR FROM date) = 2026 AND EXTRACT(MONTH FROM date) <= 10)
      );
  `);
  particularsColEnsured = true;
}

/**
 * Determine default custody status based on date and category
 * January - October 2026: Sales & Services -> Cash in MBTC, Credit -> Cash in BDO
 * November 2026 (active): Cash in vault
 */
function getDefaultCustodyStatus(date, tab, requestedStatus) {
  if (requestedStatus && (requestedStatus.toLowerCase().includes('mbtc') || requestedStatus.toLowerCase().includes('bdo'))) {
    return requestedStatus.toLowerCase().includes('mbtc') ? 'Cash in MBTC' : 'Cash in BDO';
  }
  let isJanToOct = false;
  if (date) {
    let d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime()) && typeof date === 'string' && date.includes('/')) {
      const parts = date.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
      }
    }
    if (!isNaN(d.getTime())) {
      let y = d.getFullYear();
      if (y < 2026) y = 2026;
      const m = d.getMonth(); // 0 = Jan, 9 = Oct, 10 = Nov
      if (y === 2026 && m <= 9) {
        isJanToOct = true;
      }
    }
  }
  if (isJanToOct) {
    const tLower = String(tab || '').toLowerCase().trim();
    if (tLower === 'sales' || tLower === 'services' || tLower === 'sales_services') {
      return 'Cash in MBTC';
    }
    if (tLower === 'credit' || tLower === 'billing') {
      return 'Cash in BDO';
    }
  }
  return 'Cash in vault';
}

/**
 * Format collection row from PostgreSQL into CollectionItem shape
 */
function formatCollectionRow(row) {
  // Format date to YYYY-MM-DD (using Asia/Manila so UTC midnight/offset never shifts the day backward)
  let dateStr = row.date;
  if (dateStr instanceof Date) {
    const manilaDate = dateStr.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const [rawY, rawM, rawD] = manilaDate.split('-');
    let y = Number(rawY);
    if (y < 2026) y = 2026;
    dateStr = `${y}-${rawM}-${rawD}`;
  } else if (typeof dateStr === 'string') {
    if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }
    const match = dateStr.match(/^(\d{4})-(.*)$/);
    if (match && Number(match[1]) < 2026) {
      dateStr = `2026-${match[2]}`;
    }
  }
  return {
    id: row.id,
    tab: row.tab,
    date: dateStr,
    or_no: row.or_no ? String(row.or_no).replace(/^INV#\s*/i, '').trim() : '',
    payor_name: row.payor_name,
    member_id: row.member_id || undefined,
    items: Array.isArray(row.items) ? row.items : (typeof row.items === 'string' ? JSON.parse(row.items) : undefined),
    loans: Array.isArray(row.loans) ? row.loans : (typeof row.loans === 'string' ? JSON.parse(row.loans) : undefined),
    loan_account: row.loan_account || undefined,
    principal_amount: row.principal_amount !== null && row.principal_amount !== undefined ? parseFloat(row.principal_amount) : undefined,
    interest_account: row.interest_account || undefined,
    interest_amount: row.interest_amount !== null && row.interest_amount !== undefined ? parseFloat(row.interest_amount) : undefined,
    fines_account: row.fines_account || undefined,
    fines_amount: row.fines_amount !== null && row.fines_amount !== undefined ? parseFloat(row.fines_amount) : undefined,
    common_share_amount: row.common_share_amount !== null && row.common_share_amount !== undefined ? parseFloat(row.common_share_amount) : undefined,
    membership_fee: row.membership_fee !== null && row.membership_fee !== undefined ? parseFloat(row.membership_fee) : undefined,
    billing_amount: row.billing_amount !== null && row.billing_amount !== undefined ? parseFloat(row.billing_amount) : undefined,
    particulars_amount: row.particulars_amount !== null && row.particulars_amount !== undefined ? parseFloat(row.particulars_amount) : undefined,
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
    payment_method: (() => {
      const pm = String(row.payment_method || 'Hand in').trim();
      const pmLower = pm.toLowerCase();
      if (pmLower === 'cash') return 'Hand in';
      if (pmLower === 'salary deduction') return 'salary deduction';
      if (pmLower === 'gcash') return 'Gcash';
      if (pmLower === 'bank transfer') return 'Bank transfer';
      if (pmLower === 'cheque' || pmLower === 'check') return 'cheque';
      return pm;
    })(),
    reference_no: row.reference_no || undefined,
    bank_name: row.bank_name || undefined,
    status: (() => {
      const sLower = String(row.status || '').trim().toLowerCase();
      if (sLower.includes('mbtc') || sLower.includes('metrobank')) return 'Cash in MBTC';
      if (sLower.includes('bdo')) return 'Cash in BDO';
      if (sLower.includes('vault')) return 'Cash in vault';

      // Only apply Jan-Oct default when no explicit custody status is stored
      let isJanToOct = false;
      const chkDate = dateStr || row.date;
      if (chkDate) {
        let d = chkDate instanceof Date ? chkDate : new Date(chkDate);
        if (isNaN(d.getTime()) && typeof chkDate === 'string' && chkDate.includes('/')) {
          const parts = chkDate.split('/');
          if (parts.length === 3 && parts[2].length === 4) {
            d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
          }
        }
        if (!isNaN(d.getTime())) {
          let y = d.getFullYear();
          if (y < 2026) y = 2026;
          const m = d.getMonth(); // 0 = Jan, 9 = Oct, 10 = Nov
          if (y === 2026 && m <= 9) {
            isJanToOct = true;
          }
        }
      }

      if (isJanToOct) {
        const tLower = String(row.tab || '').toLowerCase().trim();
        if (tLower === 'sales' || tLower === 'services' || tLower === 'sales_services') {
          return 'Cash in MBTC';
        }
        if (tLower === 'credit' || tLower === 'billing') {
          return 'Cash in BDO';
        }
      }

      return 'Cash in vault';
    })(),
    deposit_confirmed: Boolean(row.deposit_confirmed),
    remarks: (() => {
      const rLower = String(row.remarks || '').toLowerCase();
      const sLower = String(row.status || '').toLowerCase();
      if (rLower === 'sealed' || rLower === 'filed' || sLower === 'filed') return 'sealed';
      return 'edit';
    })(),
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
    await ensureParticularsColumn(pool);
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

    query += ` ORDER BY NULLIF(regexp_replace(or_no, '[^0-9]', '', 'g'), '')::bigint DESC NULLS LAST, or_no DESC, date DESC, created_at DESC`;

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
    await ensureParticularsColumn(client);

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
    let rawDate = item.date || new Date().toISOString().split('T')[0];
    if (typeof rawDate === 'string') {
      const match = rawDate.match(/^(\d{4})-(.*)$/);
      if (match && Number(match[1]) < 2026) {
        rawDate = `2026-${match[2]}`;
      }
    }
    const date = rawDate;
    const payor_name = item.payor_name ? item.payor_name.trim() : '';
    const member_id = item.member_id ? item.member_id.trim() : null;
    const loans = item.loans ? JSON.stringify(item.loans) : '[]';
    const items = item.items ? JSON.stringify(item.items) : '[]';
    const loan_account = item.loan_account || null;
    const principal_amount = item.principal_amount || 0;
    const interest_account = item.interest_account || null;
    const interest_amount = item.interest_amount || 0;
    const fines_account = item.fines_account || null;
    const fines_amount = item.fines_amount || 0;
    const common_share_amount = item.common_share_amount || 0;
    const membership_fee = item.membership_fee || 0;
    const billing_amount = item.billing_amount || 0;
    const particulars_amount = item.particulars_amount || 0;
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
    const payment_method = item.payment_method || 'Hand in';
    const reference_no = item.reference_no || null;
    const bank_name = item.bank_name || null;
    const status = (item.status && item.status !== 'Cash in vault')
      ? item.status
      : getDefaultCustodyStatus(date, tab, item.status);
    const remarks = item.remarks || 'edit';
    const collected_by = item.collected_by || 'CHINNETTE A. LAMOSTE';

    const insertQuery = `
      INSERT INTO collections (
        id, tab, date, or_no, payor_name, member_id,
        loans, items, loan_account, principal_amount, interest_account, interest_amount,
        fines_account, fines_amount, common_share_amount, membership_fee, billing_amount, particulars_amount,
        item_name, item_category, quantity, unit_price,
        service_type, service_copies, service_rate,
        particulars, other_category,
        amount, payment_method, reference_no, bank_name, status, remarks, collected_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7::jsonb, $8::jsonb, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25,
        $26, $27,
        $28, $29, $30, $31, $32, $33, $34
      )
      RETURNING *;
    `;

    const values = [
      id, tab, date, finalOrNo, payor_name, member_id,
      loans, items, loan_account, principal_amount, interest_account, interest_amount,
      fines_account, fines_amount, common_share_amount, membership_fee, billing_amount, particulars_amount,
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
    await ensureParticularsColumn(client);

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const processedRows = [];

    const upsertSql = `
      INSERT INTO collections (
        id, tab, date, or_no, payor_name, member_id,
        loans, items, loan_account, principal_amount, interest_account, interest_amount,
        fines_account, fines_amount, common_share_amount, membership_fee, billing_amount, particulars_amount,
        item_name, item_category, quantity, unit_price,
        service_type, service_copies, service_rate,
        particulars, other_category,
        amount, payment_method, reference_no, bank_name, status, remarks, collected_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7::jsonb, $8::jsonb, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25,
        $26, $27,
        $28, $29, $30, $31, $32, $33, $34
      )
      ON CONFLICT (id) DO UPDATE SET
        tab = EXCLUDED.tab,
        date = EXCLUDED.date,
        or_no = EXCLUDED.or_no,
        payor_name = EXCLUDED.payor_name,
        member_id = EXCLUDED.member_id,
        loans = EXCLUDED.loans,
        items = EXCLUDED.items,
        loan_account = EXCLUDED.loan_account,
        principal_amount = EXCLUDED.principal_amount,
        interest_account = EXCLUDED.interest_account,
        interest_amount = EXCLUDED.interest_amount,
        fines_account = EXCLUDED.fines_account,
        fines_amount = EXCLUDED.fines_amount,
        common_share_amount = EXCLUDED.common_share_amount,
        membership_fee = EXCLUDED.membership_fee,
        billing_amount = EXCLUDED.billing_amount,
        particulars_amount = EXCLUDED.particulars_amount,
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

      // 2. Receipt Number (or_no) + Payor match if ID not already matched (skip generic placeholders like 'SD' or '-')
      const isGenericOrNo = !or_no || /^(sd|cd|cash|check|gcash|bank|payroll|deduction|n\/a|na|none|-+)$/i.test(or_no);
      if (!isExisting && !isGenericOrNo) {
        const payorForMatch = item.payor_name ? item.payor_name.trim() : '';
        const orCheck = await client.query(
          `SELECT id, status FROM collections
           WHERE LOWER(TRIM(or_no)) = LOWER(TRIM($1))
             AND LOWER(TRIM(COALESCE(payor_name, ''))) = LOWER(TRIM($2))
           LIMIT 1`,
          [or_no, payorForMatch]
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
      let rawDate = item.date || new Date().toISOString().split('T')[0];
      if (typeof rawDate === 'string') {
        const match = rawDate.match(/^(\d{4})-(.*)$/);
        if (match && Number(match[1]) < 2026) {
          rawDate = `2026-${match[2]}`;
        }
      }
      const date = rawDate;
      const payor_name = item.payor_name ? item.payor_name.trim() : '';
      const member_id = item.member_id ? item.member_id.trim() : null;
      const loans = item.loans ? JSON.stringify(item.loans) : '[]';
      const items = item.items ? JSON.stringify(item.items) : '[]';
      const loan_account = item.loan_account || null;
      const principal_amount = item.principal_amount || 0;
      const interest_account = item.interest_account || null;
      const interest_amount = item.interest_amount || 0;
      const fines_account = item.fines_account || null;
      const fines_amount = item.fines_amount || 0;
      const common_share_amount = item.common_share_amount || 0;
      const membership_fee = item.membership_fee || 0;
      const billing_amount = item.billing_amount || 0;
      const particulars_amount = item.particulars_amount || 0;
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
      const payment_method = item.payment_method || 'Hand in';
      const reference_no = item.reference_no || null;
      const bank_name = item.bank_name || null;
      const status = (item.status && item.status !== 'Cash in vault')
      ? item.status
      : getDefaultCustodyStatus(date, tab, item.status);
      const remarks = item.remarks || 'edit';
      const collected_by = item.collected_by || 'CHINNETTE A. LAMOSTE';

      const values = [
        targetId, tab, date, or_no, payor_name, member_id,
        loans, items, loan_account, principal_amount, interest_account, interest_amount,
        fines_account, fines_amount, common_share_amount, membership_fee, billing_amount, particulars_amount,
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
    await ensureParticularsColumn(pool);

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
    let rawDate = item.date || existing.date;
    if (typeof rawDate === 'string') {
      const match = rawDate.match(/^(\d{4})-(.*)$/);
      if (match && Number(match[1]) < 2026) {
        rawDate = `2026-${match[2]}`;
      }
    } else if (rawDate instanceof Date && rawDate.getFullYear() < 2026) {
      const m = String(rawDate.getMonth() + 1).padStart(2, '0');
      const d = String(rawDate.getDate()).padStart(2, '0');
      rawDate = `2026-${m}-${d}`;
    }
    const date = rawDate;
    const or_no = item.or_no ? item.or_no.trim() : existing.or_no;
    const payor_name = item.payor_name ? item.payor_name.trim() : existing.payor_name;
    const member_id = item.member_id !== undefined ? (item.member_id ? item.member_id.trim() : null) : existing.member_id;
    const isCredit = tab === 'credit';
    const loans = item.loans !== undefined
      ? JSON.stringify(item.loans || [])
      : (isCredit ? '[]' : (existing.loans ? JSON.stringify(existing.loans) : '[]'));
    const items = item.items !== undefined
      ? JSON.stringify(item.items || [])
      : (!isCredit ? '[]' : (existing.items ? JSON.stringify(existing.items) : '[]'));
    const hasSavedLoans = Array.isArray(item.loans) && item.loans.length > 0;
    const loan_account = isCredit
      ? (hasSavedLoans ? (item.loans[0]?.loan_account || item.loan_account || null) : (item.principal_amount > 0 ? (item.loan_account || null) : null))
      : (item.loan_account !== undefined ? item.loan_account : existing.loan_account);
    const principal_amount = isCredit
      ? (parseFloat(item.principal_amount) || 0)
      : (item.principal_amount !== undefined ? item.principal_amount : existing.principal_amount);
    const interest_account = isCredit
      ? (hasSavedLoans ? (item.loans[0]?.interest_account || item.interest_account || null) : (item.interest_amount > 0 ? (item.interest_account || null) : null))
      : (item.interest_account !== undefined ? item.interest_account : existing.interest_account);
    const interest_amount = isCredit
      ? (parseFloat(item.interest_amount) || 0)
      : (item.interest_amount !== undefined ? item.interest_amount : existing.interest_amount);
    const fines_account = isCredit
      ? (hasSavedLoans ? (item.loans[0]?.fines_account || item.fines_account || null) : (item.fines_amount > 0 ? (item.fines_account || null) : null))
      : (item.fines_account !== undefined ? item.fines_account : existing.fines_account);
    const fines_amount = isCredit
      ? (parseFloat(item.fines_amount) || 0)
      : (item.fines_amount !== undefined ? item.fines_amount : existing.fines_amount);
    const common_share_amount = isCredit
      ? (parseFloat(item.common_share_amount) || 0)
      : (item.common_share_amount !== undefined ? item.common_share_amount : existing.common_share_amount);
    const membership_fee = isCredit
      ? (parseFloat(item.membership_fee) || 0)
      : (item.membership_fee !== undefined ? item.membership_fee : existing.membership_fee);
    const billing_amount = isCredit
      ? (parseFloat(item.billing_amount) || 0)
      : (item.billing_amount !== undefined ? item.billing_amount : existing.billing_amount);
    const particulars_amount = isCredit
      ? (parseFloat(item.particulars_amount) || 0)
      : (item.particulars_amount !== undefined ? (item.particulars_amount || 0) : (existing.particulars_amount || 0));
    const item_name = item.item_name !== undefined ? item.item_name : existing.item_name;
    const item_category = item.item_category !== undefined ? item.item_category : existing.item_category;
    const quantity = item.quantity !== undefined ? item.quantity : existing.quantity;
    const unit_price = item.unit_price !== undefined ? item.unit_price : existing.unit_price;
    const service_type = item.service_type !== undefined ? item.service_type : existing.service_type;
    const service_copies = item.service_copies !== undefined ? item.service_copies : existing.service_copies;
    const service_rate = item.service_rate !== undefined ? item.service_rate : existing.service_rate;
    const particulars = item.particulars !== undefined ? item.particulars : existing.particulars;
    const other_category = item.other_category !== undefined ? (item.other_category || null) : existing.other_category;
    const amount = item.amount !== undefined ? item.amount : existing.amount;
    const payment_method = item.payment_method || existing.payment_method;
    const reference_no = item.reference_no !== undefined ? item.reference_no : existing.reference_no;
    const bank_name = item.bank_name !== undefined ? item.bank_name : existing.bank_name;
    if (
      item.deposit_confirmed !== undefined &&
      Boolean(item.deposit_confirmed) !== Boolean(existing.deposit_confirmed) &&
      req.user?.role !== 'admin'
    ) {
      return res.status(403).json({
        error: { message: 'Only admin accounts can confirm or undo deposit confirmations' }
      });
    }
    const deposit_confirmed = item.deposit_confirmed !== undefined
      ? Boolean(item.deposit_confirmed)
      : (/vault/i.test(String(item.status || existing.status || '')) ? false : Boolean(existing.deposit_confirmed));
    let status = item.status || existing.status;
    let pre_deposit_status = existing.pre_deposit_status || null;
    if (item.deposit_confirmed === true) {
      pre_deposit_status = existing.pre_deposit_status || existing.status;
    } else if (item.deposit_confirmed === false) {
      if (existing.pre_deposit_status) {
        status = existing.pre_deposit_status;
      }
      pre_deposit_status = null;
    }
    const remarks = item.remarks !== undefined ? item.remarks : existing.remarks;
    const collected_by = item.collected_by || existing.collected_by;

    const updateQuery = `
      UPDATE collections SET
        tab = $1, date = $2, or_no = $3, payor_name = $4, member_id = $5,
        loans = $6::jsonb, items = $7::jsonb, loan_account = $8, principal_amount = $9, interest_account = $10, interest_amount = $11,
        fines_account = $12, fines_amount = $13, common_share_amount = $14, membership_fee = $15, billing_amount = $16, particulars_amount = $17,
        item_name = $18, item_category = $19, quantity = $20, unit_price = $21,
        service_type = $22, service_copies = $23, service_rate = $24,
        particulars = $25, other_category = $26,
        amount = $27, payment_method = $28, reference_no = $29, bank_name = $30,
        status = $31, deposit_confirmed = $32, pre_deposit_status = $33, remarks = $34, collected_by = $35, updated_at = CURRENT_TIMESTAMP
      WHERE id = $36
      RETURNING *;
    `;

    const values = [
      tab, date, or_no, payor_name, member_id,
      loans, items, loan_account, principal_amount, interest_account, interest_amount,
      fines_account, fines_amount, common_share_amount, membership_fee, billing_amount, particulars_amount,
      item_name, item_category, quantity, unit_price,
      service_type, service_copies, service_rate,
      particulars, other_category,
      amount, payment_method, reference_no, bank_name,
      status, deposit_confirmed, pre_deposit_status, remarks, collected_by,
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

    // Check if status is filed or remarks is sealed
    const check = await pool.query('SELECT status, remarks FROM collections WHERE id = $1', [id]);
    if (check.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Collection entry not found' }
      });
    }

    const row = check.rows[0];
    const isFiled = row.status === 'filed' || String(row.remarks || '').toLowerCase() === 'sealed';
    const isOverride = req.query.override === 'true' || req.body?.override === true || req.user?.role === 'admin';
    if (isFiled && !isOverride) {
      return res.status(403).json({
        success: false,
        error: { message: 'This collection entry is Sealed & Filed and cannot be deleted without Admin Override.' }
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
    const { ids, override } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No IDs provided for bulk deletion' }
      });
    }

    const allowFiled = override === true || req.user?.role === 'admin';
    const result = await pool.query(
      allowFiled
        ? "DELETE FROM collections WHERE id = ANY($1::text[]) RETURNING id"
        : "DELETE FROM collections WHERE id = ANY($1::text[]) AND status != 'filed' AND LOWER(COALESCE(remarks, '')) != 'sealed' RETURNING id",
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

const ensureVaultDepositsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collection_vault_deposits (
      period_key VARCHAR(32) PRIMARY KEY,
      mbtc_from_vault NUMERIC(15, 2) NOT NULL DEFAULT 0,
      bdo_from_vault NUMERIC(15, 2) NOT NULL DEFAULT 0,
      mbtc_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      bdo_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      updated_by VARCHAR(255),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    ALTER TABLE collection_vault_deposits
    ADD COLUMN IF NOT EXISTS mbtc_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS bdo_confirmed BOOLEAN NOT NULL DEFAULT FALSE
  `);
};

// @desc    Get confirmed Cash-in-Vault deposits into MBTC / BDO per period
// @route   GET /api/collections/vault-deposits
// @access  Protected (Admin, Staff)
export async function getVaultDeposits(_req, res) {
  try {
    await ensureVaultDepositsTable();
    const result = await pool.query(
      'SELECT period_key, mbtc_from_vault, bdo_from_vault, mbtc_confirmed, bdo_confirmed, updated_by, updated_at FROM collection_vault_deposits'
    );
    const map = {};
    for (const row of result.rows) {
      map[row.period_key] = {
        mbtc_from_vault: parseFloat(row.mbtc_from_vault) || 0,
        bdo_from_vault: parseFloat(row.bdo_from_vault) || 0,
        mbtc_confirmed: Boolean(row.mbtc_confirmed),
        bdo_confirmed: Boolean(row.bdo_confirmed),
        updated_by: row.updated_by || null,
        updated_at: row.updated_at || null
      };
    }
    return res.status(200).json({ success: true, data: map });
  } catch (error) {
    console.error('Error fetching vault deposits:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch vault deposit confirmations' }
    });
  }
}

// @desc    Confirm/update Cash-in-Vault deposit status for MBTC or BDO
// @route   PUT /api/collections/vault-deposits
// @access  Protected (Admin, Staff)
export async function upsertVaultDeposit(req, res) {
  try {
    await ensureVaultDepositsTable();
    const periodKey = String(req.body?.period_key || '').trim();
    if (!periodKey) {
      return res.status(400).json({
        success: false,
        error: { message: 'period_key is required' }
      });
    }
    const existingRes = await pool.query(
      'SELECT mbtc_from_vault, bdo_from_vault, mbtc_confirmed, bdo_confirmed FROM collection_vault_deposits WHERE period_key = $1',
      [periodKey]
    );
    const existing = existingRes.rows[0] || {
      mbtc_from_vault: 0,
      bdo_from_vault: 0,
      mbtc_confirmed: false,
      bdo_confirmed: false
    };
    const mbtc = req.body.mbtc_from_vault !== undefined
      ? Math.max(0, parseFloat(req.body.mbtc_from_vault) || 0)
      : (parseFloat(existing.mbtc_from_vault) || 0);
    const bdo = req.body.bdo_from_vault !== undefined
      ? Math.max(0, parseFloat(req.body.bdo_from_vault) || 0)
      : (parseFloat(existing.bdo_from_vault) || 0);
    const mbtcConfirmed = req.body.mbtc_confirmed !== undefined
      ? Boolean(req.body.mbtc_confirmed)
      : Boolean(existing.mbtc_confirmed);
    const bdoConfirmed = req.body.bdo_confirmed !== undefined
      ? Boolean(req.body.bdo_confirmed)
      : Boolean(existing.bdo_confirmed);
    const updatedBy = req.user?.full_name || req.user?.email || req.user?.role || 'Manager';

    const upsertRes = await pool.query(
      `INSERT INTO collection_vault_deposits (period_key, mbtc_from_vault, bdo_from_vault, mbtc_confirmed, bdo_confirmed, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (period_key)
       DO UPDATE SET
         mbtc_from_vault = EXCLUDED.mbtc_from_vault,
         bdo_from_vault = EXCLUDED.bdo_from_vault,
         mbtc_confirmed = EXCLUDED.mbtc_confirmed,
         bdo_confirmed = EXCLUDED.bdo_confirmed,
         updated_by = EXCLUDED.updated_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING period_key, mbtc_from_vault, bdo_from_vault, mbtc_confirmed, bdo_confirmed, updated_by, updated_at`,
      [periodKey, mbtc, bdo, mbtcConfirmed, bdoConfirmed, updatedBy]
    );
    const row = upsertRes.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        period_key: row.period_key,
        mbtc_from_vault: parseFloat(row.mbtc_from_vault) || 0,
        bdo_from_vault: parseFloat(row.bdo_from_vault) || 0,
        mbtc_confirmed: Boolean(row.mbtc_confirmed),
        bdo_confirmed: Boolean(row.bdo_confirmed),
        updated_by: row.updated_by,
        updated_at: row.updated_at
      }
    });
  } catch (error) {
    console.error('Error saving vault deposit:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to save vault deposit confirmation' }
    });
  }
}

// @desc    Bulk confirm or unconfirm bank deposit for specific collection receipts
// @route   PUT /api/collections/confirm-deposits
// @access  Protected (Admin, Staff)
export async function bulkConfirmDeposits(req, res) {
  try {
    await ensureParticularsColumn(pool);
    const { ids, deposit_confirmed, target_status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No collection IDs provided' }
      });
    }
    const confirmed = Boolean(deposit_confirmed);
    const targetStatus = String(target_status || '').trim();
    const result = await pool.query(
      `UPDATE collections
       SET pre_deposit_status = CASE
             WHEN $1 = true THEN COALESCE(pre_deposit_status, status)
             ELSE NULL
           END,
           status = CASE
             WHEN $1 = true AND LOWER(COALESCE(status, 'Cash in vault')) LIKE '%vault%' AND $3 <> '' THEN $3
             WHEN $1 = false AND pre_deposit_status IS NOT NULL THEN pre_deposit_status
             ELSE status
           END,
           deposit_confirmed = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($2::text[])
       RETURNING id, deposit_confirmed, status`,
      [confirmed, ids, targetStatus]
    );
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error bulk confirming deposits:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to update deposit confirmations' }
    });
  }
}

let billingSheetTableEnsured = false;
async function ensureBillingSheetTable(db) {
  if (billingSheetTableEnsured) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS collection_billing_sheets (
      collection_id TEXT PRIMARY KEY REFERENCES collections(id) ON DELETE CASCADE,
      header JSONB NOT NULL DEFAULT '{}'::jsonb,
      rows JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  billingSheetTableEnsured = true;
}

// @desc    Get manual UC Billing / Collection endorsement sheet for a receipt
// @route   GET /api/collections/:id/billing-sheet
// @access  Protected (Admin, Staff)
export async function getCollectionBillingSheet(req, res) {
  try {
    await ensureBillingSheetTable(pool);
    const { id } = req.params;
    const result = await pool.query(
      `SELECT collection_id, header, rows, updated_at
       FROM collection_billing_sheets
       WHERE collection_id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(200).json({
        success: true,
        data: { collection_id: id, header: {}, rows: [], updated_at: null }
      });
    }
    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching collection billing sheet:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to load billing sheet' }
    });
  }
}

// @desc    Save manual UC Billing / Collection endorsement sheet for a receipt
// @route   PUT /api/collections/:id/billing-sheet
// @access  Protected (Admin, Staff)
export async function saveCollectionBillingSheet(req, res) {
  try {
    await ensureBillingSheetTable(pool);
    const { id } = req.params;
    const { header = {}, rows = [] } = req.body || {};

    const colCheck = await pool.query(`SELECT id FROM collections WHERE id = $1`, [id]);
    if (colCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Collection receipt not found' }
      });
    }

    const result = await pool.query(
      `INSERT INTO collection_billing_sheets (collection_id, header, rows, updated_at)
       VALUES ($1, $2::jsonb, $3::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (collection_id)
       DO UPDATE SET
         header = EXCLUDED.header,
         rows = EXCLUDED.rows,
         updated_at = CURRENT_TIMESTAMP
       RETURNING collection_id, header, rows, updated_at`,
      [id, JSON.stringify(header || {}), JSON.stringify(Array.isArray(rows) ? rows : [])]
    );

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving collection billing sheet:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to save billing sheet' }
    });
  }
}

// @desc    Get summary (row count & sheet total) for all saved UC Billing sheets
// @route   GET /api/collections/billing-sheets/summary
// @access  Protected (Admin, Staff)
export async function getBillingSheetsSummary(req, res) {
  try {
    await ensureBillingSheetTable(pool);
    const result = await pool.query(
      `SELECT collection_id, rows, updated_at FROM collection_billing_sheets`
    );
    const numKeys = [
      'int_calamity', 'calamity', 'int_emer', 'emer', 'int_ce', 'ce',
      'int_so', 'so', 'int_utility', 'utility', 'petty_cash', 'int_petty_cash',
      'int_reg', 'reg', 'fines', 'fixed_deposit'
    ];
    const summary = result.rows.map(row => {
      const sheetRows = Array.isArray(row.rows) ? row.rows : [];
      let sheetTotal = 0;
      for (const r of sheetRows) {
        for (const k of numKeys) {
          sheetTotal += Number(r?.[k]) || 0;
        }
      }
      return {
        collection_id: row.collection_id,
        row_count: sheetRows.length,
        sheet_total: Math.round(sheetTotal * 100) / 100,
        updated_at: row.updated_at
      };
    });
    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching billing sheets summary:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to load billing sheets summary' }
    });
  }
}
