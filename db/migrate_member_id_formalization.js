import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateMemberIdFormalization() {
  console.log('[Migration] Checking member_sequences and member_no column on members table...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create member_sequences table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS member_sequences (
        year INT PRIMARY KEY,
        current_seq INT NOT NULL DEFAULT 0
      );
    `);

    // 2. Add member_no column to members table if not exists
    const checkColumnRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'members' AND column_name = 'member_no'
    `);

    if (checkColumnRes.rowCount === 0) {
      console.log('[Migration] Adding member_no column to members table...');
      await client.query(`ALTER TABLE members ADD COLUMN member_no VARCHAR(50) UNIQUE DEFAULT NULL;`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_members_member_no ON members(member_no);`);
    }

    // 3. Backfill existing members that do not yet have a member_no
    const unassignedMembersRes = await client.query(`
      SELECT id, created_at, EXTRACT(YEAR FROM created_at)::INT as creation_year
      FROM members
      WHERE member_no IS NULL OR member_no = ''
      ORDER BY created_at ASC, id ASC
    `);

    if (unassignedMembersRes.rows.length > 0) {
      console.log(`[Migration] Backfilling ${unassignedMembersRes.rows.length} existing members with YYYY-N Member IDs...`);

      // Process year by year to maintain accurate sequences
      const membersByYear = {};
      for (const m of unassignedMembersRes.rows) {
        const year = m.creation_year || new Date().getFullYear();
        if (!membersByYear[year]) membersByYear[year] = [];
        membersByYear[year].push(m);
      }

      for (const [yearStr, membersList] of Object.entries(membersByYear)) {
        const year = parseInt(yearStr, 10);

        // Fetch current highest sequence for this year
        const seqRes = await client.query(`
          SELECT current_seq FROM member_sequences WHERE year = $1 FOR UPDATE
        `, [year]);

        let seq = seqRes.rows.length > 0 ? parseInt(seqRes.rows[0].current_seq, 10) : 0;

        for (const member of membersList) {
          seq += 1;
          const memberNo = `${year}-${seq}`;
          await client.query(`
            UPDATE members 
            SET member_no = $1 
            WHERE id = $2
          `, [memberNo, member.id]);
        }

        // Upsert the updated sequence in member_sequences
        await client.query(`
          INSERT INTO member_sequences (year, current_seq)
          VALUES ($1, $2)
          ON CONFLICT (year) DO UPDATE SET current_seq = EXCLUDED.current_seq;
        `, [year, seq]);

        console.log(`[Migration] Year ${year}: sequence updated to ${seq}.`);
      }
    }

    await client.query('COMMIT');
    console.log('[Migration] Member ID formalization migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Failed to migrate Member ID formalization:', error);
    throw error;
  } finally {
    client.release();
  }
}

import { fileURLToPath } from 'url';

// Allow direct CLI execution
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrateMemberIdFormalization()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
    });
}
