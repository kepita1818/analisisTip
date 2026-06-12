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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
