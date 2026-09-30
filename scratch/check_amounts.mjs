import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(`
      SELECT 'check_vouchers' as tbl, id, voucher_no, amount::text FROM check_vouchers WHERE amount IN (62775.05, 62729.05, 62683.05, 62730.05)
      UNION ALL
      SELECT 'revolving_fund_liquidations' as tbl, id, sheet_name, total_liquidated::text FROM revolving_fund_liquidations WHERE total_liquidated IN (62775.05, 62729.05, 62683.05, 62730.05)
    `);
    console.log("Matches:", res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
