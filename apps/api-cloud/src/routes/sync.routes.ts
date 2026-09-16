import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { SETTINGS_KEYS } from '@photobox/shared';

export const syncRouter = Router();

/**
 * GET /api/sync/catalog
 * Endpoint sinkronisasi katalog untuk mesin Kiosk (frames, designs & settings)
 * Mengembalikan master frame, desain artwork aktif, dan pengaturan cabang untuk
 * cabang tertentu + global (semua cabang)
 */
syncRouter.get('/catalog', async (req: Request, res: Response) => {
  try {
    const { branchId } = req.query;
    const branchScope = branchId ? Number(branchId) : null;

    const framesWhere: any = { isActive: true };
    const designsWhere: any = { isActive: true };

    if (branchScope) {
      framesWhere.OR = [{ branchId: branchScope }, { branchId: null }];
      designsWhere.OR = [{ branchId: branchScope }, { branchId: null }];
    }

    const settingsWhere: any = {
      key: { in: Object.values(SETTINGS_KEYS) },
    };
    if (branchScope) {
      settingsWhere.OR = [{ branchId: branchScope }, { branchId: null }];
    }

    const [frames, designs, settings] = await Promise.all([
      prisma.frame.findMany({
        where: framesWhere,
        orderBy: { id: 'asc' },
      }),
      prisma.frameDesign.findMany({
        where: designsWhere,
        orderBy: { id: 'asc' },
      }),
      prisma.branchSetting.findMany({
        where: settingsWhere,
        orderBy: { id: 'asc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        frames,
        designs,
        settings,
        syncedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Catalog sync error:', error);
    res.status(500).json({ success: false, error: 'Gagal menyinkronkan data katalog.' });
  }
});
