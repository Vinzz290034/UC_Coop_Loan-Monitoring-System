import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export function formatPayeeName(name) {
  if (!name || typeof name !== 'string') return name || '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  if (trimmed.includes(',')) {
    const parts = trimmed.split(',');
    const lastName = parts[0].trim();
    const firstName = parts.slice(1).join(',').trim();
    if (firstName && lastName) {
      return `${firstName} ${lastName}`.replace(/\s+/g, ' ').toUpperCase();
    }
  }

  return trimmed.replace(/\s+/g, ' ').toUpperCase();
}

export async function migratePayeeNames() {
  console.log('[Migration] Normalizing check_vouchers payee names to FIRST NAME LAST NAME uppercase...');
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, payee FROM check_vouchers WHERE payee IS NOT NULL');
    let updatedCount = 0;

    for (const row of res.rows) {
      const originalPayee = row.payee;
      const formattedPayee = formatPayeeName(originalPayee);
      if (formattedPayee && formattedPayee !== originalPayee) {
        await client.query('UPDATE check_vouchers SET payee = $1 WHERE id = $2', [formattedPayee, row.id]);
        updatedCount++;
      }
    }

    console.log(`[Migration] Successfully updated ${updatedCount} check voucher payee names in production database.`);
  } catch (error) {
    console.error('[Migration] Failed to migrate payee names:', error);
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migratePayeeNames()
    .then(() => pool.end())
    .catch(() => pool.end());
}
