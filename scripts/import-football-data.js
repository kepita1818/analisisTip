import dotenv from 'dotenv';
import { loadCompetitions, ensureCompetition, ensureSeason, ensureTeam, fetchCsv, upsertMatch } from './helpers.js';

dotenv.config();

function buildSeasonCodes(yearsBack) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const seasons = [];
  for (let i = 0; i < yearsBack; i++) {
    const start = currentYear - i - 1;
    const end = String((start + 1) % 100).padStart(2, '0');
    seasons.push({ label: `${start}-${end}`, code: `${String(start).slice(2)}${end}` });
  }
  return seasons;
}

function parseDate(value) {
  if (!value) return null;
  const parts = value.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return value;
}

function parseInteger(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function importFootballData({ daily = false } = {}) {
  const competitions = loadCompetitions().filter(c => c.source === 'football-data');
  const years = Number(process.env.IMPORT_YEARS || 10);
  const seasons = daily ? buildSeasonCodes(2) : buildSeasonCodes(years);

  for (const comp of competitions) {
    const competition = await ensureCompetition(comp);

    for (const season of seasons) {
      const url = `https://www.football-data.co.uk/mmz4281/${season.code}/${comp.code}.csv`;
      try {
        const rows = await fetchCsv(url);
        const seasonRow = await ensureSeason(competition.id, season.label);

        for (const row of rows) {
          const home = await ensureTeam(row.HomeTeam, comp.country, comp.type);
          const away = await ensureTeam(row.AwayTeam, comp.country, comp.type);

          await upsertMatch({
            external_id: `${comp.key}-${season.label}-${row.Date}-${row.HomeTeam}-${row.AwayTeam}`,
            competition_id: competition.id,
            season_id: seasonRow.id,
            match_date: parseDate(row.Date),
            kickoff_time: row.Time || null,
            home_team_id: home.id,
            away_team_id: away.id,
            status: row.FTHG !== '' && row.FTHG !== undefined ? 'finished' : 'scheduled',
            round_label: row.Round || null,
            home_goals: parseInteger(row.FTHG),
            away_goals: parseInteger(row.FTAG),
            ht_home_goals: parseInteger(row.HTHG),
            ht_away_goals: parseInteger(row.HTAG),
            home_shots: parseInteger(row.HS),
            away_shots: parseInteger(row.AS),
            home_shots_on_target: parseInteger(row.HST),
            away_shots_on_target: parseInteger(row.AST),
            home_corners: parseInteger(row.HC),
            away_corners: parseInteger(row.AC),
            home_yellow_cards: parseInteger(row.HY),
            away_yellow_cards: parseInteger(row.AY),
            home_red_cards: parseInteger(row.HR),
            away_red_cards: parseInteger(row.AR),
            referee: row.Referee || null,
            venue: null
          });
        }
      } catch (error) {
        console.warn(`Skipped ${comp.key} ${season.label}: ${error.message}`);
      }
    }
  }
}

if (process.argv[1].includes('import-football-data.js')) {
  importFootballData({ daily: process.argv.includes('--daily') })
    .then(() => {
      console.log('football-data import finished');
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
