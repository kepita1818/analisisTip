import express from 'express';
import dotenv from 'dotenv';
import matchRoutes from './routes/matches.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api', matchRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: 'football-db-app',
    message: 'Backend running with PostgreSQL-only football data',
    endpoints: ['/api/health', '/api/competitions', '/api/matches?date=YYYY-MM-DD', '/api/matches/:id']
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
