import pool from '../config/db.js';

/**
 * Automated recovery migration for STL Check Vouchers:
 * If an STL check voucher's `details` currently has no remarks (or was collapsed into a summary row)
 * because it was previously saved from Summary mode, this checks `audit_logs` for the most recent
 * PUT/POST check-voucher payload for that voucher that contained remarks/detailed items and restores it.
 */
export async function migrateRestoreStlCvRemarks() {
  console.log('[Migration] Checking STL check vouchers for recoverable remarks in audit_logs...');
  const client = await pool.connect();
  try {
    const stlVouchersRes = await client.query(`
      SELECT id, voucher_no, details
      FROM check_vouchers
      WHERE folder_name ILIKE '%STL%'
         OR particulars ILIKE '%STL%'
         OR particulars ILIKE '%Short Term Loan%'
    `);

    let restoredCount = 0;

    for (const cv of stlVouchersRes.rows) {
      const currentDetails = Array.isArray(cv.details) ? cv.details : [];
      const currentRemarksCount = currentDetails.filter(
        d => d && d.remarks && String(d.remarks).trim() !== ''
      ).length;

      // Only attempt recovery if the voucher currently has 0 remarks
      if (currentRemarksCount > 0) continue;

      const auditRes = await client.query(
        `
        SELECT details, created_at
        FROM audit_logs
        WHERE status = 'success'
          AND (
            endpoint ILIKE $1
            OR (endpoint = '/api/accounts/check-vouchers' AND method = 'POST' AND details::text ILIKE $2)
          )
        ORDER BY created_at DESC
        `,
        [`%/api/accounts/check-vouchers/${cv.id}%`, `%"voucher_no":"${cv.voucher_no}"%`]
      );

      if (auditRes.rowCount === 0) continue;

      let bestDetails = null;
      for (const logRow of auditRes.rows) {
        let parsed = logRow.details;
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            continue;
          }
        }
        const body = parsed?.body || parsed;
        const candidateDetails = Array.isArray(body?.details) ? body.details : null;
        if (!candidateDetails || candidateDetails.length === 0) continue;

        const candidateRemarksCount = candidateDetails.filter(
          d => d && d.remarks && String(d.remarks).trim() !== ''
        ).length;

        if (candidateRemarksCount > 0) {
          bestDetails = candidateDetails;
          break;
        }
      }

      if (bestDetails && bestDetails.length >= currentDetails.length) {
        await client.query(
          `UPDATE check_vouchers SET details = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [JSON.stringify(bestDetails), cv.id]
        );
        restoredCount++;
        console.log(`[Migration] Restored remarks for STL Check Voucher #${cv.voucher_no} from audit_logs.`);
      }
    }

    console.log(`[Migration] STL check voucher remarks check complete (${restoredCount} restored).`);
  } catch (error) {
    console.error('[Migration] Error checking/restoring STL CV remarks:', error.message);
  } finally {
    client.release();
  }
}

