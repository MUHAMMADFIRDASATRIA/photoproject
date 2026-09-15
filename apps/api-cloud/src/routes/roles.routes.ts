import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, checkPermission, AuthenticatedRequest, logActivity } from '../middleware/auth';
import { PERMISSIONS } from '@photobox/shared';

export const rolesRouter = Router();

// GET /api/roles — Get all roles with their assigned permissions
rolesRouter.get('/', authenticateToken, checkPermission(PERMISSIONS.ROLE_MANAGE), async (_req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
      orderBy: { id: 'asc' },
    });

    const formatted = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission.code),
      createdAt: role.createdAt,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memuat data role.' });
  }
});

// GET /api/permissions — Get all available master permissions grouped by module
rolesRouter.get('/permissions', authenticateToken, checkPermission(PERMISSIONS.ROLE_MANAGE), async (_req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { code: 'asc' },
    });

    // Grouping by resource for cleaner frontend UI presentation
    const categorized: Record<string, typeof permissions> = {};
    for (const p of permissions) {
      const [resource] = p.code.split('.');
      if (!categorized[resource]) {
        categorized[resource] = [];
      }
      categorized[resource].push(p);
    }

    res.json({ success: true, data: permissions, categorized });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memuat daftar permission.' });
  }
});

// POST /api/roles — Create a new role
rolesRouter.post('/', authenticateToken, checkPermission(PERMISSIONS.ROLE_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, permissionCodes } = req.body;
    if (!name || name.trim() === '') {
      res.status(400).json({ success: false, error: 'Nama role wajib diisi.' });
      return;
    }

    const cleanName = name.trim().toLowerCase();
    const existing = await prisma.role.findUnique({ where: { name: cleanName } });
    if (existing) {
      res.status(400).json({ success: false, error: 'Nama role sudah ada.' });
      return;
    }

    const role = await prisma.role.create({
      data: {
        name: cleanName,
        description: description || '',
      },
    });

    // Assign initial permissions if provided
    if (Array.isArray(permissionCodes) && permissionCodes.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { code: { in: permissionCodes } },
      });

      for (const p of perms) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: p.id },
        });
      }
    }

    await logActivity({
      userId: req.user!.userId,
      branchId: null,
      action: 'ROLE_CREATE',
      resource: 'role',
      resourceId: role.id,
      details: `Membuat role baru: "${role.name}"`,
    });

    res.status(201).json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal membuat role baru.' });
  }
});

// PUT /api/roles/:id/permissions — Update assigned permissions for a role
// Sesuai CLAUDE.md §4: role.manage WAJIB di-hardcode terkunci pada role superadmin
rolesRouter.put('/:id/permissions', authenticateToken, checkPermission(PERMISSIONS.ROLE_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roleId = Number(req.params.id);
    const { permissionCodes } = req.body;

    if (!Array.isArray(permissionCodes)) {
      res.status(400).json({ success: false, error: 'permissionCodes harus berupa array string.' });
      return;
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      res.status(404).json({ success: false, error: 'Role tidak ditemukan.' });
      return;
    }

    let finalCodes = [...permissionCodes];

    // ATURAN KERAS CLAUDE.md §4:
    // Permission role.manage WAJIB di-hardcode terkunci pada role superadmin — tidak boleh bisa dicabut lewat UI!
    if (role.name === 'superadmin') {
      if (!finalCodes.includes(PERMISSIONS.ROLE_MANAGE)) {
        finalCodes.push(PERMISSIONS.ROLE_MANAGE);
      }
    }

    // Ambil ID semua permission yang dipilih
    const validPermissions = await prisma.permission.findMany({
      where: { code: { in: finalCodes } },
    });

    // Reset dan assign ulang permissions
    await prisma.rolePermission.deleteMany({ where: { roleId } });

    if (validPermissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: validPermissions.map((p) => ({
          roleId,
          permissionId: p.id,
        })),
      });
    }

    await logActivity({
      userId: req.user!.userId,
      branchId: null,
      action: 'ROLE_PERMISSIONS_UPDATE',
      resource: 'role',
      resourceId: roleId,
      details: `Memperbarui izin akses untuk role "${role.name}" (${validPermissions.length} permissions)`,
    });

    res.json({
      success: true,
      message: `Izin akses untuk role "${role.name}" berhasil diperbarui.`,
      permissions: validPermissions.map((p) => p.code),
    });
  } catch (error) {
    console.error('Update role permissions error:', error);
    res.status(500).json({ success: false, error: 'Gagal memperbarui izin akses role.' });
  }
});
