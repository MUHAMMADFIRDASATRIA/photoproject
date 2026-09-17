import crypto from 'crypto';

/**
 * Mengambil JWT secret dari environment.
 * - Jika JWT_SECRET di-set: dipakai apa adanya.
 * - Jika tidak di-set pada production: server menolak jalan (fail-fast).
 * - Jika tidak di-set pada non-production: generate secret acak per proses.
 */
let cached: string | null = null;

export function getJwtSecret(): string {
  if (cached) return cached;

  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv && fromEnv !== 'change-this-to-a-secure-secret') {
    cached = fromEnv;
    return cached;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SECURITY] JWT_SECRET wajib di-set ke nilai acak yang kuat pada environment production.'
    );
  }

  console.warn(
    '[SECURITY] JWT_SECRET tidak di-set. Memakai secret acak sementara untuk mode development. ' +
      'Token device akan invalid setiap kali server di-restart.'
  );
  cached = crypto.randomBytes(48).toString('hex');
  return cached;
}
