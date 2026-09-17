import crypto from 'crypto';

/**
 * Token unduhan foto bertanda tangan (HMAC) untuk link publik QR pelanggan.
 * Tujuan: mencegah enumerasi foto pelanggan (id transaksi berurutan) dan
 * menonaktifkan static-serving folder uploads.
 *
 * URL: /api/kiosk/photos/:id/download?token=<sig>&exp=<epochMillis>
 */
let cachedSecret: string | null = null;

function getDownloadSecret(): string {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.DOWNLOAD_SECRET?.trim();
  if (fromEnv) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  console.warn(
    '[SECURITY] DOWNLOAD_SECRET tidak di-set. Memakai secret acak sementara — ' +
      'link QR lama akan invalid setiap kali server di-restart. Set DOWNLOAD_SECRET di .env untuk link yang stabil.'
  );
  cachedSecret = crypto.randomBytes(48).toString('hex');
  return cachedSecret;
}

export const DOWNLOAD_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

function computeSignature(transactionId: number, exp: number): string {
  return crypto
    .createHmac('sha256', getDownloadSecret())
    .update(`${transactionId}.${exp}`)
    .digest('hex');
}

/** Buat token + waktu kedaluwarsa untuk sebuah transaksi. */
export function createDownloadToken(
  transactionId: number,
  ttlMs: number = DOWNLOAD_TOKEN_TTL_MS
): { token: string; exp: number } {
  const exp = Date.now() + ttlMs;
  return { token: computeSignature(transactionId, exp), exp };
}

/** Verifikasi token unduhan (signature + belum kedaluwarsa). */
export function verifyDownloadToken(
  transactionId: number,
  token: string | undefined,
  exp: string | undefined
): boolean {
  if (!token || !exp) return false;

  const expNumber = Number(exp);
  if (!Number.isFinite(expNumber) || expNumber <= Date.now()) return false;
  if (expNumber > Date.now() + 30 * 24 * 60 * 60 * 1000) return false; // maksimum wajar 30 hari

  const expected = computeSignature(transactionId, expNumber);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(token));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
