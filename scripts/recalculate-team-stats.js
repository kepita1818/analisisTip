import { query } from '../src/db.js';

async function main() {
  await query('DELETE FROM team_competition_stats');

  const played = await query(`
    SELECT m.id, m.competition_id, m.season_id, m.home_team_id, m.away_team_id,
           m.home_score, m.away_score,
           COALESCE(s.home_corners,0) AS home_corners,
           COALESCE(s.away_corners,0) AS away_corners,
           COALESCE(s.total_corners, COALESCE(s.home_corners,0)+COALESCE(s.away_corners,0)) AS total_corners,
           COALESCE(s.home_yellow_cards,0)+COALESCE(s.home_red_cards,0) AS home_cards,
           COALESCE(s.away_yellow_cards,0)+COALESCE(s.away_red_cards,0) AS away_cards,
           COALESCE(s.total_cards, (COALESCE(s.home_yellow_cards,0)+COALESCE(s.home_red_cards,0)+COALESCE(s.away_yellow_cards,0)+COALESCE(s.away_red_cards,0))) AS total_cards
    FROM matches m
    LEFT JOIN match_stats s ON s.match_id = m.id
    WHERE m.home_score IS NOT NULL AND m.away_score IS NOT NULL
  `);

  const map = new Map();
  for (const row of played.rows) {
    const homeKey = `${row.competition_id}|${row.season_id}|${row.home_team_id}`;
    const awayKey = `${row.competition_id}|${row.season_id}|${row.away_team_id}`;
    push(map, homeKey, row.competition_id, row.season_id, row.home_team_id, row.home_score, row.away_score, row.home_corners, row.away_corners, row.home_cards, row.away_cards, row.home_score > row.away_score ? 'W' : row.home_score < row.away_score ? 'L' : 'D');
    push(map, awayKey, row.competition_id, row.season_id, row.away_team_id, row.away_score, row.home_score, row.away_corners, row.home_corners, row.away_cards, row.home_cards, row.away_score > row.home_score ? 'W' : row.away_score < row.home_score ? 'L' : 'D');
  }

  for (const stat of map.values()) {
    await query(`
      INSERT INTO team_competition_stats (
        competition_id, team_id, season_id, matches_played,
        goals_for_avg, goals_against_avg, goals_total_avg,
        corners_for_avg, corners_against_avg, corners_total_avg,
        cards_for_avg, cards_against_avg, cards_total_avg,
        last_five, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
      ON CONFLICT (competition_id, team_id, season_id) DO UPDATE SET
        matches_played=EXCLUDED.matches_played,
        goals_for_avg=EXCLUDED.goals_for_avg,
        goals_against_avg=EXCLUDED.goals_against_avg,
        goals_total_avg=EXCLUDED.goals_total_avg,
        corners_for_avg=EXCLUDED.corners_for_avg,
        corners_against_avg=EXCLUDED.corners_against_avg,
        corners_total_avg=EXCLUDED.corners_total_avg,
        cards_for_avg=EXCLUDED.cards_for_avg,
        cards_against_avg=EXCLUDED.cards_against_avg,
        cards_total_avg=EXCLUDED.cards_total_avg,
        last_five=EXCLUDED.last_five,
        updated_at=NOW()
    `, [
      stat.competition_id,
      stat.team_id,
      stat.season_id,
      stat.played,
      avg(stat.gf, stat.played),
      avg(stat.ga, stat.played),
      avg(stat.gf + stat.ga, stat.played),
      avg(stat.cf, stat.played),
      avg(stat.ca, stat.played),
      avg(stat.cf + stat.ca, stat.played),
      avg(stat.cdf, stat.played),
      avg(stat.cda, stat.played),
      avg(stat.cdf + stat.cda, stat.played),
      JSON.stringify(stat.lastFive.slice(-5))
    ]);
  }

  console.log('Recalculated team competition stats');
  process.exit(0);
}

function push(map, key, competition_id, season_id, team_id, gf, ga, cf, ca, cdf, cda, result) {
  if (!map.has(key)) map.set(key, { competition_id, season_id, team_id, played: 0, gf: 0, ga: 0, cf: 0, ca: 0, cdf: 0, cda: 0, lastFive: [] });
  const item = map.get(key);
  item.played += 1;
  item.gf += Number(gf || 0);
  item.ga += Number(ga || 0);
  item.cf += Number(cf || 0);
  item.ca += Number(ca || 0);
  item.cdf += Number(cdf || 0);
  item.cda += Number(cda || 0);
  item.lastFive.push(result);
}

function avg(total, played) {
  if (!played) return 0;
  return Math.round((total / played) * 100) / 100;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
