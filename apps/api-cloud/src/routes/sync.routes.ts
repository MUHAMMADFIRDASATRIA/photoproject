import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { SETTINGS_KEYS } from '@photobox/shared';

export const syncRouter = Router();

/** Perbandingan string constant-time untuk mencegah timing attack. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Scope cabang yang boleh ditarik sebuah kunci sync.
 * - number: hanya cabang tsb (+ data global)
 * - 'all' : semua cabang (key lama / tingkat operator sepenuhnya)
 */
type SyncScope = number | 'all';

interface SyncRequest extends Request {
  syncScope?: SyncScope;
}

/**
 * Parsing SYNC_API_KEYS (JSON single-line): { "<api-key>": <branchId> | "*" }.
 * Contoh: '{"key-a":"1","master":"*"}'.
 * Prioritas utama: scope cabang DITENTUKAN oleh kunci, bukan oleh query
 * `?branchId=` dari klien — kunci mesin tidak boleh meng-enumerasi cabang lain.
 */
function parseSyncKeys(): Map<string, SyncScope> | null {
  const raw = process.env.SYNC_API_KEYS?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const map = new Map<string, SyncScope>();
    for (const [key, value] of Object.entries(parsed)) {
      if (!key.trim()) continue;
      if (value === '*' || value === 'all') {
        map.set(key, 'all');
      } else {
        const n = Number(value);
        map.set(key, Number.isInteger(n) && n > 0 ? n : 'all');
      }
    }
    return map.size > 0 ? map : null;
  } catch (e) {
    console.error('[SECURITY] SYNC_API_KEYS tidak valid JSON — endpoint sync ditutup.', e);
    return null;
  }
}

/**
 * Endpoint sinkronisasi katalog bersifat machine-to-machine (api-local kiosk → cloud).
 * Dilindungi API key per-mesin (header `x-sync-key`) yang terikat ke cabang.
 */
function requireSyncKey(req: SyncRequest, res: Response, next: NextFunction) {
  const keys = parseSyncKeys();
  const legacyKey = process.env.SYNC_API_KEY?.trim();

  if (!keys && !legacyKey) {
    console.error('[SECURITY] SYNC_API_KEYS/SYNC_API_KEY belum di-set — endpoint sync ditutup.');
    res.status(503).json({ success: false, error: 'Sinkronisasi belum dikonfigurasi di server.' });
    return;
  }

  const provided = req.header('x-sync-key');
  if (!provided) {
    res.status(401).json({ success: false, error: 'API key sinkronisasi tidak valid.' });
    return;
  }

  // Prioritas: pemetaan per-kunci. Kunci tidak dikenal → tolak.
  if (keys && keys.has(provided)) {
    req.syncScope = keys.get(provided);
    next();
    return;
  }

  // Mode legacy (SYNC_API_KEY tunggal): kunci ini diperlakukan sebagai akses
  // semua cabang. Sebaiknya diganti dengan SYNC_API_KEYS per-mesin.
  if (!keys && legacyKey && safeEqual(provided, legacyKey)) {
    req.syncScope = 'all';
    next();
    return;
  }

  res.status(401).json({ success: false, error: 'API key sinkronisasi tidak valid.' });
}

syncRouter.use(requireSyncKey);

/**
 * GET /api/sync/catalog
 * Endpoint sinkronisasi katalog untuk mesin Kiosk (frames, designs & settings).
 * Scope cabang SELALU berasal dari kunci sync milik mesin — parameter
 * `?branchId=` dari klien diabaikan (anti-enumerasi lintas cabang).
 */
syncRouter.get('/catalog', async (req: SyncRequest, res: Response) => {
  try {
    const scope = req.syncScope ?? 'all';

    const framesWhere: any = { isActive: true };
    const designsWhere: any = { isActive: true };

    if (scope !== 'all') {
      framesWhere.OR = [{ branchId: scope }, { branchId: null }];
      designsWhere.OR = [{ branchId: scope }, { branchId: null }];
    }

    const settingsWhere: any = {
      key: { in: Object.values(SETTINGS_KEYS) },
    };
    if (scope !== 'all') {
      settingsWhere.OR = [{ branchId: scope }, { branchId: null }];
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
