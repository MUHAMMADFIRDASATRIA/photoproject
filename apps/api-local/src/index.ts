import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { kioskRouter } from './routes/kiosk.routes';

dotenv.config({ override: true });

const app = express();
const PORT = 4000;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

/**
 * Allowlist origin CORS. Kiosk berjalan pada localhost:3000 (dev) / file:// (Electron).
 * Set CORS_ORIGINS pada production, mis. "https://kiosk.photobox.id".
 */
const defaultDevOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const origins = allowedOrigins.length > 0 ? allowedOrigins : isProd ? [] : defaultDevOrigins;

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  })
);
app.use(
  cors({
    origin(origin, callback) {
      // Origin kosong = file:// (Electron produksi) / request non-browser.
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin tidak diizinkan oleh kebijakan CORS.'));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));

// CATATAN KEAMANAN: folder uploads TIDAK lagi di-serve sebagai static.
// Foto pelanggan hanya bisa diakses lewat endpoint bertanda tangan
// (GET /api/kiosk/photos/:id/download?token=...&exp=...).

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'photobox-api-local', time: new Date() });
});

// Rate limiting endpoint otentikasi device (anti brute-force).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Terlalu banyak percobaan login device. Coba lagi dalam beberapa menit.' },
});
app.use('/api/kiosk/login-device', loginLimiter);

// Langkah penyelesaian transaksi menulis file ke disk — batasi laju agar tidak
// mudah dipakai mengisi disk (DoS) via request berulang.
const completeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Terlalu banyak permintaan penyelesaian transaksi. Coba lagi nanti.' },
});
app.use('/api/kiosk/transactions/:id/complete', completeLimiter);

// Kiosk routes
app.use('/api/kiosk', kioskRouter);

app.listen(PORT, () => {
  console.log(`🚀 [API Local - Kiosk Backend] Running on http://localhost:${PORT}`);
});
