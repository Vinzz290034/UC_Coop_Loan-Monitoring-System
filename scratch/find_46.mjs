import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res1 = await pool.query("SELECT * FROM check_vouchers WHERE particulars ILIKE '%46%' OR amount = 62775.05 OR amount = 62683.05");
    console.log("CV matches:", res1.rows.length);

    // Search rf_liquidation_items for amount 46
    const res2 = await pool.query("SELECT * FROM rf_liquidation_items WHERE amount = 46 OR amount = 46.00");
    console.log("RF items with 46:", res2.rows);

    // Search stl_liquidation_items for amount 46
    const res3 = await pool.query("SELECT * FROM stl_liquidation_items WHERE amount = 46 OR amount = 46.00");
    console.log("STL items with 46:", res3.rows);

    // Let's check all items of RF-58
    const cv = (await pool.query("SELECT * FROM check_vouchers WHERE voucher_no = '26-274'")).rows[0];
    const rf = (await pool.query("SELECT * FROM revolving_fund_liquidations WHERE check_voucher_id = $1", [cv.id])).rows[0];
    const items = (await pool.query("SELECT * FROM rf_liquidation_items WHERE liquidation_id = $1", [rf.id])).rows;
    console.log("All items in RF-58:");
    items.forEach((it, i) => {
      console.log(`[${i+1}] ${it.particulars || ''} | ${it.account_name} | ${it.amount} | remarks: ${it.remarks}`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
