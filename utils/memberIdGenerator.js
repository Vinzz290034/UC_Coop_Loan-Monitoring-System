/**
 * Generates the next sequential Member ID for a given year in the format: YYYY-N
 * Uses row-level database locking (SELECT ... FOR UPDATE) on member_sequences
 * to prevent race conditions and guarantee strictly unique yearly sequences.
 * 
 * @param {import('pg').PoolClient} client - An active PostgreSQL client transaction
 * @param {number} [targetYear] - The 4-digit year (defaults to current calendar year)
 * @returns {Promise<string>} The formatted Member ID (e.g. "2026-95")
 */
export async function generateNextMemberNo(client, targetYear = new Date().getFullYear()) {
  const year = parseInt(targetYear, 10) || new Date().getFullYear();

  // Ensure row exists for this year with ON CONFLICT DO NOTHING
  await client.query(`
    INSERT INTO member_sequences (year, current_seq)
    VALUES ($1, 0)
    ON CONFLICT (year) DO NOTHING
  `, [year]);

  // Lock the sequence row for this year exclusively
  const lockRes = await client.query(`
    SELECT current_seq 
    FROM member_sequences 
    WHERE year = $1 
    FOR UPDATE
  `, [year]);

  const currentSeq = lockRes.rows.length > 0 ? parseInt(lockRes.rows[0].current_seq, 10) : 0;
  const nextSeq = currentSeq + 1;

  // Update sequence counter
  await client.query(`
    UPDATE member_sequences 
    SET current_seq = $1 
    WHERE year = $2
  `, [nextSeq, year]);

  return `${year}-${nextSeq}`;
}
