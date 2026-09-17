import { FrameItem, DesignItem } from '../store/kioskStore';

const API_CLOUD_ORIGIN = 'http://localhost:4001';

/** Resolve URL relatif (/uploads/...) → origin API Cloud */
function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${API_CLOUD_ORIGIN}${url}`;
  return url;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith('data:image')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Gambar foto object-cover (crop tengah) + sudut membulat */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 8
) {
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  const targetRatio = w / h;
  const imgRatio = imgW / imgH;
  let sx = 0;
  let sy = 0;
  let sw = imgW;
  let sh = imgH;

  if (imgRatio > targetRatio) {
    sw = imgH * targetRatio;
    sx = (imgW - sw) / 2;
  } else {
    sh = imgW / targetRatio;
    sy = (imgH - sh) / 2;
  }

  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

export interface ComposeResult {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Komposisi final: background (warna/artwork sesuai layer) + foto per slot + overlay + watermark.
 * backgroundLayer = 'below' (default): artwork di bawah slot foto; 'above': artwork menutupi slot foto.
 */
export async function composePhoto(
  frame: FrameItem,
  design: DesignItem,
  photos: string[]
): Promise<ComposeResult | null> {
  const canvas = document.createElement('canvas');
  canvas.width = frame.width || 1200;
  canvas.height = frame.height || 1800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Warna dasar
  ctx.fillStyle = design.bgColorHex || '#18181b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Render artwork dekoratif jika layer = 'below' (di bawah slot foto)
  const renderArtwork = async () => {
    const bgUrl = resolveImageUrl(design.backgroundUrl);
    if (!bgUrl) return;
    const bgImg = await loadImage(bgUrl);
    if (bgImg && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }
  };
  const bgLayer = design.backgroundLayer === 'above' ? 'above' : 'below';
  if (bgLayer === 'below') {
    await renderArtwork();
  }

  // 3. Render foto user di slot-slot
  const slots = frame.slotsConfig || [];
  // Preview editor desain memakai `slotBorderWidth * (2 * scale)` (scale = 100/min(nilai terkecil frame)),
  // jadi ketebalan asli di resolusi penuh = slotBorderWidth * 2 agar proporsinya identik di hasil cetak.
  const slotBorderW = (design.slotBorderWidth ?? 0) * 2;
  const slotBorderColor = design.slotBorderColor || null;

  const drawSlotBorder = (w: number, h: number, radius: number) => {
    if (!(slotBorderW > 0) || !slotBorderColor) return;
    ctx.save();
    ctx.strokeStyle = slotBorderColor;
    ctx.lineWidth = slotBorderW;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-w / 2, -h / 2, w, h, radius);
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }
    ctx.stroke();
    ctx.restore();
  };

  for (let i = 0; i < photos.length; i++) {
    const slot = slots[i] || {
      x: 100,
      y: 100 + i * 500,
      width: canvas.width - 200,
      height: 450,
    };

    const photoImg = await loadImage(photos[i]);
    if (!photoImg || !(photoImg.naturalWidth > 0)) continue;

    const rotation = (slot.rotation || 0) * (Math.PI / 180);
    const radius = slot.radius ?? 10;
    if (rotation) {
      ctx.save();
      ctx.translate(slot.x + slot.width / 2, slot.y + slot.height / 2);
      ctx.rotate(rotation);
      drawImageCover(ctx, photoImg, -slot.width / 2, -slot.height / 2, slot.width, slot.height, radius);
      drawSlotBorder(slot.width, slot.height, radius);
      ctx.restore();
    } else {
      drawImageCover(ctx, photoImg, slot.x, slot.y, slot.width, slot.height, radius);
      drawSlotBorder(slot.width, slot.height, radius);
    }
  }

  // 4. Jika backgroundLayer = 'above', gambar artwork menutupi slot foto
  if (bgLayer === 'above') {
    await renderArtwork();
  }

  // 5. Render Overlay PNG transparan (jika ada) — selalu di lapisan paling atas
  const overlayUrl = resolveImageUrl(design.overlayUrl);
  if (overlayUrl && !overlayUrl.includes('placeholder')) {
    const overlayImg = await loadImage(overlayUrl);
    if (overlayImg && overlayImg.naturalWidth > 0) {
      ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
    }
  }

  // 6. Watermark text (hanya jika tanpa artwork agar tidak mengganggu dekorasi)
  if (!resolveImageUrl(design.backgroundUrl)) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    ctx.fillText(`PHOTOBOX STUDIO • ${todayStr.toUpperCase()}`, canvas.width / 2, canvas.height - 40);
  }

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.95),
    width: canvas.width,
    height: canvas.height,
  };
}
