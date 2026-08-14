import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

export async function migrateSeedDefaults() {
  console.log('[Migration] Checking default seed accounts and products...');
  const client = await pool.connect();
  try {
    // Helper function to safely seed user if neither ID nor username exists
    const seedUser = async (id, username, passwordHash, role) => {
      const existing = await client.query(
        `SELECT id FROM users WHERE id = $1 OR username = $2`,
        [id, username]
      );
      if (existing.rowCount === 0) {
        await client.query(
          `INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [id, username, passwordHash, role]
        );
      }
    };

    // 1. Seed Default Users (Password: password123)
    // Admin
    await seedUser('11111111-1111-1111-1111-111111111111', 'admin', '$2a$10$Fs7N3s3b2BWUb4mKBPXENuoVya.LliSmudMkloCn7zavqwJc8miD.', 'admin');

    // Staff
    await seedUser('22222222-2222-2222-2222-222222222222', 'manager', '$2a$10$Fs7N3s3b2BWUb4mKBPXENuoVya.LliSmudMkloCn7zavqwJc8miD.', 'staff');

    // Member User
    await seedUser('33333333-3333-3333-3333-333333333333', 'member1', '$2a$10$Fs7N3s3b2BWUb4mKBPXENuoVya.LliSmudMkloCn7zavqwJc8miD.', 'member');

    // 2. Seed Member Profile linked to the member user
    const memberProfileCheck = await client.query(
      `SELECT id FROM members WHERE id = $1 OR email = $2 OR user_id = $3`,
      ['44444444-4444-4444-4444-444444444444', 'johndoe@example.com', '33333333-3333-3333-3333-333333333333']
    );
    if (memberProfileCheck.rowCount === 0) {
      await client.query(`
        INSERT INTO members (id, user_id, first_name, last_name, middle_name, email, phone, address, date_of_birth, gender, civil_status, status)
        VALUES (
            '44444444-4444-4444-4444-444444444444', 
            '33333333-3333-3333-3333-333333333333', 
            'John', 
            'Doe', 
            'Smith', 
            'johndoe@example.com', 
            '+639123456789', 
            '123 Mambaling Street, Cebu City', 
            '1990-01-15', 
            'Male',
            'Single',
            'active'
        )
        ON CONFLICT DO NOTHING;
      `);
    }

    // 3. Seed Default Loan Products
    await client.query(`
      INSERT INTO loan_products (name, interest_rate, term_months, amortization_type, min_amount, max_amount, is_active)
      VALUES 
          ('Regular Loan - Salary Deduction', 0.1200, 12, 'diminishing_balance', 10000.00, 75000.00, true),
          ('Regular Loan - Project Loan', 0.0700, 24, 'diminishing_balance', 76000.00, 300000.00, true),
          ('Regular Loan - Calamity Loan', 0.0500, 24, 'diminishing_balance', 10000.00, 50000.00, true),
          ('Short Term Loan (STL) - Utility Loan', 0.0300, 1, 'diminishing_balance', 3000.00, 3000.00, true),
          ('Short Term Loan (STL) - Emergency Loan', 0.0400, 2, 'diminishing_balance', 5000.00, 5000.00, true),
          ('Short Term Loan (STL) - Cash Express', 0.0800, 2, 'diminishing_balance', 7000.00, 7000.00, true),
          ('Short Term Loan (STL) - Special Occasion', 0.0500, 3, 'diminishing_balance', 10000.00, 10000.00, true)
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log('[Migration] Default seed data checked/inserted successfully.');
  } catch (error) {
    console.error('[Migration] Failed to seed default data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSeedDefaults()
    .then(() => pool.end())
    .catch(() => pool.end());
}
