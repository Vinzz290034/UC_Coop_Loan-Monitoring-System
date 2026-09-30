import pool from '../config/db.js';

async function checkFull() {
  const r = await pool.query("SELECT id, voucher_no, amount, details FROM check_vouchers WHERE voucher_no ILIKE '%26-274%'");
  const cv = r.rows[0];
  console.log('CV #', cv.voucher_no, 'DB Amount:', cv.amount);
  const details = typeof cv.details === 'string' ? JSON.parse(cv.details) : (cv.details || []);
  console.log('Details length:', details.length);
  
  let debitSum = 0;
  let creditSum = 0;
  
  details.forEach((item, idx) => {
    console.log(`[${idx}]`, JSON.stringify(item));
    const deb = parseFloat(item.debit || (item.amount > 0 ? item.amount : 0)) || 0;
    const cred = parseFloat(item.credit || (item.amount < 0 ? Math.abs(item.amount) : 0)) || 0;
    debitSum += deb;
    creditSum += cred;
  });

  console.log('--- SUMS ---');
  console.log('debitSum:', debitSum);
  console.log('creditSum:', creditSum);
  process.exit(0);
}

checkFull();
