/**
 * Standalone script to provision login accounts for imported members
 * who have no user_id (investment-only / share capital depositors).
 *
 * Run: node scratch/run_provision_accounts.js
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from project root
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

const cleanStr = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const cleanFirst = (s) => {
  if (!s) return '';
  const parts = s.trim().split(/\s+/);
  const mainFirst = parts.filter(p => !p.match(/^[A-Za-z]\.?$/)).join('') || parts[0];
  return (mainFirst || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
};

async function provisionAccounts() {
  const client = await pool.connect();
  try {
    // 1. Fetch all members without a linked user account
    const membersRes = await client.query(`
      SELECT id, first_name, last_name, email, phone, status
      FROM members
      WHERE user_id IS NULL
      ORDER BY last_name, first_name
    `);

    const unlinkedMembers = membersRes.rows;
    console.log(`\nFound ${unlinkedMembers.length} members without login accounts.\n`);

    if (unlinkedMembers.length === 0) {
      console.log('✅ All members already have accounts. Nothing to do.');
      return;
    }

    // 2. Fetch existing usernames to avoid collisions
    const existingUsersRes = await client.query('SELECT username FROM users');
    const existingUsernames = new Set(existingUsersRes.rows.map(r => r.username.toLowerCase()));

    // 3. Hash default password once
    const defaultPassword = 'UCCoop@2026';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await client.query('BEGIN');

    const provisioned = [];

    for (const member of unlinkedMembers) {
      const baseFirst = cleanFirst(member.first_name);
      const baseLast = cleanStr(member.last_name);

      // If member only has a single name/surname (or placeholder 'member'), use the surname directly
      let username;
      if ((!baseLast || baseLast === 'member') && baseFirst && baseFirst !== 'member') {
        username = baseFirst;
      } else if ((!baseFirst || baseFirst === 'member') && baseLast && baseLast !== 'member') {
        username = baseLast;
      } else {
        const first = baseFirst || 'member';
        const last = baseLast || 'user';
        username = `${first}.${last}`;
      }

      // Generate unique username
      const baseUsername = username;
      let count = 1;
      while (existingUsernames.has(username)) {
        count++;
        username = `${baseUsername}${count}`;
      }
      existingUsernames.add(username);

      // Create user account
      const userRes = await client.query(
        `INSERT INTO users (username, password_hash, role)
         VALUES ($1, $2, 'member')
         RETURNING id, username`,
        [username, passwordHash]
      );
      const newUser = userRes.rows[0];

      // Link user_id to member and set to pending for onboarding
      await client.query(
        `UPDATE members
         SET user_id = $1,
             status = 'pending',
             profile_completed = false,
             is_verified = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newUser.id, member.id]
      );

      // Audit trail
      await client.query(
        `INSERT INTO member_status_logs (member_id, previous_status, new_status, remarks)
         VALUES ($1, $2, 'pending', 'User account provisioned via CLI script; awaiting member profile completion and verification.')`,
        [member.id, member.status]
      );

      provisioned.push({
        memberId: member.id,
        fullName: `${member.last_name}, ${member.first_name}`,
        username: newUser.username,
      });

      console.log(`  ✓ ${`${member.last_name}, ${member.first_name}`.padEnd(35)} → ${newUser.username}`);
    }

    await client.query('COMMIT');

    console.log(`\n✅ Done! ${provisioned.length} account(s) provisioned.`);
    console.log(`   Default password: ${defaultPassword}`);
    console.log(`   All members set to status: pending (awaiting onboarding)\n`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during provisioning — rolled back:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

provisionAccounts().catch(() => process.exit(1));
