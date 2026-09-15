import axios from 'axios';
import { prisma } from '../lib/prisma';

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
      const { frames = [], designs = [] } = res.data.data;

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
            isActive: d.isActive,
          },
        });
      }

      console.log(`✅ [Sync] Catalog synced from Cloud: ${frames.length} frames, ${designs.length} designs`);
    }
  } catch (error: any) {
    // Offline resilience: warning saja, jangan gagalkan request kiosk
    console.warn('[Sync] Cloud sync skipped or offline:', error.message || error);
  }
}
