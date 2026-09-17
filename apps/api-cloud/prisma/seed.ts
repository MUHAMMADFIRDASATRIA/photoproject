import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PERMISSIONS } from '@photobox/shared';

const prisma = new PrismaClient();

function resolveSeedPassword(): string {
  const fromEnv = process.env.SEED_PASSWORD?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SECURITY] SEED_PASSWORD wajib di-set pada environment production untuk membuat akun awal.'
    );
  }

  // Mode development: password acak agar tidak ada kredensial 'password' yang
  // tertanam; operator harus menggantinya sebelum dipakai sungguhan.
  const generated = crypto.randomBytes(9).toString('base64url');
  console.warn(`[SECURITY] SEED_PASSWORD tidak di-set. Password akun awal di-generate acak (khusus dev): ${generated}`);
  return generated;
}

async function main() {
  console.log('🌱 Starting database seed with Admin accounts & transactions...');

  // 1. Seed Permissions
  const permissionList = [
    { code: PERMISSIONS.ROLE_MANAGE, description: 'Kelola Role dan Permission (Superadmin Only)' },
    { code: PERMISSIONS.BRANCH_VIEW, description: 'Melihat Data Cabang' },
    { code: PERMISSIONS.BRANCH_CREATE, description: 'Menambah Cabang Baru' },
    { code: PERMISSIONS.BRANCH_UPDATE, description: 'Mengubah Data Cabang' },
    { code: PERMISSIONS.BRANCH_DELETE, description: 'Menghapus Cabang' },
    { code: PERMISSIONS.USER_VIEW, description: 'Melihat Pengguna / Akun' },
    { code: PERMISSIONS.USER_CREATE, description: 'Menambah Pengguna / Akun' },
    { code: PERMISSIONS.USER_UPDATE, description: 'Mengubah Pengguna / Akun' },
    { code: PERMISSIONS.USER_DELETE, description: 'Menghapus Pengguna / Akun' },
    { code: PERMISSIONS.FRAME_VIEW, description: 'Melihat Master Frame' },
    { code: PERMISSIONS.FRAME_CREATE, description: 'Menambah Master Frame' },
    { code: PERMISSIONS.FRAME_UPDATE, description: 'Mengubah Master Frame' },
    { code: PERMISSIONS.FRAME_DELETE, description: 'Menghapus Master Frame' },
    { code: PERMISSIONS.DESIGN_VIEW, description: 'Melihat Desain Frame' },
    { code: PERMISSIONS.DESIGN_CREATE, description: 'Menambah Desain Frame' },
    { code: PERMISSIONS.DESIGN_UPDATE, description: 'Mengubah Desain Frame' },
    { code: PERMISSIONS.DESIGN_DELETE, description: 'Menghapus Desain Frame' },
    { code: PERMISSIONS.TRANSACTION_VIEW, description: 'Melihat Transaksi' },
    { code: PERMISSIONS.REPORT_VIEW, description: 'Melihat Laporan Cabang Sendiri' },
    { code: PERMISSIONS.REPORT_VIEW_ALL_BRANCH, description: 'Melihat Laporan Seluruh Cabang (Superadmin)' },
    { code: PERMISSIONS.LOG_VIEW, description: 'Melihat Log Aktivitas Cabang' },
    { code: PERMISSIONS.LOG_VIEW_ALL_BRANCH, description: 'Melihat Log Aktivitas Seluruh Cabang (Superadmin)' },
    { code: PERMISSIONS.DEVICE_VIEW, description: 'Melihat Kiosk Device' },
    { code: PERMISSIONS.DEVICE_MANAGE, description: 'Kelola Kiosk Device' },
    { code: PERMISSIONS.SETTING_MANAGE, description: 'Kelola Pengaturan (Waktu Sesi Foto, dll)' },
  ];

  for (const p of permissionList) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description },
      create: { code: p.code, description: p.description },
    });
  }

  // 2. Seed Roles
  const superadminRole = await prisma.role.upsert({
    where: { name: 'superadmin' },
    update: { description: 'Super Administrator / Pemilik Sistem' },
    create: { name: 'superadmin', description: 'Super Administrator / Pemilik Sistem' },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { description: 'Administrator Cabang' },
    create: { name: 'admin', description: 'Administrator Cabang' },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: { description: 'Kiosk Device User' },
    create: { name: 'user', description: 'Kiosk Device User' },
  });

  // 3. Assign All Permissions to Superadmin
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superadminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: superadminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Assign branch-level permissions to Admin
  const adminAllowedCodes = [
    PERMISSIONS.FRAME_VIEW,
    PERMISSIONS.DESIGN_VIEW,
    PERMISSIONS.DESIGN_CREATE,
    PERMISSIONS.DESIGN_UPDATE,
    PERMISSIONS.DESIGN_DELETE,
    PERMISSIONS.TRANSACTION_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.LOG_VIEW,
    PERMISSIONS.DEVICE_VIEW,
    PERMISSIONS.SETTING_MANAGE,
  ];
  for (const perm of allPermissions.filter((p) => adminAllowedCodes.includes(p.code as any))) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // 4. Seed Branches
  const branch1 = await prisma.branch.upsert({
    where: { id: 1 },
    update: { name: 'Cabang Grand Indonesia', address: 'West Mall Lt. 3, Jakarta Pusat', isActive: true },
    create: { name: 'Cabang Grand Indonesia', address: 'West Mall Lt. 3, Jakarta Pusat', isActive: true },
  });

  const branch2 = await prisma.branch.upsert({
    where: { id: 2 },
    update: { name: 'Cabang Paskal 23 Bandung', address: 'Lt. 2 Area Food Market, Bandung', isActive: true },
    create: { name: 'Cabang Paskal 23 Bandung', address: 'Lt. 2 Area Food Market, Bandung', isActive: true },
  });

  // 5. Seed Users (Superadmin & Branch Admins)
  const seedPassword = resolveSeedPassword();
  const passwordHash = await bcrypt.hash(seedPassword, 10);
  
  // Superadmin
  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: { password: passwordHash, roleId: superadminRole.id, isActive: true, branchId: null },
    create: { username: 'superadmin', password: passwordHash, roleId: superadminRole.id, branchId: null, isActive: true },
  });

  // Admin Cabang Grand Indonesia
  const adminGI = await prisma.user.upsert({
    where: { username: 'admin_gi' },
    update: { password: passwordHash, roleId: adminRole.id, branchId: branch1.id, isActive: true },
    create: { username: 'admin_gi', password: passwordHash, roleId: adminRole.id, branchId: branch1.id, isActive: true },
  });

  // Admin Cabang Paskal Bandung
  await prisma.user.upsert({
    where: { username: 'admin_paskal' },
    update: { password: passwordHash, roleId: adminRole.id, branchId: branch2.id, isActive: true },
    create: { username: 'admin_paskal', password: passwordHash, roleId: adminRole.id, branchId: branch2.id, isActive: true },
  });

  console.log('✅ Accounts seeded: superadmin, admin_gi, admin_paskal (isi password tak lagi dicetak).');

  // 6. Devices (Kiosks)
  await prisma.device.upsert({
    where: { id: 1 },
    update: { name: 'Kiosk-GI-01 (Main Gate)', branchId: branch1.id, isActive: true, lastSeen: new Date() },
    create: { name: 'Kiosk-GI-01 (Main Gate)', branchId: branch1.id, isActive: true, lastSeen: new Date() },
  });

  await prisma.device.upsert({
    where: { id: 2 },
    update: { name: 'Kiosk-GI-02 (East Lobby)', branchId: branch1.id, isActive: true, lastSeen: new Date() },
    create: { name: 'Kiosk-GI-02 (East Lobby)', branchId: branch1.id, isActive: true, lastSeen: new Date() },
  });

  await prisma.device.upsert({
    where: { id: 3 },
    update: { name: 'Kiosk-Paskal-01', branchId: branch2.id, isActive: true, lastSeen: new Date() },
    create: { name: 'Kiosk-Paskal-01', branchId: branch2.id, isActive: true, lastSeen: new Date() },
  });

  // 7. Master Frames & Designs
  const frameStrip = await prisma.frame.upsert({
    where: { code: 'strip_2x3' },
    update: {
      name: 'Photo Strip (2x3 Poses)',
      width: 1200,
      height: 1800,
      photoCount: 3,
      price: 35000,
      slotsConfig: [
        { x: 100, y: 120, width: 1000, height: 450 },
        { x: 100, y: 620, width: 1000, height: 450 },
        { x: 100, y: 1120, width: 1000, height: 450 },
      ],
      thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop',
    },
    create: {
      code: 'strip_2x3',
      name: 'Photo Strip (2x3 Poses)',
      width: 1200,
      height: 1800,
      photoCount: 3,
      price: 35000,
      slotsConfig: [
        { x: 100, y: 120, width: 1000, height: 450 },
        { x: 100, y: 620, width: 1000, height: 450 },
        { x: 100, y: 1120, width: 1000, height: 450 },
      ],
      thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop',
    },
  });

  const frameGrid = await prisma.frame.upsert({
    where: { code: 'grid_4r_4cut' },
    update: {
      name: 'Grid 4-Cut (4R Landscape)',
      width: 1800,
      height: 1200,
      photoCount: 4,
      price: 40000,
      slotsConfig: [
        { x: 80, y: 80, width: 780, height: 480 },
        { x: 940, y: 80, width: 780, height: 480 },
        { x: 80, y: 600, width: 780, height: 480 },
        { x: 940, y: 600, width: 780, height: 480 },
      ],
      thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop',
    },
    create: {
      code: 'grid_4r_4cut',
      name: 'Grid 4-Cut (4R Landscape)',
      width: 1800,
      height: 1200,
      photoCount: 4,
      price: 40000,
      slotsConfig: [
        { x: 80, y: 80, width: 780, height: 480 },
        { x: 940, y: 80, width: 780, height: 480 },
        { x: 80, y: 600, width: 780, height: 480 },
        { x: 940, y: 600, width: 780, height: 480 },
      ],
      thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop',
    },
  });

  const design1 = await prisma.frameDesign.upsert({
    where: { id: 1 },
    update: {
      branchId: branch1.id,
      frameId: frameStrip.id,
      name: 'Vintage Noir & Grain',
      overlayUrl: 'https://placehold.co/1200x1800/transparent/png?text=Vintage+Noir+Overlay',
      thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop',
      bgColorHex: '#18181b',
    },
    create: {
      branchId: branch1.id,
      frameId: frameStrip.id,
      name: 'Vintage Noir & Grain',
      overlayUrl: 'https://placehold.co/1200x1800/transparent/png?text=Vintage+Noir+Overlay',
      thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop',
      bgColorHex: '#18181b',
    },
  });

  const design2 = await prisma.frameDesign.upsert({
    where: { id: 2 },
    update: {
      branchId: branch1.id,
      frameId: frameGrid.id,
      name: 'Neon Cyberpunk 2026',
      overlayUrl: 'https://placehold.co/1800x1200/transparent/png?text=Neon+Cyber+Overlay',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop',
      bgColorHex: '#09090b',
    },
    create: {
      branchId: branch1.id,
      frameId: frameGrid.id,
      name: 'Neon Cyberpunk 2026',
      overlayUrl: 'https://placehold.co/1800x1200/transparent/png?text=Neon+Cyber+Overlay',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop',
      bgColorHex: '#09090b',
    },
  });

  // 8. Seed Sample Completed Transactions for Branch 1 (GI)
  const txCount = await prisma.transaction.count({ where: { branchId: branch1.id } });
  if (txCount === 0) {
    const tx1 = await prisma.transaction.create({
      data: {
        branchId: branch1.id,
        frameId: frameStrip.id,
        designId: design1.id,
        amount: 35000,
        paymentMethod: 'qris_gopay',
        paymentStatus: 'paid',
        status: 'completed',
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 menit lalu
      },
    });

    const tx2 = await prisma.transaction.create({
      data: {
        branchId: branch1.id,
        frameId: frameGrid.id,
        designId: design2.id,
        amount: 40000,
        paymentMethod: 'qris_shopeepay',
        paymentStatus: 'paid',
        status: 'completed',
        createdAt: new Date(Date.now() - 1000 * 60 * 75), // 75 menit lalu
      },
    });

    const tx3 = await prisma.transaction.create({
      data: {
        branchId: branch1.id,
        frameId: frameStrip.id,
        designId: design1.id,
        amount: 35000,
        paymentMethod: 'qris_bca',
        paymentStatus: 'paid',
        status: 'completed',
        createdAt: new Date(Date.now() - 1000 * 60 * 180), // 3 jam lalu
      },
    });

    // Sample Photos for QR Download
    await prisma.photo.create({
      data: {
        transactionId: tx1.id,
        branchId: branch1.id,
        localPath: 'C:\\photobox_storage\\photos\\tx1_printed.jpg',
        cloudUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
        uploadStatus: 'uploaded',
      },
    });

    // Sample Log for Branch 1
    await prisma.activityLog.create({
      data: {
        userId: adminGI.id,
        branchId: branch1.id,
        action: 'FRAME_DESIGN_UPDATE',
        resource: 'design',
        resourceId: design1.id,
        details: 'Admin GI memperbarui status template desain "Vintage Noir & Grain"',
      },
    });
  }

  console.log('✨ Seed completed with Admin accounts & transactions!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
