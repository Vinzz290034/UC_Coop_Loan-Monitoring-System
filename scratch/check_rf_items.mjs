import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const cv = (await pool.query("SELECT * FROM check_vouchers WHERE voucher_no = '26-274'")).rows[0];
    const rf = (await pool.query("SELECT * FROM revolving_fund_liquidations WHERE check_voucher_id = $1", [cv.id])).rows[0];
    const items = (await pool.query("SELECT * FROM rf_liquidation_items WHERE liquidation_id = $1 ORDER BY sort_order ASC", [rf.id])).rows;
    let sum = 0;
    items.forEach((it, i) => {
      const amt = parseFloat(it.amount) || 0;
      sum += amt;
      console.log(`[${i+1}] ${it.particulars} | ${it.account_name} | amt: ${amt} | cat: ${it.category} | is_canc: ${it.is_cancelled}`);
    });
    console.log("Total sum:", sum);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
