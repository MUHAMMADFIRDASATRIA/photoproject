import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, checkPermission, AuthenticatedRequest } from '../middleware/auth';
import { PERMISSIONS } from '@photobox/shared';

export const activityLogsRouter = Router();

/**
 * Scope cabang yang boleh dilihat pemanggil (dipakai oleh list & daftar user).
 * - Superadmin (LOG_VIEW_ALL_BRANCH): semua cabang + filter ?branchId=.
 * - Admin cabang: log cabangnya sendiri + log global (branchId null) yang ia buat.
 */
function buildScopeWhere(req: AuthenticatedRequest): any {
  const canViewAllBranches =
    req.user && Array.isArray(req.user.permissions) && req.user.permissions.includes(PERMISSIONS.LOG_VIEW_ALL_BRANCH);
  const branchIdQ = String(req.query.branchId || '').trim();

  const where: any = {};
  if (canViewAllBranches) {
    if (branchIdQ && branchIdQ !== 'all') where.branchId = Number(branchIdQ);
  } else {
    where.OR = [{ branchId: req.user?.branchId ?? null }, { branchId: null, userId: req.user?.userId }];
  }
  return where;
}

/**
 * GET /api/activity-logs/users
 * Daftar akun (id + username) yang memiliki log aktivitas dalam scope pemanggil,
 * untuk mengisi dropdown filter per-akun di halaman Audit Trail.
 */
activityLogsRouter.get('/users', authenticateToken, checkPermission(PERMISSIONS.LOG_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where = buildScopeWhere(req);
    const rows = await prisma.activityLog.findMany({
      where,
      distinct: ['userId'],
      select: {
        userId: true,
        user: { select: { id: true, username: true, isActive: true } },
      },
      orderBy: { userId: 'asc' },
    });

    const users = rows
      .filter((r) => r.user)
      .map((r) => ({ id: r.user!.id, username: r.user!.username, isActive: r.user!.isActive }));

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get activity-log users error:', error);
    res.status(500).json({ success: false, error: 'Gagal memuat daftar pengguna.' });
  }
});

/**
 * GET /api/activity-logs
 * Riwayat aksi sensitif (audit trail).
 * - Admin cabang: hanya log cabangnya sendiri (LOG_VIEW).
 * - Superadmin: semua cabang (LOG_VIEW_ALL_BRANCH) + filter cabang.
 * Filter: branchId, userId, action, resource, tanggal (from/to), search, pagination (page, pageSize).
 */
activityLogsRouter.get('/', authenticateToken, checkPermission(PERMISSIONS.LOG_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const search = String(req.query.search || '').trim();
    const action = String(req.query.action || '').trim();
    const resource = String(req.query.resource || '').trim();
    const userIdQ = String(req.query.userId || '').trim();
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();

    const where = buildScopeWhere(req);

    // Filter per akun: batasi ke klaim userId (dalam scope cabang di atas).
    if (userIdQ) where.userId = Number(userIdQ);

    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(new Date(to).getTime() + 86400000);
    }
    // Pencarian diperlakukan sebagai klausa AND terhadap scope cabang agar
    // hasil search tidak bocor ke baris log cabang lain.
    if (search) {
      where.AND = [
        {
          OR: [
            { details: { contains: search } },
            { resource: { contains: search } },
            { action: { contains: search } },
            { user: { is: { username: { contains: search } } } },
          ],
        },
      ];
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
