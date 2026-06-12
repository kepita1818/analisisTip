import dotenv from 'dotenv';
import { query } from '../src/db.js';
import { importFootballData } from './import-football-data.js';
import { importInternationals } from './import-internationals.js';
import { recalculateUpcomingFeatures } from '../src/services/featureService.js';

dotenv.config();

async function ensureSchema() {
  await query('SELECT 1');
}

async function run() {
  const daily = process.argv.includes('--daily');
  await ensureSchema();
  await importFootballData({ daily });
  await importInternationals();
  await recalculateUpcomingFeatures(14);
  console.log('All imports and recalculations completed');
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
