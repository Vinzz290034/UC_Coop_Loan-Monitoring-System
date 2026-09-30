import pool from '../config/db.js';

async function printItems() {
  const items = await pool.query("SELECT * FROM rf_liquidation_items WHERE liquidation_id = 'a1a7d0e6-eddd-4829-9aeb-cd2d9610d471' ORDER BY created_at ASC");
  console.log('Items count:', items.rows.length);
  let sum = 0;
  items.rows.forEach((it, idx) => {
    const amt = parseFloat(it.amount || 0);
    sum += amt;
    console.log(`[${idx+1}] LF:${it.lf_no || 'LF-58'} account:${it.account_name} amt:${amt}`);
  });
  console.log('Total sum of 48 items:', sum);
  process.exit(0);
}

printItems();
