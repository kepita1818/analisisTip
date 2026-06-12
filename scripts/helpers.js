import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import { query } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadCompetitions() {
  const file = path.join(__dirname, '..', 'config', 'competitions.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function normalizeName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function ensureCompetition(comp) {
  const { rows } = await query(`
    INSERT INTO competitions (key, name, country, type, source, source_code)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (key) DO UPDATE SET
      name = EXCLUDED.name,
      country = EXCLUDED.country,
      type = EXCLUDED.type,
      source = EXCLUDED.source,
      source_code = EXCLUDED.source_code
    RETURNING *
  `, [comp.key, comp.name, comp.country, comp.type, comp.source, comp.code]);
  return rows[0];
}

export async function ensureSeason(competitionId, seasonLabel) {
  const parts = seasonLabel.includes('-') ? seasonLabel.split('-') : [seasonLabel, String(Number(seasonLabel) + 1)];
  const startYear = Number(parts[0]);
  const endYear = Number(parts[1].length === 2 ? `${String(startYear).slice(0,2)}${parts[1]}` : parts[1]);

  const { rows } = await query(`
    INSERT INTO seasons (competition_id, season_label, start_year, end_year)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (competition_id, season_label) DO UPDATE SET start_year = EXCLUDED.start_year, end_year = EXCLUDED.end_year
    RETURNING *
  `, [competitionId, seasonLabel, startYear, endYear]);
  return rows[0];
}

export async function ensureTeam(name, country = null, teamType = 'club') {
  const normalized = normalizeName(name);
  const { rows } = await query(`
    INSERT INTO teams (name, normalized_name, country, team_type)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (normalized_name) DO UPDATE SET name = EXCLUDED.name, country = COALESCE(EXCLUDED.country, teams.country), team_type = EXCLUDED.team_type
    RETURNING *
  `, [name, normalized, country, teamType]);
  return rows[0];
}

export async function fetchCsv(url) {
  const response = await axios.get(url, { timeout: 30000, responseType: 'text' });
  return parse(response.data, { columns: true, skip_empty_lines: true });
}

export async function upsertMatch(payload) {
  await query(`
    INSERT INTO matches (
      external_id, competition_id, season_id, match_date, kickoff_time, home_team_id, away_team_id, status,
      round_label, home_goals, away_goals, ht_home_goals, ht_away_goals,
      home_shots, away_shots, home_shots_on_target, away_shots_on_target,
      home_corners, away_corners, home_yellow_cards, away_yellow_cards, home_red_cards, away_red_cards,
      referee, venue, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,
      $9,$10,$11,$12,$13,
      $14,$15,$16,$17,
      $18,$19,$20,$21,$22,$23,
      $24,$25,NOW()
    )
    ON CONFLICT (external_id) DO UPDATE SET
      competition_id = EXCLUDED.competition_id,
      season_id = EXCLUDED.season_id,
      match_date = EXCLUDED.match_date,
      kickoff_time = EXCLUDED.kickoff_time,
      home_team_id = EXCLUDED.home_team_id,
      away_team_id = EXCLUDED.away_team_id,
      status = EXCLUDED.status,
      round_label = EXCLUDED.round_label,
      home_goals = EXCLUDED.home_goals,
      away_goals = EXCLUDED.away_goals,
      ht_home_goals = EXCLUDED.ht_home_goals,
      ht_away_goals = EXCLUDED.ht_away_goals,
      home_shots = EXCLUDED.home_shots,
      away_shots = EXCLUDED.away_shots,
      home_shots_on_target = EXCLUDED.home_shots_on_target,
      away_shots_on_target = EXCLUDED.away_shots_on_target,
      home_corners = EXCLUDED.home_corners,
      away_corners = EXCLUDED.away_corners,
      home_yellow_cards = EXCLUDED.home_yellow_cards,
      away_yellow_cards = EXCLUDED.away_yellow_cards,
      home_red_cards = EXCLUDED.home_red_cards,
      away_red_cards = EXCLUDED.away_red_cards,
      referee = EXCLUDED.referee,
      venue = EXCLUDED.venue,
      updated_at = NOW()
  `, [
    payload.external_id,
    payload.competition_id,
    payload.season_id,
    payload.match_date,
    payload.kickoff_time,
    payload.home_team_id,
    payload.away_team_id,
    payload.status,
    payload.round_label,
    payload.home_goals,
    payload.away_goals,
    payload.ht_home_goals,
    payload.ht_away_goals,
    payload.home_shots,
    payload.away_shots,
    payload.home_shots_on_target,
    payload.away_shots_on_target,
    payload.home_corners,
    payload.away_corners,
    payload.home_yellow_cards,
    payload.away_yellow_cards,
    payload.home_red_cards,
    payload.away_red_cards,
    payload.referee,
    payload.venue
  ]);
}
