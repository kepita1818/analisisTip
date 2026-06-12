import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { query } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadCompetitions() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../config/competitions.json'), 'utf8'));
}

export async function upsertCompetition(comp, type) {
  const result = await query(`
    INSERT INTO competitions (key, name, slug, country, competition_type, tier, source, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
    ON CONFLICT (key) DO UPDATE SET
      name=EXCLUDED.name,
      slug=EXCLUDED.slug,
      country=EXCLUDED.country,
      competition_type=EXCLUDED.competition_type,
      tier=EXCLUDED.tier,
      source=EXCLUDED.source,
      updated_at=NOW()
    RETURNING id
  `, [comp.key, comp.name, comp.slug, comp.country, type, comp.tier || null, comp.source || null]);
  return result.rows[0].id;
}

export async function upsertSeason(competitionId, seasonLabel) {
  const years = seasonLabel.match(/(\d{4})/g) || [];
  const startYear = years[0] ? Number(years[0]) : null;
  const endYear = years[1] ? Number(years[1]) : startYear;
  const result = await query(`
    INSERT INTO seasons (competition_id, season_label, season_start_year, season_end_year)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (competition_id, season_label) DO UPDATE SET
      season_start_year=EXCLUDED.season_start_year,
      season_end_year=EXCLUDED.season_end_year
    RETURNING id
  `, [competitionId, seasonLabel, startYear, endYear]);
  return result.rows[0].id;
}

export async function upsertTeam(name, country = null, isNationalTeam = false) {
  const slug = slugify(name);
  const result = await query(`
    INSERT INTO teams (name, slug, country, is_national_team)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (name, is_national_team) DO UPDATE SET
      slug=EXCLUDED.slug,
      country=COALESCE(EXCLUDED.country, teams.country)
    RETURNING id
  `, [name, slug, country, isNationalTeam]);
  return result.rows[0].id;
}

export async function fetchJson(url) {
  const { data } = await axios.get(url, { timeout: 30000 });
  return data;
}

export function lastTenSeasonLabels() {
  const currentYear = new Date().getFullYear();
  const labels = [];
  for (let i = 0; i < 10; i++) {
    const start = currentYear - i - 1;
    const end = currentYear - i;
    labels.push(`${start}-${end}`);
  }
  return labels.reverse();
}

export function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
