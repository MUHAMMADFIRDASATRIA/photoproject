import express from 'express';
import cors from 'cors';
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// Serve uploaded files sebagai static assets
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'photobox-api-cloud', time: new Date() });
});

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

app.listen(PORT, () => {
  console.log(`🚀 [API Cloud] Running on http://localhost:${PORT}`);
});
