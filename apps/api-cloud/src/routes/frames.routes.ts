import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, checkPermission, AuthenticatedRequest, logActivity } from '../middleware/auth';
import { PERMISSIONS } from '@photobox/shared';

export const framesRouter = Router();

/**
 * GET /api/frames
 * List semua master frame
 * - Admin cabang: melihat frame miliknya + frame global (branchId = null)
 * - Superadmin: melihat semua frame atau memfilter per cabang / global
 */
framesRouter.get('/', authenticateToken, checkPermission(PERMISSIONS.FRAME_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userBranchId = req.user?.branchId;
    const { branchId: queryBranchId } = req.query;

    const where: any = {};

    if (userBranchId) {
      // Admin cabang: hanya lihat frame cabangnya + frame global
      where.OR = [{ branchId: userBranchId }, { branchId: null }];
    } else if (queryBranchId && queryBranchId !== 'all') {
      // Superadmin filter
      if (queryBranchId === 'global') {
        where.branchId = null;
      } else {
        where.branchId = Number(queryBranchId);
      }
    }

    const frames = await prisma.frame.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { designs: true, transactions: true } },
      },
      orderBy: { id: 'asc' },
    });

    res.json({ success: true, data: frames });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memuat master frame.' });
  }
});

/**
 * GET /api/frames/:id
 * Ambil detail 1 master frame berdasarkan ID
 */
framesRouter.get('/:id', authenticateToken, checkPermission(PERMISSIONS.FRAME_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const branchScope = req.user?.branchId;

    const frame = await prisma.frame.findFirst({
      where: {
        id,
        ...(branchScope
          ? { OR: [{ branchId: branchScope }, { branchId: null }] }
          : {}),
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    if (!frame) {
      res.status(404).json({ success: false, error: 'Master frame tidak ditemukan atau Anda tidak memiliki akses.' });
      return;
    }

    res.json({ success: true, data: frame });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memuat master frame.' });
  }
});

/**
 * POST /api/frames
 * Membuat Master Frame baru
 * - Superadmin: bisa memilih cabang spesifik ATAU null (semua cabang)
 * - Admin cabang: otomatis dikaitkan ke cabangnya sendiri
 */
framesRouter.post('/', authenticateToken, checkPermission(PERMISSIONS.FRAME_CREATE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, width, height, photoCount, price, slotsConfig, thumbnailUrl, branchId: bodyBranchId } = req.body;

    if (!name || !code || !width || !height || !photoCount || !price) {
      res.status(400).json({ success: false, error: 'Nama, kode, lebar, tinggi, jumlah pose, dan harga wajib diisi.' });
      return;
    }

    const existingCode = await prisma.frame.findUnique({ where: { code: code.trim().toLowerCase() } });
    if (existingCode) {
      res.status(400).json({ success: false, error: `Kode frame "${code}" sudah digunakan.` });
      return;
    }

    // Resolve branchId
    let branchId: number | null;
    if (req.user?.branchId) {
      branchId = req.user.branchId; // Admin cabang auto-assign
    } else {
      branchId = bodyBranchId === null || bodyBranchId === '' || bodyBranchId === undefined
        ? null
        : Number(bodyBranchId) || null;
    }

    // Validasi branchId jika bukan null
    if (branchId !== null) {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) {
        res.status(400).json({ success: false, error: 'Cabang tidak valid.' });
        return;
      }
    }

    const defaultSlots = slotsConfig || [
      { x: 100, y: 120, width: width - 200, height: Math.floor((height - 300) / photoCount) },
    ];

    const frame = await prisma.frame.create({
      data: {
        name: name.trim(),
        code: code.trim().toLowerCase(),
        width: Number(width),
        height: Number(height),
        photoCount: Number(photoCount),
        price: Number(price),
        slotsConfig: defaultSlots,
        thumbnailUrl: thumbnailUrl?.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop',
        branchId,
        isActive: true,
      },
      include: { branch: true },
    });

    const branchLabel = branchId
      ? (await prisma.branch.findUnique({ where: { id: branchId } }))?.name ?? `ID ${branchId}`
      : 'Semua Cabang (Global)';

    await logActivity({
      userId: req.user!.userId,
      branchId: frame.branchId,
      action: 'FRAME_CREATE',
      resource: 'frame',
      resourceId: frame.id,
      details: `Menambah Master Frame baru: "${frame.name}" (${frame.code}) untuk ${branchLabel} - Harga: Rp ${frame.price}`,
    });

    res.status(201).json({ success: true, data: frame });
  } catch (error) {
    console.error('Create frame error:', error);
    res.status(500).json({ success: false, error: 'Gagal membuat master frame baru.' });
  }
});

/**
 * PUT /api/frames/:id
 * Mengubah Master Frame
 */
framesRouter.put('/:id', authenticateToken, checkPermission(PERMISSIONS.FRAME_UPDATE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const branchScope = req.user?.branchId;

    const existing = await prisma.frame.findFirst({
      where: { id, ...(branchScope ? { branchId: branchScope } : {}) },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Master frame tidak ditemukan atau Anda tidak memiliki akses.' });
      return;
    }

    const { name, width, height, photoCount, price, slotsConfig, thumbnailUrl, isActive, branchId: bodyBranchId } = req.body;

    // Resolve nextBranchId
    let nextBranchId: number | null | undefined;
    if (branchScope) {
      nextBranchId = branchScope; // Admin cabang tidak bisa pindah cabang
    } else if (bodyBranchId !== undefined) {
      nextBranchId = bodyBranchId === null || bodyBranchId === '' ? null : Number(bodyBranchId) || null;
    }

    const updated = await prisma.frame.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(width ? { width: Number(width) } : {}),
        ...(height ? { height: Number(height) } : {}),
        ...(photoCount ? { photoCount: Number(photoCount) } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(slotsConfig ? { slotsConfig } : {}),
        ...(thumbnailUrl !== undefined ? { thumbnailUrl: thumbnailUrl?.trim() } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(nextBranchId !== undefined ? { branchId: nextBranchId } : {}),
      },
      include: { branch: true },
    });

    await logActivity({
      userId: req.user!.userId,
      branchId: updated.branchId,
      action: 'FRAME_UPDATE',
      resource: 'frame',
      resourceId: updated.id,
      details: `Mengubah Master Frame "${updated.name}" - Harga: Rp ${updated.price}`,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal mengubah master frame.' });
  }
});

/**
 * DELETE /api/frames/:id
 * Menghapus Master Frame.
 * - Jika frame belum pernah dipakai transaksi → dihapus permanen (desain terkait ikut cascade).
 * - Jika sudah dipakai transaksi → tidak bisa dihapus permanen (menjaga riwayat), hanya dinonaktifkan.
 */
framesRouter.delete('/:id', authenticateToken, checkPermission(PERMISSIONS.FRAME_DELETE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const branchScope = req.user?.branchId;

    const existing = await prisma.frame.findFirst({
      where: { id, ...(branchScope ? { branchId: branchScope } : {}) },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Master frame tidak ditemukan atau Anda tidak memiliki akses.' });
      return;
    }

    const usedInTransactions = await prisma.transaction.count({ where: { frameId: id } });

    if (usedInTransactions === 0) {
      await prisma.frame.delete({ where: { id } });

      await logActivity({
        userId: req.user!.userId,
        branchId: existing.branchId,
        action: 'FRAME_DELETE',
        resource: 'frame',
        resourceId: existing.id,
        details: `Menghapus Master Frame "${existing.name}" (${existing.code}) secara permanen.`,
      });

      res.json({ success: true, deleted: true, message: 'Master frame berhasil dihapus permanen.' });
    } else {
      const deactivated = await prisma.frame.update({
        where: { id },
        data: { isActive: false },
      });

      await logActivity({
        userId: req.user!.userId,
        branchId: existing.branchId,
        action: 'FRAME_DELETE',
        resource: 'frame',
        resourceId: existing.id,
        details: `Percobaan hapus Master Frame "${existing.name}" ditolak (sudah dipakai ${usedInTransactions} transaksi) -> frame dinonaktifkan.`,
      });

      res.json({
        success: true,
        deleted: false,
        message: `Frame sudah dipakai ${usedInTransactions} transaksi, tidak bisa dihapus permanen. Frame dinonaktifkan.`,
        data: deactivated,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal menghapus master frame.' });
  }
});
