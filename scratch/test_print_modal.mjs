import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    const cvRes = await pool.query("SELECT * FROM check_vouchers WHERE voucher_no = '26-274'");
    const cv = cvRes.rows[0];
    const rfRes = await pool.query("SELECT * FROM revolving_fund_liquidations WHERE check_voucher_id = $1", [cv.id]);
    const rf = rfRes.rows[0];
    console.log("RF row:", rf?.id, rf?.sheet_name, rf?.total_liquidated);
    if (rf) {
      const itemsRes = await pool.query("SELECT * FROM rf_liquidation_items WHERE liquidation_id = $1 ORDER BY sort_order ASC", [rf.id]);
      console.log("RF items count:", itemsRes.rows.length);
      let sum = 0;
      itemsRes.rows.forEach(it => {
        sum += (parseFloat(it.amount) || 0);
      });
      console.log("RF items sum:", sum);
    }
    
    // Check if any items in cv.details or rf.items have 46 or credit
    if (rf?.items) {
      let sum = 0;
      rf.items.forEach((it, i) => {
        sum += (Number(it.amount) || 0);
      });
      console.log("RF items sum:", sum);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
