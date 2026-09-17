import axios from 'axios';
import { prisma } from '../lib/prisma';
import { SETTINGS_KEYS } from '@photobox/shared';

const CLOUD_API_URL = process.env.CLOUD_API_URL || 'http://localhost:4001';

/**
 * Sinkronisasi data Master Frame & Desain Artwork dari Cloud ke Database Lokal Kiosk
 * Sesuai CLAUDE.md §2 (Offline resilience: jika cloud unreachable, fallback ke DB lokal)
 */
export async function syncCatalogFromCloud(branchId?: number) {
  try {
    const url = branchId ? `${CLOUD_API_URL}/api/sync/catalog?branchId=${branchId}` : `${CLOUD_API_URL}/api/sync/catalog`;
    const res = await axios.get(url, { timeout: 4000 });

    if (res.data?.success && res.data?.data) {
      const { frames = [], designs = [], settings = [] } = res.data.data;

      // 1. Sync Frames ke database lokal
      for (const f of frames) {
        await prisma.frame.upsert({
          where: { id: f.id },
          update: {
            branchId: f.branchId,
            name: f.name,
            code: f.code,
            width: f.width,
            height: f.height,
            photoCount: f.photoCount,
            price: f.price,
            slotsConfig: f.slotsConfig,
            thumbnailUrl: f.thumbnailUrl,
            isActive: f.isActive,
          },
          create: {
            id: f.id,
            branchId: f.branchId,
            name: f.name,
            code: f.code,
            width: f.width,
            height: f.height,
            photoCount: f.photoCount,
            price: f.price,
            slotsConfig: f.slotsConfig,
            thumbnailUrl: f.thumbnailUrl,
            isActive: f.isActive,
          },
        });
      }

      // 2. Sync Frame Designs ke database lokal
      for (const d of designs) {
        await prisma.frameDesign.upsert({
          where: { id: d.id },
          update: {
            branchId: d.branchId,
            frameId: d.frameId,
            name: d.name,
            overlayUrl: d.overlayUrl,
            backgroundUrl: d.backgroundUrl,
            bgColorHex: d.bgColorHex,
            thumbnailUrl: d.thumbnailUrl,
            priceOverride: d.priceOverride,
            slotBorderColor: d.slotBorderColor,
            slotBorderWidth: d.slotBorderWidth,
            backgroundLayer: d.backgroundLayer ?? 'below',
            isActive: d.isActive,
          },
          create: {
            id: d.id,
            branchId: d.branchId,
            frameId: d.frameId,
            name: d.name,
            overlayUrl: d.overlayUrl,
            backgroundUrl: d.backgroundUrl,
            bgColorHex: d.bgColorHex,
            thumbnailUrl: d.thumbnailUrl,
            priceOverride: d.priceOverride,
            slotBorderColor: d.slotBorderColor,
            slotBorderWidth: d.slotBorderWidth,
            backgroundLayer: d.backgroundLayer ?? 'below',
            isActive: d.isActive,
          },
        });
      }

      // 3. Sync Branch Settings (mis. waktu sesi foto) ke database lokal
      // Prisma tidak mendukung upsert dengan branchId null → global pakai findFirst + create/update.
      for (const s of settings) {
        if (s.branchId === null || s.branchId === undefined) {
          const existing = await prisma.branchSetting.findFirst({
            where: { branchId: null, key: s.key },
          });
          if (existing) {
            await prisma.branchSetting.update({
              where: { id: existing.id },
              data: { value: s.value },
            });
          } else {
            await prisma.branchSetting.create({
              data: { branchId: null, key: s.key, value: s.value },
            });
          }
        } else {
          await prisma.branchSetting.upsert({
            where: { branchId_key: { branchId: s.branchId, key: s.key } },
            update: { value: s.value },
            create: { branchId: s.branchId, key: s.key, value: s.value },
          });
        }
      }

      // Reconcile: hapus pengaturan lokal yang sudah tidak ada di cloud
      // (mis. override cabang yang dihapus superadmin → kembali ke global).
      const syncedIds = new Set(
        settings.map((s: any) => `${s.branchId ?? 'global'}:${s.key}`)
      );
      const localSettings = await prisma.branchSetting.findMany({
        where: { key: { in: Object.values(SETTINGS_KEYS) } },
      });
      for (const row of localSettings) {
        const id = `${row.branchId ?? 'global'}:${row.key}`;
        if (!syncedIds.has(id)) {
          await prisma.branchSetting.delete({ where: { id: row.id } });
        }
      }

      console.log(
        `✅ [Sync] Catalog synced from Cloud: ${frames.length} frames, ${designs.length} designs, ${settings.length} settings`
      );
    }
  } catch (error: any) {
    // Offline resilience: warning saja, jangan gagalkan request kiosk
    console.warn('[Sync] Cloud sync skipped or offline:', error.message || error);
  }
}
