import { query } from '../db.js';

export async function recalculatePredictionsForUpcomingMatches(daysAhead = 7) {
  const matchesRes = await query(`
    SELECT m.id, m.competition_id, m.season_id, m.home_team_id, m.away_team_id
    FROM matches m
    WHERE m.match_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::text || ' days')::interval
  `, [String(daysAhead)]);

  for (const match of matchesRes.rows) {
    const [home, away] = await Promise.all([
      query(`SELECT * FROM team_competition_stats WHERE competition_id=$1 AND season_id=$2 AND team_id=$3`, [match.competition_id, match.season_id, match.home_team_id]),
      query(`SELECT * FROM team_competition_stats WHERE competition_id=$1 AND season_id=$2 AND team_id=$3`, [match.competition_id, match.season_id, match.away_team_id])
    ]);

    const hs = home.rows[0] || {};
    const as = away.rows[0] || {};

    const expectedHomeGoals = avg([Number(hs.goals_for_avg || 0), Number(as.goals_against_avg || 0)]);
    const expectedAwayGoals = avg([Number(as.goals_for_avg || 0), Number(hs.goals_against_avg || 0)]);
    const expectedGoals = round2(expectedHomeGoals + expectedAwayGoals);
    const expectedCorners = round2(avg([Number(hs.corners_total_avg || 0), Number(as.corners_total_avg || 0)]));
    const expectedCards = round2(avg([Number(hs.cards_total_avg || 0), Number(as.cards_total_avg || 0)]));

    await query(`
      INSERT INTO predictions (
        match_id, expected_home_goals, expected_away_goals, expected_total_goals,
        expected_total_corners, expected_total_cards,
        over_1_5_prob, over_2_5_prob, btts_prob,
        over_8_5_corners_prob, over_9_5_corners_prob,
        over_3_5_cards_prob, over_4_5_cards_prob, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (match_id) DO UPDATE SET
        expected_home_goals=EXCLUDED.expected_home_goals,
        expected_away_goals=EXCLUDED.expected_away_goals,
        expected_total_goals=EXCLUDED.expected_total_goals,
        expected_total_corners=EXCLUDED.expected_total_corners,
        expected_total_cards=EXCLUDED.expected_total_cards,
        over_1_5_prob=EXCLUDED.over_1_5_prob,
        over_2_5_prob=EXCLUDED.over_2_5_prob,
        btts_prob=EXCLUDED.btts_prob,
        over_8_5_corners_prob=EXCLUDED.over_8_5_corners_prob,
        over_9_5_corners_prob=EXCLUDED.over_9_5_corners_prob,
        over_3_5_cards_prob=EXCLUDED.over_3_5_cards_prob,
        over_4_5_cards_prob=EXCLUDED.over_4_5_cards_prob,
        updated_at=NOW()
    `, [
      match.id,
      expectedHomeGoals,
      expectedAwayGoals,
      expectedGoals,
      expectedCorners,
      expectedCards,
      probabilityThreshold(expectedGoals, 1.5),
      probabilityThreshold(expectedGoals, 2.5),
      probabilityThreshold(avg([expectedHomeGoals, expectedAwayGoals]) * 2, 1.2),
      probabilityThreshold(expectedCorners, 8.5),
      probabilityThreshold(expectedCorners, 9.5),
      probabilityThreshold(expectedCards, 3.5),
      probabilityThreshold(expectedCards, 4.5)
    ]);
  }
}

function avg(values) {
  const filtered = values.filter(v => Number.isFinite(v));
  if (!filtered.length) return 0;
  return round2(filtered.reduce((a, b) => a + b, 0) / filtered.length);
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function probabilityThreshold(expected, line) {
  const diff = expected - line;
  const raw = 50 + diff * 18;
  return Math.max(5, Math.min(95, round2(raw)));
}
