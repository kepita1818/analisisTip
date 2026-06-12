import { recalculateUpcomingFeatures } from '../src/services/featureService.js';

recalculateUpcomingFeatures(14)
  .then(() => {
    console.log('Feature recalculation completed');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
