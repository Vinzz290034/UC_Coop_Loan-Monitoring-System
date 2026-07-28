import pool from '../config/db.js';

async function run() {
  try {
    console.log('Running role constraint database migration...');
    
    // Find all check constraints on the users table that check the 'role' column
    const checkConstraintsRes = await pool.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%role%'
    `);
    
    const constraints = checkConstraintsRes.rows;
    console.log('Found check constraints:', constraints);
    
    for (const constraint of constraints) {
      console.log(`Dropping constraint: ${constraint.conname}`);
      await pool.query(`ALTER TABLE users DROP CONSTRAINT ${constraint.conname}`);
    }
    
    // Update existing manager accounts to staff BEFORE adding the new check constraint
    console.log('Updating existing manager users to staff...');
    const updateRes = await pool.query(`
      UPDATE users 
      SET role = 'staff' 
      WHERE role = 'manager'
    `);
    console.log(`Successfully updated ${updateRes.rowCount} users to staff role.`);
    
    // Add the new check constraint allowing 'staff'
    console.log('Adding new check constraint: admin, staff, member');
    await pool.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('admin', 'staff', 'member'))
    `);
    
    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
