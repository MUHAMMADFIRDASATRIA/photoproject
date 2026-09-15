import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { kioskRouter } from './routes/kiosk.routes';

dotenv.config({ override: true });

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Static uploads serving
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'photobox-api-local', time: new Date() });
});

// Kiosk routes
app.use('/api/kiosk', kioskRouter);

app.listen(PORT, () => {
  console.log(`🚀 [API Local - Kiosk Backend] Running on http://localhost:${PORT}`);
});
