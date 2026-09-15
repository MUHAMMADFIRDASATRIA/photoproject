import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authenticateToken, checkPermission, AuthenticatedRequest, logActivity } from '../middleware/auth';
import { PERMISSIONS } from '@photobox/shared';

export const usersRouter = Router();

// GET /api/users — List all users with role and branch relations
usersRouter.get('/', authenticateToken, checkPermission(PERMISSIONS.USER_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roleId, branchId } = req.query;

    const where: any = {};
    if (roleId) where.roleId = Number(roleId);
    if (branchId) where.branchId = Number(branchId);

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        roleId: true,
        branchId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { id: true, name: true, description: true } },
        branch: { select: { id: true, name: true, address: true } },
      },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memuat data pengguna.' });
  }
});

// POST /api/users — Create user (Admin cabang / Kiosk device / Superadmin)
usersRouter.post('/', authenticateToken, checkPermission(PERMISSIONS.USER_CREATE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password, roleId, branchId } = req.body;
    if (!username || !password || !roleId) {
      res.status(400).json({ success: false, error: 'Username, password, dan role wajib diisi.' });
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { username: trimmedUsername } });
    if (existingUser) {
      res.status(400).json({ success: false, error: 'Username sudah digunakan oleh akun lain.' });
      return;
    }

    const role = await prisma.role.findUnique({ where: { id: Number(roleId) } });
    if (!role) {
      res.status(400).json({ success: false, error: 'Role tidak valid.' });
      return;
    }

    // Role admin & user wajib memilih branch
    if (role.name !== 'superadmin' && !branchId) {
      res.status(400).json({ success: false, error: 'Akun Admin Cabang atau Device Kiosk wajib di-assign ke suatu cabang.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username: trimmedUsername,
        password: passwordHash,
        roleId: Number(roleId),
        branchId: role.name === 'superadmin' ? null : Number(branchId),
        isActive: true,
      },
      include: { role: true, branch: true },
    });

    await logActivity({
      userId: req.user!.userId,
      branchId: newUser.branchId,
      action: 'USER_CREATE',
      resource: 'user',
      resourceId: newUser.id,
      details: `Membuat akun baru: "${newUser.username}" (Role: ${newUser.role.name}, Cabang: ${newUser.branch?.name ?? 'Global'})`,
    });

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role.name,
        roleId: newUser.roleId,
        branchId: newUser.branchId,
        branch: newUser.branch?.name ?? null,
        isActive: newUser.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal membuat pengguna baru.' });
  }
});

// PUT /api/users/:id — Update user profile & status
usersRouter.put('/:id', authenticateToken, checkPermission(PERMISSIONS.USER_UPDATE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { username, roleId, branchId, isActive } = req.body;

    const existing = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
      return;
    }

    // Mencegah penonaktifan akun superadmin utama
    if (existing.username === 'superadmin' && isActive === false) {
      res.status(400).json({ success: false, error: 'Akun superadmin utama tidak dapat dinonaktifkan.' });
      return;
    }

    const updateData: any = {};
    if (username) updateData.username = username.trim().toLowerCase();
    if (roleId) updateData.roleId = Number(roleId);
    if (branchId !== undefined) updateData.branchId = branchId ? Number(branchId) : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { role: true, branch: true },
    });

    await logActivity({
      userId: req.user!.userId,
      branchId: updated.branchId,
      action: 'USER_UPDATE',
      resource: 'user',
      resourceId: updated.id,
      details: `Memperbarui akun: "${updated.username}" (Status: ${updated.isActive ? 'Aktif' : 'Nonaktif'})`,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memperbarui data pengguna.' });
  }
});

// PUT /api/users/:id/password — Reset user password
usersRouter.put('/:id/password', authenticateToken, checkPermission(PERMISSIONS.USER_UPDATE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'Password baru minimal 6 karakter.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    await logActivity({
      userId: req.user!.userId,
      branchId: existing.branchId,
      action: 'USER_PASSWORD_RESET',
      resource: 'user',
      resourceId: existing.id,
      details: `Mereset password akun "${existing.username}"`,
    });

    res.json({ success: true, message: `Password akun ${existing.username} berhasil direset.` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal mereset password pengguna.' });
  }
});

// DELETE /api/users/:id — Delete user
usersRouter.delete('/:id', authenticateToken, checkPermission(PERMISSIONS.USER_DELETE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
      return;
    }

    if (existing.username === 'superadmin') {
      res.status(400).json({ success: false, error: 'Akun superadmin utama tidak dapat dihapus.' });
      return;
    }

    await logActivity({
      userId: req.user!.userId,
      branchId: existing.branchId,
      action: 'USER_DEACTIVATE',
      resource: 'user',
      resourceId: userId,
      details: `Menonaktifkan akun "${existing.username}"`,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Pengguna berhasil dinonaktifkan.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Gagal menghapus pengguna.' });
  }
});
