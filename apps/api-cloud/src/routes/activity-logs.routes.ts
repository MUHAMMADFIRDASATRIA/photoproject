import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, checkPermission, AuthenticatedRequest } from '../middleware/auth';
import { PERMISSIONS } from '@photobox/shared';

export const activityLogsRouter = Router();

/**
 * GET /api/activity-logs
 * Riwayat aksi sensitif (audit trail).
 * - Admin cabang: hanya log cabangnya sendiri (LOG_VIEW).
 * - Superadmin: semua cabang (LOG_VIEW_ALL_BRANCH) + filter cabang.
 * Filter: branchId, action, resource, tanggal (from/to), search, pagination (page, pageSize).
 */
activityLogsRouter.get('/', authenticateToken, checkPermission(PERMISSIONS.LOG_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const search = String(req.query.search || '').trim();
    const action = String(req.query.action || '').trim();
    const resource = String(req.query.resource || '').trim();
    const branchIdQ = String(req.query.branchId || '').trim();
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();

    const canViewAllBranches =
      req.user && Array.isArray(req.user.permissions) && req.user.permissions.includes(PERMISSIONS.LOG_VIEW_ALL_BRANCH);

    const where: any = {};

    // Scope cabang: admin cabang terkunci ke cabangnya; superadmin bebas filter
    if (canViewAllBranches) {
      if (branchIdQ && branchIdQ !== 'all') where.branchId = Number(branchIdQ);
    } else {
      // Admin cabang tetap bisa lihat log global (branchId = null) milik cabangnya saja
      where.OR = [{ branchId: req.user?.branchId ?? null }, { branchId: null, userId: req.user?.userId }];
    }

    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(new Date(to).getTime() + 86400000);
    }
    if (search) {
      where.OR = [
        { details: { contains: search } },
        { resource: { contains: search } },
        { action: { contains: search } },
        { user: { is: { username: { contains: search } } } },
      ].concat(where.OR || []);
    }

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, username: true } },
          branch: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ success: true, data: logs, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ success: false, error: 'Gagal memuat log aktivitas.' });
  }
});
