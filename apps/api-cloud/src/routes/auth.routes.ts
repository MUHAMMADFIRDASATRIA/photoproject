import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthenticatedRequest, logActivity } from '../middleware/auth';
import { JwtPayload } from '@photobox/shared';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * POST /api/auth/login
 * Sesuai CLAUDE.md §4: JWT payload menyimpan daftar permission user (bukan cuma role_id)
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Username dan password wajib diisi.' });
      return;
    }

    // Cari user beserta role dan daftar permissions-nya
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        branch: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Username atau password salah, atau akun nonaktif.' });
      return;
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, error: 'Username atau password salah.' });
      return;
    }

    // Ekstrak permission codes
    const permissions = user.role.permissions.map((rp) => rp.permission.code);

    const payload: JwtPayload = {
      userId: user.id,
      roleId: user.roleId,
      branchId: user.branchId,
      permissions,
    };

    // Generate JWT token (berlaku 7 hari untuk kemudahan operasional)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // Catat log aktivitas login
    await logActivity({
      userId: user.id,
      branchId: user.branchId,
      action: 'LOGIN',
      resource: 'auth',
      resourceId: user.id,
      details: `User ${user.username} berhasil login ke Web Dashboard`,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          roleId: user.roleId,
          roleName: user.role.name,
          branchId: user.branchId,
          branchName: user.branch?.name ?? null,
          permissions,
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server saat login.' });
  }
});

/**
 * GET /api/auth/me
 * Mendapatkan detail profile & permission user yang sedang login
 */
authRouter.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        branch: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'User tidak ditemukan atau nonaktif.' });
      return;
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.code);

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        roleId: user.roleId,
        roleName: user.role.name,
        branchId: user.branchId,
        branchName: user.branch?.name ?? null,
        permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal mengambil data user.' });
  }
});
