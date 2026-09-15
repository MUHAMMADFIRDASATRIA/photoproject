import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, PERMISSIONS } from '@photobox/shared';
import { prisma } from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Middleware untuk memvalidasi JWT token
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ success: false, error: 'Akses ditolak. Token tidak ditemukan.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ success: false, error: 'Token tidak valid atau telah kedaluwarsa.' });
    return;
  }
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
