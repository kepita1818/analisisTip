import express from 'express';
import { query } from '../db.js';

const router = express.Router();

router.get('/health', async (req, res) => {
  const result = await query('SELECT NOW() AS now');
  res.json({ ok: true, now: result.rows[0].now });
});

router.get('/competitions', async (req, res) => {
  const result = await query('SELECT * FROM competitions ORDER BY competition_type, country, name');
  res.json(result.rows);
});

router.get('/matches/today', async (req, res) => {
  const result = await query(`
    SELECT m.*, hc.name AS home_team, ac.name AS away_team, c.name AS competition_name, p.*
    FROM matches m
    JOIN teams hc ON hc.id = m.home_team_id
    JOIN teams ac ON ac.id = m.away_team_id
    LEFT JOIN competitions c ON c.id = m.competition_id
    LEFT JOIN predictions p ON p.match_id = m.id
    WHERE m.match_date = CURRENT_DATE
    ORDER BY c.name, m.kickoff_time NULLS LAST, hc.name
  `);
  res.json(result.rows);
});

router.get('/matches/:id', async (req, res) => {
  const result = await query(`
    SELECT m.*, hc.name AS home_team, ac.name AS away_team, c.name AS competition_name,
           s.home_corners, s.away_corners, s.total_corners,
           s.home_yellow_cards, s.away_yellow_cards, s.home_red_cards, s.away_red_cards, s.total_cards,
           p.*
    FROM matches m
    JOIN teams hc ON hc.id = m.home_team_id
    JOIN teams ac ON ac.id = m.away_team_id
    LEFT JOIN competitions c ON c.id = m.competition_id
    LEFT JOIN match_stats s ON s.match_id = m.id
    LEFT JOIN predictions p ON p.match_id = m.id
    WHERE m.id = $1
  `, [req.params.id]);

  if (!result.rows.length) return res.status(404).json({ error: 'Match not found' });
  res.json(result.rows[0]);
});

router.get('/teams/:teamId/form', async (req, res) => {
  const { teamId } = req.params;
  const { competitionId, seasonId } = req.query;
  const result = await query(`
    SELECT * FROM team_competition_stats
    WHERE team_id = $1 AND competition_id = $2 AND season_id = $3
  `, [teamId, competitionId, seasonId]);
  res.json(result.rows[0] || null);
});

export default router;
