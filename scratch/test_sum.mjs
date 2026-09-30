import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const cv = (await pool.query("SELECT * FROM check_vouchers WHERE voucher_no = '26-274'")).rows[0];
    let details = typeof cv.details === 'string' ? JSON.parse(cv.details) : cv.details;
    let items = details.map((d, i) => ({
      idx: i,
      desc: d.book_of_account || d.description,
      val: parseFloat(d.debit || (d.amount > 0 ? d.amount : 0)) || 0,
      rem: d.remarks
    })).filter(x => x.val > 0);

    function findSum(arr, target) {
      let result = [];
      function backtrack(start, curSum, path) {
        if (Math.abs(curSum - target) < 0.001) { result.push([...path]); return; }
        if (curSum > target + 0.001) return;
        for (let i = start; i < arr.length; i++) {
          backtrack(i + 1, curSum + arr[i].val, [...path, arr[i]]);
        }
      }
      backtrack(0, 0, []);
      return result;
    }
    console.log('Combinations summing to 46:', JSON.stringify(findSum(items, 46), null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
