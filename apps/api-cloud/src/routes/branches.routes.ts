import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, checkPermission, AuthenticatedRequest, logActivity } from '../middleware/auth';
import { PERMISSIONS } from '@photobox/shared';

export const branchesRouter = Router();

// GET /api/branches — List all branches with device, user, and design counts
branchesRouter.get('/', authenticateToken, checkPermission(PERMISSIONS.BRANCH_VIEW), async (_req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        devices: true,
        users: {
          select: { id: true, username: true, role: { select: { name: true } }, isActive: true },
        },
        frameDesigns: {
          select: { id: true, name: true, isActive: true },
        },
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: branches });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memuat data cabang.' });
  }
});

// POST /api/branches — Create a new branch
branchesRouter.post('/', authenticateToken, checkPermission(PERMISSIONS.BRANCH_CREATE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, address } = req.body;
    if (!name || name.trim() === '') {
      res.status(400).json({ success: false, error: 'Nama cabang wajib diisi.' });
      return;
    }

    const branch = await prisma.branch.create({
      data: {
        name: name.trim(),
        address: address ? address.trim() : '',
        isActive: true,
      },
    });

    await logActivity({
      userId: req.user!.userId,
      branchId: branch.id,
      action: 'BRANCH_CREATE',
      resource: 'branch',
      resourceId: branch.id,
      details: `Menambah cabang baru: "${branch.name}"`,
    });

    res.status(201).json({ success: true, data: branch });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal membuat cabang baru.' });
  }
});

// PUT /api/branches/:id — Update branch details or toggle active status
branchesRouter.put('/:id', authenticateToken, checkPermission(PERMISSIONS.BRANCH_UPDATE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const branchId = Number(req.params.id);
    const { name, address, isActive } = req.body;

    const existing = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Cabang tidak ditemukan.' });
      return;
    }

    const updated = await prisma.branch.update({
      where: { id: branchId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(address !== undefined && { address: address.trim() }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    await logActivity({
      userId: req.user!.userId,
      branchId: updated.id,
      action: 'BRANCH_UPDATE',
      resource: 'branch',
      resourceId: updated.id,
      details: `Memperbarui data cabang: "${updated.name}" (Status: ${updated.isActive ? 'Aktif' : 'Nonaktif'})`,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memperbarui data cabang.' });
  }
});

// DELETE /api/branches/:id — Delete branch
branchesRouter.delete('/:id', authenticateToken, checkPermission(PERMISSIONS.BRANCH_DELETE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const branchId = Number(req.params.id);

    const existing = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { _count: { select: { transactions: true } } },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Cabang tidak ditemukan.' });
      return;
    }

    // Jika sudah ada data transaksi, nonaktifkan (soft delete) demi menjaga integritas data keuangan
    if (existing._count.transactions > 0) {
      await prisma.branch.update({
        where: { id: branchId },
        data: { isActive: false },
      });

      await logActivity({
        userId: req.user!.userId,
        branchId: existing.id,
        action: 'BRANCH_DEACTIVATE',
        resource: 'branch',
        resourceId: existing.id,
        details: `Menonaktifkan cabang "${existing.name}" (memiliki ${existing._count.transactions} riwayat transaksi)`,
      });

      res.json({
        success: true,
        message: `Cabang dinonaktifkan karena memiliki ${existing._count.transactions} transaksi riwayat.`,
      });
      return;
    }

    // Hapus relasi dependensi sebelum menghapus cabang
    await prisma.device.deleteMany({ where: { branchId } });
    await prisma.user.deleteMany({ where: { branchId } });
    await prisma.frameDesign.deleteMany({ where: { branchId } });
    await prisma.frame.deleteMany({ where: { branchId } });
    await prisma.activityLog.deleteMany({ where: { branchId } });

    await prisma.branch.delete({ where: { id: branchId } });

    await logActivity({
      userId: req.user!.userId,
      branchId: null,
      action: 'BRANCH_DELETE',
      resource: 'branch',
      resourceId: branchId,
      details: `Menghapus cabang "${existing.name}" beserta perangkat terkait`,
    });

    res.json({ success: true, message: 'Cabang berhasil dihapus.' });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({ success: false, error: 'Gagal menghapus cabang.' });
  }
});
