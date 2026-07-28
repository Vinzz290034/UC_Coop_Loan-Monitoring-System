import pool from '../config/db.js';

async function test() {
  try {
    const ticketsQuery = `
      SELECT st.*, m.email, m.first_name, m.last_name
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN members m ON u.id = m.user_id
      ORDER BY st.created_at DESC
    `;
    const res = await pool.query(ticketsQuery);
    console.log("Query succeeded! Rows count:", res.rowCount);
    console.log("Sample rows:", res.rows.slice(0, 2));
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

test();
