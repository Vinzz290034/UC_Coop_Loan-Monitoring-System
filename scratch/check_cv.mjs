import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    const res = await pool.query("SELECT id, voucher_no, amount, details FROM check_vouchers WHERE voucher_no = '26-274'");
    console.log("Count:", res.rows.length);
    if (res.rows.length > 0) {
      console.log("ID:", res.rows[0].id);
      console.log("Amount:", res.rows[0].amount);
      const details = typeof res.rows[0].details === 'string' ? JSON.parse(res.rows[0].details) : res.rows[0].details;
      console.log("Details length:", details.length);
      let totalDebit = 0;
      let totalCredit = 0;
      details.forEach((d, idx) => {
        const debit = parseFloat(d.debit || (d.amount > 0 && !d.is_credit ? d.amount : 0)) || 0;
        const credit = parseFloat(d.credit || (d.amount < 0 || d.is_credit ? Math.abs(d.amount) : 0)) || 0;
        if (d.credit) console.log(`Credit row [${idx}]:`, d.book_of_account, d.credit);
        totalDebit += debit;
        totalCredit += credit;
      });
      console.log("Total Debit:", totalDebit, "Total Credit:", totalCredit);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
