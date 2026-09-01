import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';

async function provisionMemberAccounts() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting batch user account provisioning for imported members...');

    const cleanStr = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanFirst = (s) => {
      if (!s) return '';
      const parts = s.trim().split(/\s+/);
      const mainFirst = parts.filter(p => !p.match(/^[A-Za-z]\.?$/)).join('') || parts[0];
      return (mainFirst || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    // 1. Fetch unlinked members
    const membersRes = await client.query(`
      SELECT id, first_name, last_name, email, phone, status 
      FROM members 
      WHERE user_id IS NULL 
      ORDER BY last_name, first_name
    `);

    console.log(`Found ${membersRes.rows.length} unlinked members.`);

    if (membersRes.rows.length === 0) {
      console.log('✅ All members already have linked user accounts.');
      return;
    }

    // 2. Fetch existing usernames
    const existingUsers = await client.query('SELECT username FROM users');
    const existingUsernames = new Set(existingUsers.rows.map(r => r.username.toLowerCase()));

    // 3. Hash default password once (bcrypt salt 10)
    const defaultPassword = 'UCCoop@2026';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const credentialRecords = [];

    await client.query('BEGIN');

    for (const member of membersRes.rows) {
      let baseFirst = cleanFirst(member.first_name);
      let baseLast = cleanStr(member.last_name);
      if (!baseFirst) baseFirst = 'member';
      if (!baseLast) baseLast = 'user';

      let username = `${baseFirst}.${baseLast}`;
      let count = 1;
      while (existingUsernames.has(username)) {
        count++;
        username = `${baseFirst}.${baseLast}${count}`;
      }
      existingUsernames.add(username);

      // Create user account
      const userRes = await client.query(
        `INSERT INTO users (username, password_hash, role)
         VALUES ($1, $2, 'member')
         RETURNING id, username, role, created_at`,
        [username, passwordHash]
      );
      const newUser = userRes.rows[0];

      // Update member profile to link user_id and set status to 'pending' for onboarding verification
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

      // Insert audit log
      await client.query(
        `INSERT INTO member_status_logs (member_id, previous_status, new_status, remarks)
         VALUES ($1, $2, 'pending', 'User account provisioned; awaiting member profile completion and verification.')`,
        [member.id, member.status]
      );

      credentialRecords.push({
        memberId: member.id,
        fullName: `${member.last_name}, ${member.first_name}`,
        username: username,
        password: defaultPassword,
        status: 'pending',
        verification: 'Pending Profile Completion'
      });
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully provisioned ${credentialRecords.length} user accounts!`);

    // 4. Write CSV report for administrators
    const csvHeader = 'Member ID,Full Name,Username,Default Password,Status,Verification Requirement\n';
    const csvRows = credentialRecords.map(r => 
      `"${r.memberId}","${r.fullName}","${r.username}","${r.password}","${r.status}","${r.verification}"`
    ).join('\n');

    const csvPath = path.resolve(process.cwd(), 'coop_member_credentials_2026.csv');
    fs.writeFileSync(csvPath, csvHeader + csvRows, 'utf8');
    console.log(`📄 Credential summary report written to: ${csvPath}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error provisioning accounts:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

provisionMemberAccounts().catch(err => {
  console.error(err);
  process.exit(1);
});
