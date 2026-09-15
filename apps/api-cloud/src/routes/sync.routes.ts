import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const syncRouter = Router();

/**
 * GET /api/sync/catalog
 * Endpoint sinkronisasi katalog untuk mesin Kiosk (frames & designs)
 * Mengembalikan master frame dan desain artwork aktif untuk cabang tertentu + global (semua cabang)
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

    const [frames, designs] = await Promise.all([
      prisma.frame.findMany({
        where: framesWhere,
        orderBy: { id: 'asc' },
      }),
      prisma.frameDesign.findMany({
        where: designsWhere,
        orderBy: { id: 'asc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        frames,
        designs,
        syncedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Catalog sync error:', error);
    res.status(500).json({ success: false, error: 'Gagal menyinkronkan data katalog.' });
  }
});
