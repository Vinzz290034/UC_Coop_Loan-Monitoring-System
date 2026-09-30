import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const cv = (await pool.query("SELECT * FROM check_vouchers WHERE voucher_no = '26-274'")).rows[0];
    const rf = (await pool.query("SELECT * FROM revolving_fund_liquidations WHERE check_voucher_id = $1", [cv.id])).rows[0];
    const items = (await pool.query("SELECT * FROM rf_liquidation_items WHERE liquidation_id = $1", [rf.id])).rows;
    
    // Find all subsets that sum to 46
    const nums = items.map(it => ({ id: it.id, name: it.account_name, amount: parseFloat(it.amount), remarks: it.remarks })).filter(x => x.amount > 0 && x.amount <= 46);
    console.log("Items <= 46:", nums);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
