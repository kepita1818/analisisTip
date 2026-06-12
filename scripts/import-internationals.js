import axios from 'axios';
import dotenv from 'dotenv';
import { ensureCompetition, ensureSeason, ensureTeam, upsertMatch } from './helpers.js';

dotenv.config();

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inside = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inside = !inside;
    else if (char === ',' && !inside) {
      out.push(current);
      current = '';
    } else current += char;
  }
  out.push(current);
  return out.map(v => v.replace(/^"|"$/g, ''));
}

export async function importInternationals() {
  const competition = await ensureCompetition({
    key: 'INTL',
    name: 'International Matches',
    country: 'International',
    type: 'national_team',
    source: 'internationals',
    code: 'intl'
  });

  const url = 'https://raw.githubusercontent.com/martj42/international_results/master/results.csv';
  const response = await axios.get(url, { timeout: 30000, responseType: 'text' });
  const lines = response.data.split('\n').filter(Boolean);
  lines.shift();

  for (const line of lines) {
    const [date, homeName, awayName, homeScore, awayScore, tournament, city, country, neutral] = parseCsvLine(line);
    const year = Number(date.slice(0, 4));
    if (year < new Date().getUTCFullYear() - Number(process.env.IMPORT_YEARS || 10)) continue;

    const season = await ensureSeason(competition.id, String(year));
    const home = await ensureTeam(homeName, country || 'International', 'national_team');
    const away = await ensureTeam(awayName, country || 'International', 'national_team');

    await upsertMatch({
      external_id: `INTL-${date}-${homeName}-${awayName}`,
      competition_id: competition.id,
      season_id: season.id,
      match_date: date,
      kickoff_time: null,
      home_team_id: home.id,
      away_team_id: away.id,
      status: homeScore !== '' ? 'finished' : 'scheduled',
      round_label: tournament || (neutral === 'TRUE' ? 'Neutral' : null),
      home_goals: homeScore === '' ? null : Number(homeScore),
      away_goals: awayScore === '' ? null : Number(awayScore),
      ht_home_goals: null,
      ht_away_goals: null,
      home_shots: null,
      away_shots: null,
      home_shots_on_target: null,
      away_shots_on_target: null,
      home_corners: null,
      away_corners: null,
      home_yellow_cards: null,
      away_yellow_cards: null,
      home_red_cards: null,
      away_red_cards: null,
      referee: null,
      venue: city ? `${city}, ${country}` : country
    });
  }
}

if (process.argv[1].includes('import-internationals.js')) {
  importInternationals()
    .then(() => {
      console.log('international matches import finished');
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
