import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, checkPermission, AuthenticatedRequest, logActivity } from '../middleware/auth';
import {
  PERMISSIONS,
  SETTINGS_KEYS,
  SETTING_DEFAULTS,
} from '@photobox/shared';

export const settingsRouter = Router();

const TIMEOUT_KEY = SETTINGS_KEYS.PHOTO_SESSION_TIMEOUT_MINUTES;
const TIMEOUT_DEFAULT = SETTING_DEFAULTS.PHOTO_SESSION_TIMEOUT_MINUTES;
const TIMEOUT_MIN = 1;
const TIMEOUT_MAX = 120;

function toMinutes(value: any): number {
  const raw = value && typeof value === 'object' ? value.minutes : value;
  return Number.isFinite(Number(raw)) ? Number(raw) : TIMEOUT_DEFAULT;
}

/**
 * GET /api/settings
 * Pengaturan cabang & global (waktu sesi foto).
 * - Admin cabang: melihat override cabangnya + efektif yang berlaku.
 * - Superadmin: melihat default global + override semua cabang.
 */
settingsRouter.get('/', authenticateToken, checkPermission(PERMISSIONS.SETTING_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const branchScope = req.user?.branchId;

    const [overrides, globalRow] = await Promise.all([
      prisma.branchSetting.findMany({
        where: { key: TIMEOUT_KEY, branchId: { not: null } },
        include: { branch: { select: { id: true, name: true } } },
        orderBy: { branchId: 'asc' },
      }),
      prisma.branchSetting.findFirst({
        where: { key: TIMEOUT_KEY, branchId: null },
      }),
    ]);

    const globalMinutes = toMinutes(globalRow?.value);

    let effective = null;
    if (branchScope) {
      const branchRow = overrides.find((o) => o.branchId === branchScope);
      const minutes = branchRow ? toMinutes(branchRow.value) : globalMinutes;
      effective = { minutes, source: branchRow ? 'branch' : 'global' };
    }

    res.json({
      success: true,
      data: {
        globalMinutes,
        source: globalRow ? 'global' : 'default',
        overrides: overrides.map((o) => ({
          branchId: o.branchId,
          branchName: o.branch?.name ?? `Cabang ID ${o.branchId}`,
          minutes: toMinutes(o.value),
          updatedAt: o.updatedAt,
        })),
        effective,
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, error: 'Gagal memuat pengaturan.' });
  }
});

/**
 * PUT /api/settings/photo-session-timeout
 * Mengubah waktu sesi foto (menit).
 * - Admin cabang: nilai untuk cabangnya sendiri (branchId diabaikan).
 * - Superadmin: branchId = null/omitted → default global; branchId = angka → override cabang.
 * - clear: true → hapus override (kembali ke default global).
 */
settingsRouter.put('/photo-session-timeout', authenticateToken, checkPermission(PERMISSIONS.SETTING_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userBranchId = req.user?.branchId;
    const { minutes, branchId, clear } = req.body;

    const targetBranchId =
      userBranchId ??
      (branchId === null || branchId === undefined || branchId === ''
        ? null
        : Number(branchId) || null);

    if (!clear) {
      const m = Math.round(Number(minutes));
      if (!Number.isFinite(m) || m < TIMEOUT_MIN || m > TIMEOUT_MAX) {
        res.status(400).json({ success: false, error: `Nilai waktu harus antara ${TIMEOUT_MIN} dan ${TIMEOUT_MAX} menit.` });
        return;
      }

      if (targetBranchId !== null) {
        const branch = await prisma.branch.findUnique({ where: { id: targetBranchId } });
        if (!branch) {
          res.status(400).json({ success: false, error: 'Cabang tidak valid.' });
          return;
        }
      }

      // Default global (branchId = null) → Prisma tidak mendukung unique/upsert dengan null,
      // jadi pakai findFirst lalu create/update manual.
      if (targetBranchId === null) {
        const existing = await prisma.branchSetting.findFirst({
          where: { branchId: null, key: TIMEOUT_KEY },
        });
        if (existing) {
          await prisma.branchSetting.update({
            where: { id: existing.id },
            data: { value: { minutes: m } },
          });
        } else {
          await prisma.branchSetting.create({
            data: { branchId: null, key: TIMEOUT_KEY, value: { minutes: m } },
          });
        }
      } else {
        await prisma.branchSetting.upsert({
          where: { branchId_key: { branchId: targetBranchId, key: TIMEOUT_KEY } },
          update: { value: { minutes: m } },
          create: { branchId: targetBranchId, key: TIMEOUT_KEY, value: { minutes: m } },
        });
      }

      await logActivity({
        userId: req.user!.userId,
        branchId: targetBranchId,
        action: 'SETTING_UPDATE',
        resource: 'setting',
        details: `Mengubah waktu sesi foto menjadi ${m} menit (${targetBranchId ? `cabang ID ${targetBranchId}` : 'default global'}).`,
      });

      res.json({ success: true, minutes: m, branchId: targetBranchId });
      return;
    }

    // Hapus override cabang → kembali ke default global
    if (targetBranchId === null) {
      res.status(400).json({ success: false, error: 'Default global tidak bisa di-clear.' });
      return;
    }

    const deleted = await prisma.branchSetting.deleteMany({
      where: { branchId: targetBranchId, key: TIMEOUT_KEY },
    });

    await logActivity({
      userId: req.user!.userId,
      branchId: targetBranchId,
      action: 'SETTING_UPDATE',
      resource: 'setting',
      details: `Menghapus override waktu sesi foto cabang ID ${targetBranchId} (kembali ke default global).`,
    });

    res.json({ success: true, cleared: deleted.count > 0, branchId: targetBranchId });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: 'Gagal menyimpan pengaturan.' });
  }
});