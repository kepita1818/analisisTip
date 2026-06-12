import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/health', async (_req, res) => {
  const { rows } = await query('SELECT NOW() AS now');
  res.json({ ok: true, now: rows[0].now });
});

router.get('/competitions', async (_req, res) => {
  const { rows } = await query('SELECT * FROM competitions WHERE active = TRUE ORDER BY type, country, name');
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
    SELECT m.*, c.name AS competition_name, th.name AS home_team, ta.name AS away_team,
           f.*, p.market_goals, p.market_corners, p.market_cards,
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

export default router;
