import pool from '../config/db.js';

async function fixGenders() {
  const femaleFirstNames = [
    'ivy', 'mayett', 'tessie', 'jolly cris', 'fe', 'grace', 'frelyn', 'aziel', 'lorelie',
    'ma theresa', 'theresita', 'jeloubelle', 'wenna leah jasmin', 'diana', 'juvelyn',
    'christy maries', 'cherelyn', 'norma', 'melissa', 'jocyne', 'michelle', 'tessafiel nina',
    'gwen jade', 'kristina', 'marines', 'anamy', 'edna', 'girlgrace', 'merliza', 'rosalinda',
    'manilyn', 'christine joy', 'mary ann'
  ];

  const res = await pool.query('SELECT id, first_name, last_name FROM members');

  let updatedCount = 0;
  for (const m of res.rows) {
    const fnLower = m.first_name.toLowerCase();
    const isFemale = femaleFirstNames.some(f => fnLower.includes(f));
    if (isFemale) {
      await pool.query('UPDATE members SET gender = $1 WHERE id = $2', ['Female', m.id]);
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} female members to Female.`);
  await pool.end();
}

fixGenders().catch(err => {
  console.error(err);
  pool.end();
});
