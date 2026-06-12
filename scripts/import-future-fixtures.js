import dotenv from 'dotenv';
import { query } from '../src/db.js';

dotenv.config();

const fixtures = [
  { date: '2026-06-11', time: '19:00', home: 'Mexico', away: 'South Africa', competition_key: 'WC2026', competition_name: 'FIFA World Cup 2026', status: 'scheduled' },
  { date: '2026-06-12', time: '13:00', home: 'Qatar', away: 'Switzerland', competition_key: 'WC2026', competition_name: 'FIFA World Cup 2026', status: 'scheduled' },
  { date: '2026-06-12', time: '16:00', home: 'Canada', away: 'Bosnia and Herzegovina', competition_key: 'WC2026', competition_name: 'FIFA World Cup 2026', status: 'scheduled' },
  { date: '2026-06-13', time: '21:00', home: 'Brazil', away: 'Morocco', competition_key: 'WC2026', competition_name: 'FIFA World Cup 2026', status: 'scheduled' },
  { date: '2026-06-14', time: '21:00', home: 'Netherlands', away: 'Japan', competition_key: 'WC2026', competition_name: 'FIFA World Cup 2026', status: 'scheduled' },
  { date: '2026-06-15', time: '21:00', home: 'Spain', away: 'Cape Verde', competition_key: 'WC2026', competition_name: 'FIFA World Cup 2026', status: 'scheduled' }
];

async function main() {
  const comp = await query(`
    INSERT INTO competitions (key, name, type, country, active)
    VALUES ('WC2026', 'FIFA World Cup 2026', 'international', 'INTL', true)
    ON CONFLICT (key)
    DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, country = EXCLUDED.country, active = true
    RETURNING id
  `);

  const competitionId = comp.rows[0].id;

  for (const f of fixtures) {
    const homeTeam = await query(`
      INSERT INTO teams (name)
      VALUES ($1)
      ON CONFLICT (name)
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [f.home]);

    const awayTeam = await query(`
      INSERT INTO teams (name)
      VALUES ($1)
      ON CONFLICT (name)
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [f.away]);

    const homeTeamId = homeTeam.rows[0].id;
    const awayTeamId = awayTeam.rows[0].id;

    await query(`
      INSERT INTO matches (match_date, kickoff_time, status, competition_id, home_team_id, away_team_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (competition_id, match_date, kickoff_time, home_team_id, away_team_id)
      DO UPDATE SET status = EXCLUDED.status
    `, [f.date, f.time, f.status, competitionId, homeTeamId, awayTeamId]);
  }

  console.log(`Inserted ${fixtures.length} fixtures for WC2026`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
