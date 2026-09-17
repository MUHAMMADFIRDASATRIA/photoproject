import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, JWT_AUDIENCES, PERMISSIONS } from '@photobox/shared';
import { prisma } from '../lib/prisma';
import { getJwtSecret } from '../lib/secret';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const SESSION_COOKIE = 'photobox_session';

/** Ambil token dari header Bearer, atau fallback ke cookie httpOnly. */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[SESSION_COOKIE] ?? null;
}

/**
 * Middleware untuk memvalidasi JWT token (header Bearer atau cookie httpOnly).
 * 1) Verifikasi signature + audience (token layanan lain ditolak).
 * 2) Reload user + permission dari DB setiap request sehingga pencabutan akses
 *    & penonaktifan akun berlaku seketika (bukan menunggu token kedaluwarsa).
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ success: false, error: 'Akses ditolak. Token tidak ditemukan.' });
    return;
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, getJwtSecret(), {
      audience: JWT_AUDIENCES.CLOUD,
    }) as JwtPayload;
  } catch (err) {
    res.status(403).json({ success: false, error: 'Token tidak valid atau telah kedaluwarsa.' });
    return;
  }

  const userId = Number(decoded.userId);
  if (!Number.isInteger(userId)) {
    res.status(403).json({ success: false, error: 'Klaim token tidak valid.' });
    return;
  }

  prisma.user
    .findUnique({
      where: { id: userId },
      select: {
        id: true,
        isActive: true,
        roleId: true,
        branchId: true,
        role: {
          select: {
            permissions: {
              select: { permission: { select: { code: true } } },
            },
          },
        },
      },
    })
    .then((user) => {
      if (!user || !user.isActive) {
        res.status(401).json({ success: false, error: 'Akun tidak ditemukan atau nonaktif.' });
        return;
      }

      req.user = {
        userId: user.id,
        roleId: user.roleId,
        branchId: user.branchId,
        permissions: user.role.permissions.map((rp) => rp.permission.code),
        iat: decoded.iat,
        exp: decoded.exp,
      };
      next();
    })
    .catch(() => {
      res.status(500).json({ success: false, error: 'Terjadi kesalahan saat memverifikasi token.' });
    });
}

/**
 * Middleware RBAC murni berbasis Permission Code
 * Sesuai CLAUDE.md §4: "Permission adalah satu-satunya sumber kebenaran.
 * Jangan pernah menulis pengecekan akses berbasis nama role langsung di kode."
 */
export function checkPermission(requiredPermission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const userPermissions = req.user.permissions || [];
    
    if (userPermissions.includes(requiredPermission)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: `Akses ditolak. Anda membutuhkan izin: ${requiredPermission}`,
    });
  };
}

/**
 * Helper untuk mencatat aktivitas ke activity_logs (CLAUDE.md §5 & §6)
 */
export async function logActivity(params: {
  userId: number;
  branchId?: number | null;
  action: string;
  resource: string;
  resourceId?: number | null;
  details?: string;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        branchId: params.branchId ?? null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        details: params.details,
      },
    });
  } catch (e) {
    console.error('Failed to write activity log:', e);
  }
}
