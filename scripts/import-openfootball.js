import { query } from '../src/db.js';
import { loadCompetitions, upsertCompetition, upsertSeason, upsertTeam, fetchJson, lastTenSeasonLabels } from './shared.js';

const BASES = {
  'eng.1': 'https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/en.1.json',
  'eng.2': 'https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/en.2.json',
  'esp.1': 'https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/es.1.json',
  'esp.2': 'https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/es.2.json',
  'ger.1': 'https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/de.1.json',
  'ger.2': 'https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/de.2.json',
  'ita.1': 'https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/it.1.json',
  'ita.2': 'https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/it.2.json',
  'fra.1': 'https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/fr.1.json',
  'fra.2': 'https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/fr.2.json',
  'por.1': 'https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/pt.1.json',
  'ned.1': 'https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/nl.1.json'
};

function seasonToFolder(label) {
  const [a, b] = label.split('-');
  return `${a}-${String(b).slice(-2)}`;
}

function buildUrl(compKey, seasonLabel) {
  const folder = seasonToFolder(seasonLabel);
  const map = {
    'eng.1': 'en.1', 'eng.2': 'en.2', 'esp.1': 'es.1', 'esp.2': 'es.2',
    'ger.1': 'de.1', 'ger.2': 'de.2', 'ita.1': 'it.1', 'ita.2': 'it.2',
    'fra.1': 'fr.1', 'fra.2': 'fr.2', 'por.1': 'pt.1', 'ned.1': 'nl.1'
  };
  const code = map[compKey];
  if (!code) return null;
  return `https://raw.githubusercontent.com/openfootball/football.json/master/${folder}/${code}.json`;
}

async function importCompetition(comp) {
  const competitionId = await upsertCompetition(comp, 'club');
  for (const seasonLabel of lastTenSeasonLabels()) {
    const url = buildUrl(comp.key, seasonLabel);
    if (!url) continue;
    try {
      const data = await fetchJson(url);
      const seasonId = await upsertSeason(competitionId, seasonLabel);
      const rounds = data.rounds || [];
      for (const round of rounds) {
        for (const match of round.matches || []) {
          const homeTeamId = await upsertTeam(match.team1, comp.country, false);
          const awayTeamId = await upsertTeam(match.team2, comp.country, false);
          const score = match.score?.ft || match.score || {};
          const scoreHt = match.score?.ht || {};
          const sourceMatchId = `${comp.key}:${seasonLabel}:${round.name}:${match.team1}:${match.team2}:${match.date}`;
          await query(`
            INSERT INTO matches (
              source_match_id, competition_id, season_id, match_date, kickoff_time, status, round_name,
              home_team_id, away_team_id, home_score, away_score, home_score_ht, away_score_ht, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
            ON CONFLICT (source_match_id) DO UPDATE SET
              match_date=EXCLUDED.match_date,
              kickoff_time=EXCLUDED.kickoff_time,
              status=EXCLUDED.status,
              home_score=EXCLUDED.home_score,
              away_score=EXCLUDED.away_score,
              home_score_ht=EXCLUDED.home_score_ht,
              away_score_ht=EXCLUDED.away_score_ht,
              updated_at=NOW()
          `, [
            sourceMatchId,
            competitionId,
            seasonId,
            match.date || null,
            match.time || null,
            score?.team1 != null && score?.team2 != null ? 'finished' : 'scheduled',
            round.name || null,
            homeTeamId,
            awayTeamId,
            score?.team1 ?? null,
            score?.team2 ?? null,
            scoreHt?.team1 ?? null,
            scoreHt?.team2 ?? null
          ]);
        }
      }
      console.log(`Imported ${comp.name} ${seasonLabel}`);
    } catch (error) {
      console.log(`Skipped ${comp.name} ${seasonLabel}: ${error.message}`);
    }
  }
}

async function main() {
  const competitions = loadCompetitions().club.filter(c => c.source === 'openfootball');
  for (const comp of competitions) await importCompetition(comp);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
