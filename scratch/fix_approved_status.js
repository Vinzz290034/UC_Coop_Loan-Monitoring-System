import pool from '../config/db.js';

const memberId = 'aec743c8-fe80-4bed-908b-49348381139c';

// Fix member: last_name = LOREJAS, first_name = (clear the "Member" placeholder)
const memberRes = await pool.query(`
  UPDATE members
  SET first_name = '',
      last_name  = 'LOREJAS',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = $1
  RETURNING id, first_name, last_name
`, [memberId]);
console.log('Member updated:', memberRes.rows[0]);

// Fix the username on the linked user account
const userRes = await pool.query(`
  UPDATE users
  SET username = 'lorejas'
  WHERE id = (SELECT user_id FROM members WHERE id = $1)
    AND username = 'lorejas.member'
  RETURNING id, username
`, [memberId]);
console.log('User updated:', userRes.rows[0]);

await pool.end();
