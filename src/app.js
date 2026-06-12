import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import matchRoutes from './routes/matches.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

const app = express();

app.use(express.json());
app.use(express.static(publicDir));
app.use('/api', matchRoutes);

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'match-center.html'));
});

app.get('/match-center', (_req, res) => {
  res.sendFile(path.join(publicDir, 'match-center.html'));
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'football-db-app'
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'Route not found',
    available_pages: ['/', '/match-center'],
    available_api_endpoints: [
      '/api/health',
      '/api/competitions',
      '/api/matches?date=YYYY-MM-DD',
      '/api/matches/:id'
    ]
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Static files served from: ${publicDir}`);
});
