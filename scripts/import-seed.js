import dotenv from 'dotenv';
import { importFootballData } from './import-football-data.js';
import { recalculateUpcomingFeatures } from '../src/services/featureService.js';

dotenv.config();

const SEED_COMPETITIONS = ['ENG1', 'ESP1', 'ITA1'];
const SEED_YEARS = Number(process.env.IMPORT_YEARS || 3);

async function run() {
  await importFootballData({ competitionsFilter: SEED_COMPETITIONS, years: SEED_YEARS });
  await recalculateUpcomingFeatures(14);
  console.log('Seed import completed');
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
