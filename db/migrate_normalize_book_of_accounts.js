import pool from '../config/db.js';
import { normalizeAccountName } from '../controllers/reportController.js';

export async function migrateNormalizeBookOfAccounts() {
  console.log('[Migration] Checking check_vouchers and rf_liquidation_items for book of accounts normalization...');
  const client = await pool.connect();
  try {
    // 1. Normalize check_vouchers line items (details jsonb)
    const cvRes = await client.query(`
      SELECT id, voucher_no, details
      FROM check_vouchers
      WHERE details IS NOT NULL AND jsonb_array_length(details) > 0
    `);

    let updatedCvCount = 0;
    for (const cv of cvRes.rows) {
      const details = Array.isArray(cv.details) ? cv.details : [];
      let changed = false;

      for (const item of details) {
        const rawName = item.book_of_account || item.description;
        if (rawName) {
          const norm = normalizeAccountName(rawName);
          if (norm && norm !== rawName) {
            if (item.book_of_account) item.book_of_account = norm;
            if (item.description && !item.book_of_account) item.description = norm;
            changed = true;
          }
        }
      }

      if (changed) {
        await client.query(
          `UPDATE check_vouchers SET details = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [JSON.stringify(details), cv.id]
        );
        updatedCvCount++;
      }
    }

    if (updatedCvCount > 0) {
      console.log(`[Migration] Normalized book of accounts line items in ${updatedCvCount} check vouchers.`);
    }

    // 2. Normalize rf_liquidation_items table
    const rfItemsRes = await client.query(`
      SELECT id, account_name
      FROM rf_liquidation_items
      WHERE account_name IS NOT NULL AND TRIM(account_name) != ''
    `).catch(() => ({ rows: [] }));

    let updatedRfCount = 0;
    for (const item of rfItemsRes.rows) {
      const norm = normalizeAccountName(item.account_name);
      if (norm && norm !== item.account_name) {
        await client.query(
          `UPDATE rf_liquidation_items SET account_name = $1 WHERE id = $2`,
          [norm, item.id]
        );
        updatedRfCount++;
      }
    }

    if (updatedRfCount > 0) {
      console.log(`[Migration] Normalized account_name in ${updatedRfCount} revolving fund liquidation items.`);
    }

    // 3. Normalize rf_custom_accounts
    const customRes = await client.query(`SELECT name, category FROM rf_custom_accounts`).catch(() => ({ rows: [] }));
    for (const ca of customRes.rows) {
      const norm = normalizeAccountName(ca.name);
      if (norm && norm !== ca.name) {
        await client.query(`DELETE FROM rf_custom_accounts WHERE LOWER(name) = LOWER($1)`, [ca.name]);
        await client.query(
          `INSERT INTO rf_custom_accounts (name, category) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
          [norm, ca.category || 'Operation']
        );
      }
    }
  } catch (error) {
    console.error('[Migration] Error normalizing book of accounts:', error);
  } finally {
    client.release();
  }
}

