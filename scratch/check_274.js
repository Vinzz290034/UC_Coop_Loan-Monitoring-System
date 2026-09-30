import pool from '../config/db.js';

async function check() {
  const r = await pool.query("SELECT id, voucher_no, amount, folder_name, details FROM check_vouchers WHERE voucher_no ILIKE '%26-274%'");
  const details = r.rows[0]?.details || [];
  let sumDebit = 0;
  let sumCredit = 0;
  details.forEach((it, idx) => {
    const d = it.debit ? Number(it.debit) : (it.amount > 0 ? Number(it.amount) : 0);
    const c = it.credit ? Number(it.credit) : (it.amount < 0 ? Math.abs(Number(it.amount)) : 0);
    if (d) sumDebit += d;
    if (c) sumCredit += c;
    console.log(`${idx}: desc="${it.book_of_account || it.description}", debit=${it.debit || (it.amount > 0 ? it.amount : '')}, credit=${it.credit || (it.amount < 0 ? it.amount : '')}, amount=${it.amount}`);
  });
  console.log('sumDebit:', sumDebit, 'sumCredit:', sumCredit);
  process.exit(0);
}
check();
