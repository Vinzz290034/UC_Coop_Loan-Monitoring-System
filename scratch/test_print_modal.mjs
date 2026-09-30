import pool from '../config/db.js';

async function testSimulate() {
  const r = await pool.query("SELECT id, voucher_no, amount, details FROM check_vouchers WHERE voucher_no ILIKE '%26-274%'");
  const cv = r.rows[0];
  let details = typeof cv.details === 'string' ? JSON.parse(cv.details) : (cv.details || []);
  
  console.log('Original details count:', details.length);
  
  let debitSum = 0;
  let creditSum = 0;

  details.forEach((item, idx) => {
    const isCreditItem = item.is_credit === true ||
                         item.isAutoCredit === true ||
                         /^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test((item.book_of_account || item.description || '').trim()) ||
                         (item.amount < 0) ||
                         (item.credit !== null && item.credit !== undefined && item.credit !== '' && !item.debit);
                         
    const rawVal = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || 0);
    const dVal = item.debit ? parseFloat(item.debit) : (rawVal > 0 ? rawVal : 0);
    const cVal = item.credit ? parseFloat(item.credit) : (rawVal < 0 ? Math.abs(rawVal) : 0);

    if (isCreditItem) {
      creditSum += cVal || Math.abs(rawVal);
    } else {
      debitSum += dVal || rawVal;
    }
  });

  console.log('Simulated debitSum:', debitSum.toFixed(2), 'creditSum:', creditSum.toFixed(2));
  process.exit(0);
}

testSimulate();
