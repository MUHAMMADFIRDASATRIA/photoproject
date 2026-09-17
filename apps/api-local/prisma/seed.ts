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
      '[SECURITY] SEED_PASSWORD wajib di-set pada environment production untuk membuat akun device.'
    );
  }

  const generated = crypto.randomBytes(9).toString('base64url');
  console.warn(`[SECURITY] SEED_PASSWORD tidak di-set. Password akun device di-generate acak (khusus dev): ${generated}`);
  return generated;
}

async function main() {
  console.log('🌱 Starting local database seed for Kiosk machine...');

  // 1. Permissions
  const permissionList = [
    { code: PERMISSIONS.FRAME_VIEW, description: 'Melihat Master Frame' },
    { code: PERMISSIONS.DESIGN_VIEW, description: 'Melihat Desain Frame' },
    { code: PERMISSIONS.TRANSACTION_VIEW, description: 'Melihat Transaksi' },
    { code: PERMISSIONS.DEVICE_VIEW, description: 'Melihat Kiosk Device' },
  ];

  for (const p of permissionList) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description },
      create: { code: p.code, description: p.description },
    });
  }

  // 2. Roles
  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: { description: 'Kiosk Device User' },
    create: { name: 'user', description: 'Kiosk Device User' },
  });

  // 3. Branch lokal (Kiosk beroperasi di cabang ini)
  const branch1 = await prisma.branch.upsert({
    where: { id: 1 },
    update: { name: 'Cabang Grand Indonesia', address: 'West Mall Lt. 3, Jakarta Pusat', isActive: true },
    create: { name: 'Cabang Grand Indonesia', address: 'West Mall Lt. 3, Jakarta Pusat', isActive: true },
  });

  // 4. Akun Device Kiosk
  const passwordHash = await bcrypt.hash(resolveSeedPassword(), 10);
  const kioskUser = await prisma.user.upsert({
    where: { username: 'kiosk_gi_01' },
    update: {
      password: passwordHash,
      roleId: userRole.id,
      branchId: branch1.id,
      isActive: true,
    },
    create: {
      username: 'kiosk_gi_01',
      password: passwordHash,
      roleId: userRole.id,
      branchId: branch1.id,
      isActive: true,
    },
  });

  // Device Record
  await prisma.device.upsert({
    where: { id: 1 },
    update: { name: 'Kiosk-GI-01', branchId: branch1.id, isActive: true, lastSeen: new Date() },
    create: { name: 'Kiosk-GI-01', branchId: branch1.id, isActive: true, lastSeen: new Date() },
  });

  console.log(`✅ Device account ready: ${kioskUser.username}`);

  // 5. Frames lokal (Bentuk fisik)
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
      thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
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
      thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
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
      thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop',
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
      thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop',
    },
  });

  // 6. Frame Designs lokal
  await prisma.frameDesign.upsert({
    where: { id: 1 },
    update: {
      branchId: branch1.id,
      frameId: frameStrip.id,
      name: 'Vintage Noir & Grain',
      overlayUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600',
      thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop',
      bgColorHex: '#18181b',
    },
    create: {
      branchId: branch1.id,
      frameId: frameStrip.id,
      name: 'Vintage Noir & Grain',
      overlayUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600',
      thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop',
      bgColorHex: '#18181b',
    },
  });

  await prisma.frameDesign.upsert({
    where: { id: 2 },
    update: {
      branchId: branch1.id,
      frameId: frameStrip.id,
      name: 'Pastel Dream Pink',
      overlayUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
      bgColorHex: '#fdf2f8',
    },
    create: {
      branchId: branch1.id,
      frameId: frameStrip.id,
      name: 'Pastel Dream Pink',
      overlayUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
      bgColorHex: '#fdf2f8',
    },
  });

  await prisma.frameDesign.upsert({
    where: { id: 3 },
    update: {
      branchId: branch1.id,
      frameId: frameGrid.id,
      name: 'Neon Cyberpunk 2026',
      overlayUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop',
      bgColorHex: '#09090b',
    },
    create: {
      branchId: branch1.id,
      frameId: frameGrid.id,
      name: 'Neon Cyberpunk 2026',
      overlayUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop',
      bgColorHex: '#09090b',
    },
  });

  console.log('✨ Local database seeded successfully for Kiosk!');
}

main()
  .catch((e) => {
    console.error('❌ Local seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
