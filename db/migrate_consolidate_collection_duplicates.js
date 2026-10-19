import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

/**
 * Migration: Consolidate duplicate collection entries sharing the same invoice / OR number.
 * When multiple items belong to the same invoice (e.g. multiple loan amortizations,
 * interest, fines, or share capital), consolidate them into a single canonical CollectionItem
 * with itemized `loans: [...]` array, and delete the redundant split rows.
 */
export async function migrateConsolidateCollectionDuplicates(customPool = null) {
  console.log('[Migration] Checking for duplicate collection entries with the same OR number...');
  const activePool = customPool || pool;
  const client = await activePool.connect();

  try {
    await client.query('BEGIN');

    // 1. Find all OR numbers with duplicates
    const dupesRes = await client.query(`
      SELECT or_no, count(*) as count
      FROM collections
      GROUP BY or_no
      HAVING count(*) > 1
      ORDER BY or_no
    `);

    if (dupesRes.rows.length === 0) {
      console.log('[Migration] No duplicate collection entries found. Registry is clean.');
      await client.query('COMMIT');
      return;
    }

    console.log(`[Migration] Found ${dupesRes.rows.length} duplicate invoice groups to consolidate.`);

    let totalDeleted = 0;

    for (const { or_no } of dupesRes.rows) {
      const rowsRes = await client.query(
        `SELECT * FROM collections WHERE or_no = $1 ORDER BY created_at ASC, id ASC`,
        [or_no]
      );
      const rows = rowsRes.rows;

      // Canonical row: prefer row with tab = 'credit' (or first row)
      const canonicalRow = rows.find(r => r.tab === 'credit') || rows[0];
      const redundantIds = rows.filter(r => r.id !== canonicalRow.id).map(r => r.id);

      const consolidatedLoans = [];
      let totalPrincipal = 0;
      let totalInterest = 0;
      let totalFines = 0;
      let totalCommonShare = 0;
      let totalAmount = 0;
      let finesFromServices = 0;
      const remarksList = [];

      for (const r of rows) {
        const amt = parseFloat(r.amount || 0);
        totalAmount += amt;

        const pAmt = parseFloat(r.principal_amount || 0);
        const iAmt = parseFloat(r.interest_amount || 0);
        const fAmt = parseFloat(r.fines_amount || 0);
        const csAmt = parseFloat(r.common_share_amount || 0);

        if (r.remarks && !remarksList.includes(r.remarks)) {
          remarksList.push(r.remarks);
        }

        // Shared Capital check
        if (
          (r.loan_account && /shared\s*capital|share\s*capital|fixed\s*deposit/i.test(r.loan_account)) ||
          (r.particulars && /shared\s*capital|share\s*capital|fixed\s*deposit/i.test(r.particulars)) ||
          csAmt > 0
        ) {
          totalCommonShare += (csAmt > 0 ? csAmt : (pAmt > 0 ? pAmt : amt));
        }
        // Separate Fines & Late Charges check
        else if (r.service_type && /fine|penalty|late/i.test(r.service_type)) {
          finesFromServices += amt;
        }
        // Loan repayment
        else if (r.loan_account || pAmt > 0 || iAmt > 0 || fAmt > 0) {
          if (Array.isArray(r.loans) && r.loans.length > 0) {
            for (const l of r.loans) {
              consolidatedLoans.push(l);
              totalPrincipal += parseFloat(l.principal_amount || 0);
              totalInterest += parseFloat(l.interest_amount || 0);
              totalFines += parseFloat(l.fines_amount || 0);
            }
          } else {
            consolidatedLoans.push({
              loan_account: r.loan_account || 'Loans Payable',
              principal_amount: pAmt,
              interest_account: r.interest_account || (iAmt > 0 ? 'Interest Received' : undefined),
              interest_amount: iAmt,
              fines_account: r.fines_account || (fAmt > 0 ? 'Fines & Late Charges' : undefined),
              fines_amount: fAmt
            });
            totalPrincipal += pAmt;
            totalInterest += iAmt;
            totalFines += fAmt;
          }
        }
      }

      if (finesFromServices > 0) {
        totalFines += finesFromServices;
        if (consolidatedLoans.length > 0) {
          consolidatedLoans[0].fines_amount = (consolidatedLoans[0].fines_amount || 0) + finesFromServices;
          consolidatedLoans[0].fines_account = consolidatedLoans[0].fines_account || 'Fines & Late Charges';
        }
      }

      const primaryLoanAccount = consolidatedLoans[0]?.loan_account || canonicalRow.loan_account || 'Loans Payable';
      const consolidatedRemarks = remarksList.join('; ') || canonicalRow.remarks;

      // Update canonical row with consolidated data
      await client.query(`
        UPDATE collections SET
          tab = 'credit',
          loans = $1::jsonb,
          loan_account = $2,
          principal_amount = $3,
          interest_amount = $4,
          fines_amount = $5,
          common_share_amount = $6,
          amount = $7,
          remarks = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
      `, [
        JSON.stringify(consolidatedLoans),
        primaryLoanAccount,
        totalPrincipal,
        totalInterest,
        totalFines,
        totalCommonShare,
        totalAmount,
        consolidatedRemarks,
        canonicalRow.id
      ]);

      // Delete the redundant split rows
      if (redundantIds.length > 0) {
        const deleteRes = await client.query(
          `DELETE FROM collections WHERE id = ANY($1::varchar[])`,
          [redundantIds]
        );
        totalDeleted += deleteRes.rowCount;
      }
    }

    await client.query('COMMIT');
    console.log(`[Migration] Successfully consolidated ${dupesRes.rows.length} duplicate invoice groups. Removed ${totalDeleted} redundant split entries.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Failed to consolidate duplicate collection entries:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateConsolidateCollectionDuplicates()
    .then(() => pool.end())
    .catch(() => pool.end());
}
