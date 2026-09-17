import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { branchesRouter } from './routes/branches.routes';
import { usersRouter } from './routes/users.routes';
import { rolesRouter } from './routes/roles.routes';
import { framesRouter } from './routes/frames.routes';
import { designsRouter } from './routes/designs.routes';
import { uploadsRouter } from './routes/uploads.routes';
import { syncRouter } from './routes/sync.routes';
import { settingsRouter } from './routes/settings.routes';
import { activityLogsRouter } from './routes/activity-logs.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;
const isProd = process.env.NODE_ENV === 'production';

// Percaya reverse-proxy (mis. Nginx) agar protokol/IP asli terbaca saat HTTPS.
app.set('trust proxy', 1);

/**
 * Allowlist origin CORS. Set CORS_ORIGINS (dipisah koma) pada production,
 * mis.: CORS_ORIGINS="https://admin.photobox.id,https://kiosk.photobox.id"
 */
const defaultDevOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
];
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const origins = allowedOrigins.length > 0 ? allowedOrigins : isProd ? [] : defaultDevOrigins;

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // Origin kosong = request server-to-server / file:// / curl → izinkan.
    if (!origin || origins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin tidak diizinkan oleh kebijakan CORS.'));
  },
  credentials: true,
};

// Header keamanan (CSP dimatikan karena API tidak menyajikan halaman aplikasi).
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  })
);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

// Serve uploaded design assets (read-only) dengan hardening: hanya berkas
// gambar yang dilayani, tanpa directory index, tanpa dotfiles, plus header
// keamanan agar tidak bisa dieksekusi sebagai skrip.
const uploadsDir = path.resolve(__dirname, '../uploads');
app.use(
  '/uploads',
  (req, res, next) => {
    if (!/\.(png|jpe?g|webp)$/i.test(req.path)) {
      res.status(404).json({ success: false, error: 'Berkas tidak ditemukan.' });
      return;
    }
    next();
  },
  express.static(uploadsDir, {
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  })
);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'photobox-api-cloud', time: new Date() });
});

// Rate limiting pada endpoint otentikasi (anti brute-force / credential stuffing).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20, // maksimal 20 percobaan per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Terlalu banyak percobaan. Silakan coba lagi dalam beberapa menit.' },
});
app.use('/api/auth/login', authLimiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/branches', branchesRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/frames', framesRouter);
app.use('/api/designs', designsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/activity-logs', activityLogsRouter);

// Error handler: ubah error multer menjadi JSON agar frontend mendapat pesan jelas
// (bukan HTML 500 standar Express yang membuat UI menampilkan pesan generik).
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ success: false, error: 'File terlalu besar. Maksimal ukuran file 20 MB.' });
    } else {
      res.status(400).json({ success: false, error: err.message });
    }
    return;
  }
  if (err?.message && String(err.message).startsWith('Hanya file gambar')) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }
  if (err?.message === 'Origin tidak diizinkan oleh kebijakan CORS.') {
    res.status(403).json({ success: false, error: err.message });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
});

app.listen(PORT, () => {
  console.log(`🚀 [API Cloud] Running on http://localhost:${PORT}`);
});
