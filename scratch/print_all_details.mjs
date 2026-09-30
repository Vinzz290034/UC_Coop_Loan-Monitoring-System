import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const cv = (await pool.query("SELECT * FROM check_vouchers WHERE voucher_no = '26-274'")).rows[0];
    let details = typeof cv.details === 'string' ? JSON.parse(cv.details) : cv.details;
    details.forEach((d, i) => {
      console.log(`[${i}]`, d.voucher_no, '|', d.book_of_account || d.description, '| debit:', d.debit, '| credit:', d.credit, '| amt:', d.amount, '| is_cred:', d.is_credit, '| rem:', d.remarks);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
