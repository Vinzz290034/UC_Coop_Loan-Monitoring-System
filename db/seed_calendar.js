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

async function seed() {
  console.log('Connecting to database for seeding...');
  const client = await pool.connect();
  try {
    // Helper to generate dates relative to today
    const getRelativeDate = (daysOffset) => {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString().split('T')[0];
    };

    console.log('Inserting seed calendar events...');
    const seedQueries = [
      {
        title: 'Annual General Assembly Meeting',
        description: 'Join us for our cooperative annual general assembly to discuss reports, elect new board members, and share updates.',
        event_date: getRelativeDate(2),
        type: 'announcement',
        status: 'active'
      },
      {
        title: 'Office Closed - national holiday',
        description: 'In observance of the upcoming holiday, the cooperative office will be closed. Regular operations resume the next day.',
        event_date: getRelativeDate(5),
        type: 'holiday',
        status: 'closed'
      },
      {
        title: 'System Upgrade & Maintenance window',
        description: 'The loan processing system will be offline from 10 PM to 4 AM for server upgrades and database optimization.',
        event_date: getRelativeDate(8),
        type: 'special_schedule',
        status: 'active'
      },
      {
        title: 'Special Half-Day Office Operations',
        description: 'Office operations will be limited to half-day (8 AM to 12 PM) for staff team building activities.',
        event_date: getRelativeDate(12),
        type: 'office_duty',
        status: 'closed'
      }
    ];

    const insertQuery = `
      INSERT INTO calendar_events (title, description, event_date, type, status, created_by)
      VALUES ($1, $2, $3, $4, $5, '11111111-1111-1111-1111-111111111111')
    `;

    for (const item of seedQueries) {
      await client.query(insertQuery, [item.title, item.description, item.event_date, item.type, item.status]);
    }

    console.log('Calendar events seeded successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
