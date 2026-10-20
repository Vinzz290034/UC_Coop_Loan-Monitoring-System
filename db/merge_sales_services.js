import pool from '../config/db.js';

async function mergeSalesAndServices() {
  try {
    const res = await pool.query(`
      UPDATE collections 
      SET tab = 'sales_services' 
      WHERE tab IN ('sales', 'services')
    `);
    console.log(`Successfully merged ${res.rowCount} rows to sales_services.`);

    const countRes = await pool.query('SELECT tab, count(*) FROM collections GROUP BY tab');
    console.log('Current collection breakdown:', countRes.rows);
  } catch (error) {
    console.error('Error merging sales and services:', error);
  } finally {
    await pool.end();
  }
}

mergeSalesAndServices();
