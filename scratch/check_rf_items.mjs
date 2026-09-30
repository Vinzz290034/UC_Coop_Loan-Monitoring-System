import pool from '../config/db.js';

async function checkRf() {
  const r = await pool.query("SELECT * FROM revolving_fund_liquidations WHERE lf_no ILIKE '%58%' OR check_voucher_id IS NOT NULL");
  for (const rf of r.rows) {
    console.log('LF #:', rf.lf_no, 'id:', rf.id, 'check_voucher_id:', rf.check_voucher_id, 'voucher_no:', rf.voucher_no, 'total_expense:', rf.total_expense);
    const items = await pool.query("SELECT * FROM rf_liquidation_items WHERE liquidation_id = $1", [rf.id]);
    console.log('  Items count:', items.rows.length);
    let sum = 0;
    items.rows.forEach(it => sum += parseFloat(it.amount || 0));
    console.log('  Items sum:', sum);
  }
  process.exit(0);
}

checkRf();
