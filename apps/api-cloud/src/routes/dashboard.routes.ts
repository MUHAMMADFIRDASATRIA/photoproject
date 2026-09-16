import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, checkPermission, AuthenticatedRequest } from '../middleware/auth';
import { PERMISSIONS } from '@photobox/shared';

export const dashboardRouter = Router();

/**
 * GET /api/dashboard/superadmin-summary
 * Sesuai CLAUDE.md: Dilindungi permission report.view_all_branch
 */
dashboardRouter.get(
  '/superadmin-summary',
  authenticateToken,
  checkPermission(PERMISSIONS.REPORT_VIEW_ALL_BRANCH),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      // 1. Total Branches
      const totalBranches = await prisma.branch.count({ where: { isActive: true } });

      // 2. Active Kiosks / Devices
      const totalDevices = await prisma.device.count();
      const activeDevices = await prisma.device.count({ where: { isActive: true } });

      // 3. Total Frames & Designs
      const totalFrames = await prisma.frame.count({ where: { isActive: true } });
      const totalDesigns = await prisma.frameDesign.count({ where: { isActive: true } });

      // 4. Users / Admins
      const totalUsers = await prisma.user.count({ where: { isActive: true } });

      // 5. Total Transactions & Revenue
      const transactions = await prisma.transaction.findMany({
        select: {
          amount: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          branchId: true,
        },
      });

      const totalRevenue = transactions
        .filter((t) => t.paymentStatus === 'paid' || t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalTransactionCount = transactions.length;

      // 6. Branch Summaries with Device Status
      const branches = await prisma.branch.findMany({
        where: { isActive: true },
        include: {
          devices: true,
          users: {
            where: { isActive: true },
            select: { id: true, username: true, role: { select: { name: true } } },
          },
          frameDesigns: {
            where: { isActive: true },
            select: { id: true },
          },
          _count: {
            select: {
              transactions: true,
            },
          },
        },
        orderBy: { id: 'asc' },
      });

      const branchPerformance = branches.map((b) => {
        const branchTransactions = transactions.filter((t) => t.branchId === b.id);
        const branchRevenue = branchTransactions
          .filter((t) => t.paymentStatus === 'paid' || t.status === 'completed')
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          id: b.id,
          name: b.name,
          address: b.address,
          deviceCount: b.devices.length,
          activeDevices: b.devices.filter((d) => d.isActive).length,
          designCount: b.frameDesigns.length,
          adminCount: b.users.filter((u) => u.role.name === 'admin').length,
          totalTransactions: branchTransactions.length,
          totalRevenue: branchRevenue,
        };
      });

      // 7. Recent Activity Logs (CLAUDE.md §5)
      const recentLogs = await prisma.activityLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { username: true } },
          branch: { select: { name: true } },
        },
      });

      res.json({
        success: true,
        data: {
          metrics: {
            totalBranches,
            totalDevices,
            activeDevices,
            totalFrames,
            totalDesigns,
            totalUsers,
            totalRevenue,
            totalTransactions: totalTransactionCount,
          },
          branches: branchPerformance,
          recentLogs: recentLogs.map((l) => ({
            id: l.id,
            user: l.user?.username ?? 'System',
            branch: l.branch?.name ?? 'Global (Semua Cabang)',
            action: l.action,
            resource: l.resource,
            details: l.details,
            createdAt: l.createdAt,
          })),
        },
      });
    } catch (error: any) {
      console.error('Error fetching dashboard summary:', error);
      res.status(500).json({ success: false, error: 'Gagal memuat ringkasan dashboard.' });
    }
  }
);

/**
 * GET /api/dashboard/admin-summary
 * Sesuai CLAUDE.md §1 & §6:
 * Dashboard Admin Cabang 100% berbasis Web (Cloud), data WAJIB di-filter murni
 * berdasarkan branch_id milik admin yang login.
 */
dashboardRouter.get(
  '/admin-summary',
  authenticateToken,
  checkPermission(PERMISSIONS.REPORT_VIEW),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const branchId = req.user?.branchId;

      if (!branchId) {
        res.status(400).json({
          success: false,
          error: 'Akun Anda tidak terikat dengan cabang tertentu. Gunakan ringkasan Superadmin.',
        });
        return;
      }

      // 1. Ambil data cabang admin
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: {
          devices: true,
          frameDesigns: {
            include: { frame: true },
            orderBy: { id: 'asc' },
          },
        },
      });

      if (!branch) {
        res.status(404).json({ success: false, error: 'Cabang tidak ditemukan.' });
        return;
      }

      // 2. Transaksi cabang ini saja
      const transactions = await prisma.transaction.findMany({
        where: { branchId },
        include: {
          frame: { select: { name: true, code: true } },
          design: { select: { name: true, thumbnailUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const totalRevenue = transactions
        .filter((t) => t.paymentStatus === 'paid' || t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      // Transaksi hari ini
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayTransactions = transactions.filter((t) => new Date(t.createdAt) >= startOfToday);
      const todayRevenue = todayTransactions
        .filter((t) => t.paymentStatus === 'paid' || t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      // 3. Status Kiosk Devices di cabang ini
      const devices = branch.devices.map((d) => ({
        id: d.id,
        name: d.name,
        isActive: d.isActive,
        lastSeen: d.lastSeen,
      }));

      // 4. Log Aktivitas Cabang Ini Saja (CLAUDE.md §5)
      const activityLogs = await prisma.activityLog.findMany({
        where: { branchId },
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { username: true } },
        },
      });

      res.json({
        success: true,
        data: {
          branch: {
            id: branch.id,
            name: branch.name,
            address: branch.address,
            isActive: branch.isActive,
          },
          metrics: {
            totalRevenue,
            todayRevenue,
            totalTransactions: transactions.length,
            todayTransactions: todayTransactions.length,
            totalDevices: branch.devices.length,
            activeDevices: branch.devices.filter((d) => d.isActive).length,
            totalDesigns: branch.frameDesigns.length,
            activeDesigns: branch.frameDesigns.filter((d) => d.isActive).length,
          },
          devices,
          designs: branch.frameDesigns.map((d) => ({
            id: d.id,
            name: d.name,
            frameName: d.frame.name,
            thumbnailUrl: d.thumbnailUrl,
            isActive: d.isActive,
          })),
          recentTransactions: transactions.slice(0, 6).map((t) => ({
            id: t.id,
            frameName: t.frame.name,
            designName: t.design?.name ?? 'Belum pilih tema',
            designThumbnail: t.design?.thumbnailUrl ?? null,
            amount: t.amount,
            paymentMethod: t.paymentMethod,
            paymentStatus: t.paymentStatus,
            status: t.status,
            createdAt: t.createdAt,
          })),
          recentLogs: activityLogs.map((l) => ({
            id: l.id,
            user: l.user?.username ?? 'System',
            action: l.action,
            details: l.details,
            createdAt: l.createdAt,
          })),
        },
      });
    } catch (error: any) {
      console.error('Error fetching admin dashboard summary:', error);
      res.status(500).json({ success: false, error: 'Gagal memuat ringkasan dashboard cabang.' });
    }
  }
);
