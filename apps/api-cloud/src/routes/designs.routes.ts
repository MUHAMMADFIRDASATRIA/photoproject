import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, checkPermission, AuthenticatedRequest, logActivity } from '../middleware/auth';
import { PERMISSIONS } from '@photobox/shared';
import { parseIntParam } from '../utils/number';

export const designsRouter = Router();

/**
 * GET /api/designs
 * - Admin cabang: melihat desain milik cabangnya + desain global (branchId=null)
 * - Superadmin: melihat semua desain
 */
designsRouter.get('/', authenticateToken, checkPermission(PERMISSIONS.DESIGN_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const branchId = req.user?.branchId; // null jika superadmin
    const { frameId, branchId: queryBranchId } = req.query;

    const where: any = {};

    if (branchId) {
      // Admin cabang: lihat desain cabangnya + desain global
      where.OR = [{ branchId }, { branchId: null }];
    } else if (queryBranchId && queryBranchId !== 'all') {
      // Superadmin filter per cabang tertentu
      if (queryBranchId === 'global') {
        where.branchId = null;
      } else {
        where.branchId = Number(queryBranchId);
      }
    }
    // Superadmin tanpa filter: lihat semua (where kosong)

    if (frameId) where.frameId = Number(frameId);

    const designs = await prisma.frameDesign.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        frame: { select: { id: true, name: true, code: true, price: true, width: true, height: true, photoCount: true, slotsConfig: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: designs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memuat desain frame.' });
  }
});

/**
 * POST /api/designs
 * - Superadmin: bisa pilih cabang tertentu ATAU branchId=null (semua cabang)
 * - Admin cabang: otomatis di-assign ke cabangnya
 */
designsRouter.post('/', authenticateToken, checkPermission(PERMISSIONS.DESIGN_CREATE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, frameId, branchId: bodyBranchId, backgroundUrl, bgColorHex, isActive, slotBorderColor, slotBorderWidth, backgroundLayer } = req.body;

    if (!name || !frameId) {
      res.status(400).json({ success: false, error: 'Nama desain dan master frame wajib diisi.' });
      return;
    }

    // Resolve branchId
    let branchId: number | null;
    if (req.user?.branchId) {
      // Admin cabang: otomatis cabangnya sendiri
      branchId = req.user.branchId;
    } else {
      // Superadmin: bisa pilih cabang atau null (semua cabang)
      branchId = bodyBranchId === null || bodyBranchId === '' || bodyBranchId === undefined
        ? null
        : Number(bodyBranchId) || null;
    }

    // Validasi cabang jika dipilih
    if (branchId !== null) {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) {
        res.status(400).json({ success: false, error: 'Cabang tidak valid.' });
        return;
      }
    }

    // Validasi frame
    const frame = await prisma.frame.findFirst({
      where: {
        id: Number(frameId),
        OR: [
          { branchId: null },
          ...(branchId !== null ? [{ branchId }] : []),
        ],
      },
    });
    if (!frame) {
      res.status(400).json({ success: false, error: 'Frame tidak valid untuk desain ini.' });
      return;
    }

    const effectiveBackgroundUrl = backgroundUrl ? backgroundUrl.trim() : null;
    const effectiveThumbnailUrl = effectiveBackgroundUrl || '';

    const design = await prisma.frameDesign.create({
      data: {
        branchId,
        frameId: Number(frameId),
        name: name.trim(),
        overlayUrl: '',
        backgroundUrl: effectiveBackgroundUrl,
        bgColorHex: bgColorHex ? bgColorHex.trim() : '#FFFFFF',
        thumbnailUrl: effectiveThumbnailUrl,
        priceOverride: null,
        slotBorderColor: slotBorderColor ? String(slotBorderColor).trim() : null,
        slotBorderWidth: slotBorderWidth == null ? null : Math.max(0, Math.min(20, Number(slotBorderWidth))) || null,
        backgroundLayer: backgroundLayer === 'above' ? 'above' : 'below',
        isActive: isActive === undefined ? true : Boolean(isActive),
      },
      include: { branch: true, frame: true },
    });

    const branchLabel = branchId
      ? (await prisma.branch.findUnique({ where: { id: branchId } }))?.name ?? `ID ${branchId}`
      : 'Semua Cabang';

    await logActivity({
      userId: req.user!.userId,
      branchId,
      action: 'DESIGN_CREATE',
      resource: 'design',
      resourceId: design.id,
      details: `Menambah desain frame "${design.name}" untuk ${branchLabel}`,
    });

    res.status(201).json({ success: true, data: design });
  } catch (error) {
    console.error('Create design error:', error);
    res.status(500).json({ success: false, error: 'Gagal menambah desain frame.' });
  }
});

/**
 * PUT /api/designs/:id
 */
designsRouter.put('/:id', authenticateToken, checkPermission(PERMISSIONS.DESIGN_UPDATE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const designId = parseIntParam(req.params.id);
    if (!designId) {
      res.status(400).json({ success: false, error: 'ID tidak valid.' });
      return;
    }
    const branchScope = req.user?.branchId;

    // Admin cabang hanya bisa edit desain miliknya
    const existing = await prisma.frameDesign.findFirst({
      where: { id: designId, ...(branchScope ? { branchId: branchScope } : {}) },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Desain frame tidak ditemukan.' });
      return;
    }

    const { name, frameId, branchId: bodyBranchId, backgroundUrl, bgColorHex, isActive, slotBorderColor, slotBorderWidth, backgroundLayer } = req.body;

    // Resolve branchId untuk update
    let nextBranchId: number | null;
    if (branchScope) {
      nextBranchId = branchScope; // Admin tetap di cabangnya
    } else if (bodyBranchId !== undefined) {
      nextBranchId = bodyBranchId === null || bodyBranchId === '' ? null : Number(bodyBranchId) || null;
    } else {
      nextBranchId = existing.branchId;
    }

    const nextFrameId = frameId ? Number(frameId) : existing.frameId;

    // Validasi frame
    const frame = await prisma.frame.findFirst({
      where: {
        id: nextFrameId,
        OR: [
          { branchId: null },
          ...(nextBranchId !== null ? [{ branchId: nextBranchId }] : []),
        ],
      },
    });
    if (!frame) {
      res.status(400).json({ success: false, error: 'Frame tidak valid untuk cabang desain ini.' });
      return;
    }

    const nextBackgroundUrl = backgroundUrl !== undefined ? (backgroundUrl ? String(backgroundUrl).trim() : null) : undefined;
    const thumbnailUrl = nextBackgroundUrl !== undefined ? (nextBackgroundUrl || '') : undefined;

    const updated = await prisma.frameDesign.update({
      where: { id: designId },
      data: {
        branchId: nextBranchId,
        frameId: nextFrameId,
        ...(name !== undefined && { name: String(name).trim() }),
        ...(nextBackgroundUrl !== undefined && { backgroundUrl: nextBackgroundUrl }),
        ...(bgColorHex !== undefined && { bgColorHex: bgColorHex ? String(bgColorHex).trim() : '#FFFFFF' }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(slotBorderColor !== undefined && { slotBorderColor: slotBorderColor ? String(slotBorderColor).trim() : null }),
        ...(slotBorderWidth !== undefined && { slotBorderWidth: slotBorderWidth == null ? null : (Math.max(0, Math.min(20, Number(slotBorderWidth))) || null) }),
        ...(backgroundLayer !== undefined && { backgroundLayer: backgroundLayer === 'above' ? 'above' : 'below' }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
      include: { branch: true, frame: true },
    });

    await logActivity({
      userId: req.user!.userId,
      branchId: updated.branchId,
      action: 'DESIGN_UPDATE',
      resource: 'design',
      resourceId: updated.id,
      details: `Memperbarui desain frame "${updated.name}"`,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memperbarui desain frame.' });
  }
});

/**
 * DELETE /api/designs/:id (soft delete → nonaktifkan)
 */
designsRouter.delete('/:id', authenticateToken, checkPermission(PERMISSIONS.DESIGN_DELETE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const designId = parseIntParam(req.params.id);
    if (!designId) {
      res.status(400).json({ success: false, error: 'ID tidak valid.' });
      return;
    }
    const branchScope = req.user?.branchId;
    const existing = await prisma.frameDesign.findFirst({
      where: { id: designId, ...(branchScope ? { branchId: branchScope } : {}) },
      include: { _count: { select: { transactions: true } } },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Desain frame tidak ditemukan.' });
      return;
    }

    const usedInTransactions = existing._count.transactions;

    if (usedInTransactions === 0) {
      await prisma.frameDesign.delete({ where: { id: designId } });

      await logActivity({
        userId: req.user!.userId,
        branchId: existing.branchId,
        action: 'DESIGN_DELETE',
        resource: 'design',
        resourceId: existing.id,
        details: `Menghapus desain frame "${existing.name}" secara permanen.`,
      });

      res.json({ success: true, deleted: true, message: 'Desain frame berhasil dihapus permanen.' });
    } else {
      await prisma.frameDesign.update({
        where: { id: designId },
        data: { isActive: false },
      });

      await logActivity({
        userId: req.user!.userId,
        branchId: existing.branchId,
        action: 'DESIGN_DELETE',
        resource: 'design',
        resourceId: existing.id,
        details: `Percobaan hapus desain frame "${existing.name}" ditolak (sudah dipakai ${usedInTransactions} transaksi) -> desain dinonaktifkan.`,
      });

      res.json({
        success: true,
        deleted: false,
        message: `Desain sudah dipakai ${usedInTransactions} transaksi, tidak bisa dihapus permanen. Desain dinonaktifkan.`,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal menghapus desain frame.' });
  }
});
