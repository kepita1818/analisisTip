import dotenv from 'dotenv';
import { importFootballData } from './import-football-data.js';
import { recalculateUpcomingFeatures } from '../src/services/featureService.js';

dotenv.config();

const DAILY_COMPETITIONS = ['ENG1', 'ENG2', 'ESP1', 'ESP2', 'ITA1', 'ITA2', 'GER1', 'GER2', 'FRA1', 'FRA2', 'POR1', 'NED1'];

async function run() {
  await importFootballData({ competitionsFilter: DAILY_COMPETITIONS, years: 2 });
  await recalculateUpcomingFeatures(14);
  console.log('Daily import completed');
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
