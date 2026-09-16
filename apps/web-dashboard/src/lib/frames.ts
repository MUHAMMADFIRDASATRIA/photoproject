export interface FrameSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  radius?: number;
}

export interface FrameItem {
  id: number;
  branchId?: number | null;
  name: string;
  code: string;
  width: number;
  height: number;
  photoCount: number;
  slotsConfig?: FrameSlot[];
  price: number;
  thumbnailUrl?: string | null;
  isActive: boolean;
  branch?: { id: number; name: string } | null;
  _count?: { designs: number; transactions: number };
}

export interface FramePreset {
  id: string;
  name: string;
  code: string;
  width: number;
  height: number;
  photoCount: number;
  price: number;
  slotsConfig: FrameSlot[];
  description: string;
}

// Hanya ukuran cetak berlaku: 2R (600x1050), 4R Potret (1200x1800), 4R Lanskap (1800x1200). Semua @300DPI.
export const FRAME_PRESETS: FramePreset[] = [
  {
    id: '2r',
    name: '2R (600×1050 px)',
    code: '2r',
    width: 600,
    height: 1050,
    photoCount: 1,
    price: 35000,
    slotsConfig: [{ x: 60, y: 105, width: 480, height: 840 }],
    description: 'Ukuran cetak 2R potret. Slot foto diatur manual setelah dipilih.',
  },
  {
    id: '4r_portrait',
    name: '4R Potret (1200×1800 px)',
    code: '4r_portrait',
    width: 1200,
    height: 1800,
    photoCount: 1,
    price: 40000,
    slotsConfig: [{ x: 60, y: 90, width: 1080, height: 1620 }],
    description: 'Ukuran cetak 4R vertikal (potret). Slot foto diatur manual setelah dipilih.',
  },
  {
    id: '4r_landscape',
    name: '4R Lanskap (1800×1200 px)',
    code: '4r_landscape',
    width: 1800,
    height: 1200,
    photoCount: 1,
    price: 40000,
    slotsConfig: [{ x: 90, y: 60, width: 1620, height: 1080 }],
    description: 'Ukuran cetak 4R horizontal (lanskap). Slot foto diatur manual setelah dipilih.',
  },
];

/**
 * Ukuran default slot = rasio kanvas dengan margin M.
 * Potret → slot potret.  Lanskap → slot lanskap.
 */
export function defaultSlotSize(w: number, h: number): { width: number; height: number } {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: 200, height: 300 };
  }
  const M = 60;
  const maxW = w - 2 * M;
  const maxH = h - 2 * M;
  const ratio = w / h; // rasio kanvas
  let slotW = Math.max(120, maxW);
  let slotH = Math.max(120, Math.round(slotW / ratio));
  if (slotH > maxH) {
    slotH = Math.max(120, maxH);
    slotW = Math.max(120, Math.round(slotH * ratio));
  }
  return { width: slotW, height: slotH };
}

export function defaultSlotBelow(w: number, h: number, existing: FrameSlot[]): FrameSlot {
  const { width: sw, height: sh } = defaultSlotSize(w, h);
  const isPortrait = h >= w;
  const last = existing[existing.length - 1];
  if (!last) return {
    x: isPortrait ? Math.round((w - sw) / 2) : 40,
    y: isPortrait ? 40 : Math.round((h - sh) / 2),
    width: sw,
    height: sh,
    rotation: 0,
    radius: 10,
  };
  return {
    x: isPortrait ? Math.round((w - sw) / 2) : last.x + last.width + 40,
    y: isPortrait ? Math.min(Math.max(0, h - sh), last.y + last.height + 40) : Math.round((h - sh) / 2),
    width: sw,
    height: sh,
    rotation: 0,
    radius: 10,
  };
}

export function autoLayoutSlots(w: number, h: number, count: number): FrameSlot[] {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0 || count <= 0) return [];
  const M = 60;
  const gap = 40;
  let { width: sw, height: sh } = defaultSlotSize(w, h);
  const isPortrait = h >= w;
  if (isPortrait) {
    // kanvas potret → susun kolom (vertikal)
    let totalH = count * sh + (count - 1) * gap;
    if (totalH > h - 2 * M) {
      const f = (h - 2 * M) / totalH;
      sw = Math.max(100, Math.round(sw * f));
      sh = Math.max(150, Math.round(sh * f));
      totalH = count * sh + (count - 1) * gap;
    }
    const startX = Math.round((w - sw) / 2);
    const startY = Math.round((h - totalH) / 2);
    return Array.from({ length: count }, (_, i) => ({
      x: startX, y: startY + i * (sh + gap), width: sw, height: sh, rotation: 0, radius: 10,
    }));
  }
  // kanvas lanskap → susun baris (horizontal)
  let totalW = count * sw + (count - 1) * gap;
  if (totalW > w - 2 * M) {
    const f = (w - 2 * M) / totalW;
    sw = Math.max(150, Math.round(sw * f));
    sh = Math.max(100, Math.round(sh * f));
    totalW = count * sw + (count - 1) * gap;
  }
  const startX = Math.round((w - totalW) / 2);
  const startY = Math.round((h - sh) / 2);
  return Array.from({ length: count }, (_, i) => ({
    x: startX + i * (sw + gap), y: startY, width: sw, height: sh, rotation: 0, radius: 10,
  }));
}