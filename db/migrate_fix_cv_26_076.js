import pool from '../config/db.js';

/**
 * Migration to correct Check Voucher CV #26-076:
 * Corrects CIB-BDO amount to ₱5,010.27 (instead of ₱2,700.00),
 * perfectly balancing the voucher (Debit: 7,710.27, Credits: 200 + 2,500 + 5,010.27 = 7,710.27).
 */
export async function migrateFixCv26076() {
  console.log('[Migration] Checking Check Voucher CV #26-076 for balance correction...');
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT id, voucher_no, amount, details
      FROM check_vouchers
      WHERE voucher_no = '26-076' OR voucher_no ILIKE '%26-076%'
    `);

    if (res.rows.length === 0) {
      console.log('[Migration] Voucher CV #26-076 not found, skipping.');
      return;
    }

    for (const cv of res.rows) {
      let details = cv.details;
      if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch { details = []; }
      }

      let updatedDetails = false;
      if (Array.isArray(details) && details.length > 0) {
        for (const row of details) {
          const name = (row.book_of_account || row.description || row.account || '').trim();
          if (/^(cib\b|cash\s*in\s*bank)/i.test(name)) {
            if (row.credit !== undefined && row.credit !== null) row.credit = 5010.27;
            if (row.amount !== undefined && row.amount !== null) {
              row.amount = (row.amount < 0 || row.is_credit) ? (row.is_credit ? 5010.27 : -5010.27) : 5010.27;
            }
            updatedDetails = true;
          }
        }
        if (!updatedDetails) {
          details.push({
            book_of_account: 'CIB-BDO',
            debit: null,
            credit: 5010.27,
            amount: 5010.27,
            is_credit: true,
            isAutoCredit: true,
            remarks: ''
          });
        }
      } else {
        details = [
          { book_of_account: 'Salary', debit: 7710.27, credit: null, amount: 7710.27, is_credit: false },
          { book_of_account: 'Pag-ibig Payable', debit: null, credit: 200.00, amount: 200.00, is_credit: true },
          { book_of_account: 'Advances to employee', debit: null, credit: 2500.00, amount: 2500.00, is_credit: true },
          { book_of_account: 'CIB-BDO', debit: null, credit: 5010.27, amount: 5010.27, is_credit: true, isAutoCredit: true }
        ];
      }

      await client.query(
        `UPDATE check_vouchers
         SET amount = 5010.27,
             details = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(details), cv.id]
      );
      console.log(`[Migration] Check Voucher CV #${cv.voucher_no} (${cv.id}) CIB-BDO corrected to ₱5,010.27.`);
    }
  } catch (error) {
    console.error('[Migration] Error correcting Check Voucher CV #26-076:', error);
  } finally {
    client.release();
  }
}

