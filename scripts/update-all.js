import { execSync } from 'child_process';

execSync('node scripts/import-openfootball.js', { stdio: 'inherit' });
execSync('node scripts/import-internationals.js', { stdio: 'inherit' });
execSync('node scripts/recalculate-team-stats.js', { stdio: 'inherit' });
console.log('Update completed');
