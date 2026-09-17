import { FrameItem, FrameSlot } from './frames';

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/* Render template frame (latar putih, slot foto kosong) ke canvas
   sesuai resolusi asli frame, lalu unduh sebagai PNG. */
export function downloadFrameTemplate(frame: FrameItem): void {
  const slotW = frame.width;
  const slotH = frame.height;
  const canvas = document.createElement('canvas');
  canvas.width = slotW;
  canvas.height = slotH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const slots: FrameSlot[] =
    frame.slotsConfig && frame.slotsConfig.length > 0
      ? frame.slotsConfig
      : [{ x: 0, y: 0, width: slotW, height: slotH, rotation: 0, radius: 0 }];

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, slotW, slotH);

  slots.forEach((s, i) => {
    const cx = s.x + s.width / 2;
    const cy = s.y + s.height / 2;
    const radius = (s.radius ?? 0) * (slotW / frame.width);

    ctx.save();
    ctx.translate(cx, cy);
    if (s.rotation) ctx.rotate((s.rotation * Math.PI) / 180);
    ctx.translate(-s.width / 2, -s.height / 2);

    const path = () => roundedRectPath(ctx, 0, 0, s.width, s.height, radius);

    ctx.fillStyle = '#EDEDEE';
    path();
    ctx.fill();

    ctx.strokeStyle = '#A1A1AA';
    ctx.lineWidth = Math.max(2, Math.round(slotW / 300));
    ctx.setLineDash([Math.max(8, Math.round(slotW / 40))]);
    path();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = `bold ${Math.max(28, Math.round(slotW / 18))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), s.width / 2, s.height / 2);

    ctx.restore();
  });

  const link = document.createElement('a');
  link.download = `${frame.code || 'frame'}-template.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}