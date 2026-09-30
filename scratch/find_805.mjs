import pool from '../config/db.js';

async function find805() {
  const r = await pool.query("SELECT id, voucher_no, amount, details FROM check_vouchers WHERE voucher_no ILIKE '%26-274%'");
  const cv = r.rows[0];
  const details = typeof cv.details === 'string' ? JSON.parse(cv.details) : (cv.details || []);

  console.log('Details length:', details.length);
  // Let's check item 41, 42, 43 in details:
  console.log('Item 41:', details[41]); // Pag-ibig premium ER share 400
  console.log('Item 42:', details[42]); // Pag-ibig premium- EE share 400
  console.log('Item 43:', details[43]); // Miscellaneous 5
  // 400 + 400 + 5 = 805!
  
  process.exit(0);
}

find805();
