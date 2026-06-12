import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/health', async (_req, res) => {
  const { rows } = await query('SELECT NOW() AS now');
  res.json({ ok: true, now: rows[0].now });
});

router.get('/competitions', async (_req, res) => {
  const { rows } = await query(
    'SELECT * FROM competitions WHERE active = TRUE ORDER BY type, country, name'
  );
  res.json(rows);
});

router.get('/matches', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const competition = req.query.competition || null;
  const params = [date];

  let sql = `
    SELECT m.id, m.match_date, m.kickoff_time, m.status, c.key AS competition_key, c.name AS competition_name,
           th.name AS home_team, ta.name AS away_team,
           m.home_goals, m.away_goals, m.home_corners, m.away_corners,
           m.home_yellow_cards, m.away_yellow_cards, m.home_red_cards, m.away_red_cards,
           f.expected_goals_line, f.expected_corners_line, f.expected_cards_line,
           p.market_goals, p.market_corners, p.market_cards,
           p.confidence_goals, p.confidence_corners, p.confidence_cards
    FROM matches m
    JOIN competitions c ON c.id = m.competition_id
    JOIN teams th ON th.id = m.home_team_id
    JOIN teams ta ON ta.id = m.away_team_id
    LEFT JOIN team_match_features f ON f.match_id = m.id
    LEFT JOIN predictions p ON p.match_id = m.id
    WHERE m.match_date = $1
  `;

  if (competition) {
    params.push(competition);
    sql += ` AND c.key = $2 `;
  }

  sql += ' ORDER BY c.name, m.kickoff_time NULLS LAST, th.name';
  const { rows } = await query(sql, params);
  res.json(rows);
});

router.get('/matches/:id', async (req, res) => {
  const { rows } = await query(`
    SELECT m.*, c.key AS competition_key, c.name AS competition_name, th.name AS home_team, ta.name AS away_team,
           f.expected_goals_line, f.expected_corners_line, f.expected_cards_line,
           p.market_goals, p.market_corners, p.market_cards,
           p.confidence_goals, p.confidence_corners, p.confidence_cards, p.notes
    FROM matches m
    JOIN competitions c ON c.id = m.competition_id
    JOIN teams th ON th.id = m.home_team_id
    JOIN teams ta ON ta.id = m.away_team_id
    LEFT JOIN team_match_features f ON f.match_id = m.id
    LEFT JOIN predictions p ON p.match_id = m.id
    WHERE m.id = $1
  `, [req.params.id]);

  if (!rows.length) return res.status(404).json({ error: 'Match not found' });
  res.json(rows[0]);
});

router.get('/analyze/team', async (req, res) => {
  const team = req.query.team;
  const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
  const venue = req.query.venue || 'all';
  const competition = req.query.competition || null;

  if (!team) {
    return res.status(400).json({ error: 'team query param is required' });
  }

  const params = [team];
  let competitionSql = '';
  if (competition) {
    params.push(competition);
    competitionSql = ` AND c.key = $${params.length} `;
  }

  let venueSql = '';
  if (venue === 'home') venueSql = ' AND th.name = $1 ';
  if (venue === 'away') venueSql = ' AND ta.name = $1 ';

  const matchesSql = `
    SELECT m.id, m.match_date, c.key AS competition_key, c.name AS competition_name,
           th.name AS home_team, ta.name AS away_team,
           m.home_goals, m.away_goals, m.home_corners, m.away_corners,
           m.home_yellow_cards, m.away_yellow_cards, m.home_red_cards, m.away_red_cards,
           CASE WHEN th.name = $1 THEN true ELSE false END AS is_home
    FROM matches m
    JOIN competitions c ON c.id = m.competition_id
    JOIN teams th ON th.id = m.home_team_id
    JOIN teams ta ON ta.id = m.away_team_id
    WHERE (th.name = $1 OR ta.name = $1)
      ${venueSql}
      ${competitionSql}
    ORDER BY m.match_date DESC, m.kickoff_time DESC NULLS LAST
    LIMIT ${limit}
  `;

  const { rows } = await query(matchesSql, params);

  if (!rows.length) {
    return res.status(404).json({ error: 'No matches found for team' });
  }

  const played = rows.length;
  const normalized = rows.map((m) => {
    const goalsFor = m.is_home ? Number(m.home_goals || 0) : Number(m.away_goals || 0);
    const goalsAgainst = m.is_home ? Number(m.away_goals || 0) : Number(m.home_goals || 0);
    const cornersFor = m.is_home ? Number(m.home_corners || 0) : Number(m.away_corners || 0);
    const cornersAgainst = m.is_home ? Number(m.away_corners || 0) : Number(m.home_corners || 0);
    const yellowsFor = m.is_home ? Number(m.home_yellow_cards || 0) : Number(m.away_yellow_cards || 0);
    const yellowsAgainst = m.is_home ? Number(m.away_yellow_cards || 0) : Number(m.home_yellow_cards || 0);
    const redsFor = m.is_home ? Number(m.home_red_cards || 0) : Number(m.away_red_cards || 0);
    const redsAgainst = m.is_home ? Number(m.away_red_cards || 0) : Number(m.home_red_cards || 0);
    const totalGoals = goalsFor + goalsAgainst;
    const totalCorners = cornersFor + cornersAgainst;
    const totalCards = yellowsFor + yellowsAgainst + redsFor + redsAgainst;
    const result = goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D';
    return {
      ...m,
      goalsFor,
      goalsAgainst,
      cornersFor,
      cornersAgainst,
      yellowsFor,
      yellowsAgainst,
      redsFor,
      redsAgainst,
      totalGoals,
      totalCorners,
      totalCards,
      result
    };
  });

  const sum = (fn) => normalized.reduce((acc, item) => acc + fn(item), 0);
  const pct = (count) => Number(((count / played) * 100).toFixed(1));

  const stats = {
    team,
    venue,
    competition: competition || 'ALL',
    sample_size: played,
    averages: {
      goals_for: Number((sum((m) => m.goalsFor) / played).toFixed(2)),
      goals_against: Number((sum((m) => m.goalsAgainst) / played).toFixed(2)),
      total_goals: Number((sum((m) => m.totalGoals) / played).toFixed(2)),
      corners_for: Number((sum((m) => m.cornersFor) / played).toFixed(2)),
      corners_against: Number((sum((m) => m.cornersAgainst) / played).toFixed(2)),
      total_corners: Number((sum((m) => m.totalCorners) / played).toFixed(2)),
      yellows_for: Number((sum((m) => m.yellowsFor) / played).toFixed(2)),
      yellows_against: Number((sum((m) => m.yellowsAgainst) / played).toFixed(2)),
      reds_for: Number((sum((m) => m.redsFor) / played).toFixed(2)),
      total_cards: Number((sum((m) => m.totalCards) / played).toFixed(2))
    },
    percentages: {
      over_0_5_goals: pct(normalized.filter((m) => m.totalGoals > 0.5).length),
      over_1_5_goals: pct(normalized.filter((m) => m.totalGoals > 1.5).length),
      over_2_5_goals: pct(normalized.filter((m) => m.totalGoals > 2.5).length),
      over_3_5_goals: pct(normalized.filter((m) => m.totalGoals > 3.5).length),
      btts: pct(normalized.filter((m) => m.goalsFor > 0 && m.goalsAgainst > 0).length),
      clean_sheet: pct(normalized.filter((m) => m.goalsAgainst === 0).length),
      scored: pct(normalized.filter((m) => m.goalsFor > 0).length),
      win: pct(normalized.filter((m) => m.result === 'W').length),
      draw: pct(normalized.filter((m) => m.result === 'D').length),
      loss: pct(normalized.filter((m) => m.result === 'L').length),
      over_8_5_corners: pct(normalized.filter((m) => m.totalCorners > 8.5).length),
      over_9_5_corners: pct(normalized.filter((m) => m.totalCorners > 9.5).length),
      over_10_5_corners: pct(normalized.filter((m) => m.totalCorners > 10.5).length),
      over_3_5_cards: pct(normalized.filter((m) => m.totalCards > 3.5).length),
      over_4_5_cards: pct(normalized.filter((m) => m.totalCards > 4.5).length),
      over_5_5_cards: pct(normalized.filter((m) => m.totalCards > 5.5).length)
    },
    recent_matches: normalized
  };

  res.json(stats);
});

router.get('/analyze/matchup', async (req, res) => {
  const home = req.query.home;
  const away = req.query.away;
  const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
  const competition = req.query.competition || null;

  if (!home || !away) {
    return res.status(400).json({ error: 'home and away query params are required' });
  }

  const [homeStats, awayStats, h2h] = await Promise.all([
    query(`
      SELECT m.match_date, th.name AS home_team, ta.name AS away_team,
             m.home_goals, m.away_goals, m.home_corners, m.away_corners,
             m.home_yellow_cards, m.away_yellow_cards, m.home_red_cards, m.away_red_cards,
             c.key AS competition_key
      FROM matches m
      JOIN competitions c ON c.id = m.competition_id
      JOIN teams th ON th.id = m.home_team_id
      JOIN teams ta ON ta.id = m.away_team_id
      WHERE th.name = $1
        ${competition ? 'AND c.key = $3' : ''}
      ORDER BY m.match_date DESC
      LIMIT ${limit}
    `, competition ? [home, away, competition] : [home, away]),
    query(`
      SELECT m.match_date, th.name AS home_team, ta.name AS away_team,
             m.home_goals, m.away_goals, m.home_corners, m.away_corners,
             m.home_yellow_cards, m.away_yellow_cards, m.home_red_cards, m.away_red_cards,
             c.key AS competition_key
      FROM matches m
      JOIN competitions c ON c.id = m.competition_id
      JOIN teams th ON th.id = m.home_team_id
      JOIN teams ta ON ta.id = m.away_team_id
      WHERE ta.name = $2
        ${competition ? 'AND c.key = $3' : ''}
      ORDER BY m.match_date DESC
      LIMIT ${limit}
    `, competition ? [home, away, competition] : [home, away]),
    query(`
      SELECT m.match_date, c.key AS competition_key, th.name AS home_team, ta.name AS away_team,
             m.home_goals, m.away_goals, m.home_corners, m.away_corners,
             m.home_yellow_cards, m.away_yellow_cards, m.home_red_cards, m.away_red_cards
      FROM matches m
      JOIN competitions c ON c.id = m.competition_id
      JOIN teams th ON th.id = m.home_team_id
      JOIN teams ta ON ta.id = m.away_team_id
      WHERE (th.name = $1 AND ta.name = $2) OR (th.name = $2 AND ta.name = $1)
      ORDER BY m.match_date DESC
      LIMIT 10
    `, [home, away])
  ]);

  const avg = (rows, field) =>
    rows.length
      ? Number((rows.reduce((a, r) => a + Number(r[field] || 0), 0) / rows.length).toFixed(2))
      : 0;

  const totalAvg = (rows, f1, f2) =>
    rows.length
      ? Number((rows.reduce((a, r) => a + Number(r[f1] || 0) + Number(r[f2] || 0), 0) / rows.length).toFixed(2))
      : 0;

  res.json({
    matchup: {
      home,
      away,
      competition: competition || 'ALL',
      sample_size: limit
    },
    home_form: {
      goals_for_avg: avg(homeStats.rows, 'home_goals'),
      goals_against_avg: avg(homeStats.rows, 'away_goals'),
      corners_for_avg: avg(homeStats.rows, 'home_corners'),
      corners_against_avg: avg(homeStats.rows, 'away_corners'),
      cards_for_avg: Number((avg(homeStats.rows, 'home_yellow_cards') + avg(homeStats.rows, 'home_red_cards')).toFixed(2)),
      total_goals_avg: totalAvg(homeStats.rows, 'home_goals', 'away_goals')
    },
    away_form: {
      goals_for_avg: avg(awayStats.rows, 'away_goals'),
      goals_against_avg: avg(awayStats.rows, 'home_goals'),
      corners_for_avg: avg(awayStats.rows, 'away_corners'),
      corners_against_avg: avg(awayStats.rows, 'home_corners'),
      cards_for_avg: Number((avg(awayStats.rows, 'away_yellow_cards') + avg(awayStats.rows, 'away_red_cards')).toFixed(2)),
      total_goals_avg: totalAvg(awayStats.rows, 'home_goals', 'away_goals')
    },
    expected_ranges: {
      goals: Number((
        ((avg(homeStats.rows, 'home_goals') + avg(awayStats.rows, 'away_goals')) / 2) +
        ((avg(homeStats.rows, 'away_goals') + avg(awayStats.rows, 'home_goals')) / 2)
      ).toFixed(2)),
      corners: Number((
        ((avg(homeStats.rows, 'home_corners') + avg(awayStats.rows, 'away_corners')) / 2) +
        ((avg(homeStats.rows, 'away_corners') + avg(awayStats.rows, 'home_corners')) / 2)
      ).toFixed(2)),
      cards: Number((
        ((avg(homeStats.rows, 'home_yellow_cards') + avg(awayStats.rows, 'away_yellow_cards')) / 2) +
        ((avg(homeStats.rows, 'home_red_cards') + avg(awayStats.rows, 'away_red_cards')) / 2)
      ).toFixed(2))
    },
    h2h: h2h.rows
  });
});

export default router;
