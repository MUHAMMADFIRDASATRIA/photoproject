import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '../lib/prisma';
import { JwtPayload } from '@photobox/shared';
import { syncCatalogFromCloud } from '../services/sync.service';

export const kioskRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

interface KioskAuthenticatedRequest extends Request {
  device?: JwtPayload;
}

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function getDownloadBaseUrl(req: Request): string {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;
  const host = req.get('host');
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${req.protocol}://${host}`;
  }
  return `http://${getLocalIp()}:4000`;
}

function authenticateDevice(req: KioskAuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ success: false, error: 'Token device tidak ditemukan.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!decoded.branchId) {
      res.status(403).json({ success: false, error: 'Akun device tidak terikat ke cabang.' });
      return;
    }

    req.device = decoded;
    next();
  } catch {
    res.status(403).json({ success: false, error: 'Token device tidak valid atau kedaluwarsa.' });
  }
}

/**
 * POST /api/kiosk/login-device
 * Sesuai CLAUDE.md §1: Kiosk login sebagai "akun device" di mesin kiosk
 */
kioskRouter.post('/login-device', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Username dan password device wajib diisi.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: { branch: true, role: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Akun device tidak valid atau nonaktif.' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Password akun device salah.' });
      return;
    }

    // Update lastSeen pada device
    if (user.branchId) {
      await prisma.device.updateMany({
        where: { branchId: user.branchId },
        data: { lastSeen: new Date(), isActive: true },
      });
    }

    const tokenPayload: JwtPayload = {
      userId: user.id,
      roleId: user.roleId,
      branchId: user.branchId,
      permissions: ['frame.view', 'design.view', 'transaction.view', 'device.view'],
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      message: 'Login device berhasil.',
      data: {
        token,
        device: {
          id: user.id,
          username: user.username,
          branchId: user.branchId,
          branchName: user.branch?.name ?? 'Cabang Lokal',
          branchAddress: user.branch?.address ?? '',
        },
      },
    });
  } catch (error) {
    console.error('Device login error:', error);
    res.status(500).json({ success: false, error: 'Gagal melakukan otentikasi device.' });
  }
});

/**
 * GET /api/kiosk/frames
 * Mengambil daftar bentuk fisik frame yang tersedia
 */
kioskRouter.get('/frames', authenticateDevice, async (req: KioskAuthenticatedRequest, res: Response) => {
  try {
    const branchId = req.device!.branchId!;
    // Auto-sync catalog from cloud (non-blocking / resilient)
    await syncCatalogFromCloud(branchId);

    const frames = await prisma.frame.findMany({
      where: {
        isActive: true,
        OR: [{ branchId }, { branchId: null }],
      },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: frames });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memuat master frame.' });
  }
});

/**
 * GET /api/kiosk/designs
 * Mengambil tema/desain artwork berdasarkan frameId
 */
kioskRouter.get('/designs', authenticateDevice, async (req: KioskAuthenticatedRequest, res: Response) => {
  try {
    const branchId = req.device!.branchId!;
    const { frameId } = req.query;

    // Auto-sync catalog from cloud (non-blocking / resilient)
    await syncCatalogFromCloud(branchId);

    const where: any = {
      isActive: true,
      OR: [{ branchId }, { branchId: null }], // Desain cabang + desain global (semua cabang)
    };
    if (frameId) where.frameId = Number(frameId);

    const designs = await prisma.frameDesign.findMany({
      where,
      include: { frame: true },
      orderBy: { id: 'asc' },
    });

    res.json({ success: true, data: designs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memuat desain frame.' });
  }
});

/**
 * POST /api/kiosk/transactions
 * Membuat transaksi sesi foto baru di mesin kiosk
 */
kioskRouter.post('/transactions', authenticateDevice, async (req: KioskAuthenticatedRequest, res: Response) => {
  try {
    const branchId = req.device!.branchId!;
    const { frameId, designId, copies } = req.body;

    if (!frameId) {
      res.status(400).json({ success: false, error: 'frameId wajib disertakan.' });
      return;
    }

    const frame = await prisma.frame.findUnique({ where: { id: Number(frameId) } });
    if (!frame) {
      res.status(404).json({ success: false, error: 'Frame tidak ditemukan.' });
      return;
    }

    // Jumlah lembar cetak (min 1, maks 50) — mempengaruhi harga
    const printCopies = Math.max(1, Math.min(50, Number(copies) || 1));

    // Cari design default jika designId tidak dikirim dulu
    let selectedDesignId = designId ? Number(designId) : null;
    if (!selectedDesignId) {
      const defaultDesign = await prisma.frameDesign.findFirst({
        where: {
          frameId: Number(frameId),
          isActive: true,
          OR: [{ branchId }, { branchId: null }],
        },
      });
      if (defaultDesign) {
        selectedDesignId = defaultDesign.id;
      } else {
        res.status(400).json({ success: false, error: 'Belum ada desain frame aktif untuk cabang ini.' });
        return;
      }
    }

    const amount = frame.price * printCopies;

    const transaction = await prisma.transaction.create({
      data: {
        branchId,
        frameId: Number(frameId),
        designId: selectedDesignId,
        amount,
        copies: printCopies,
        paymentMethod: 'qris',
        paymentStatus: 'pending',
        status: 'created',
      },
      include: { frame: true, design: true },
    });

    // Dummy QRIS Payload sesuai standar ASPI QRIS EMVCo
    const qrisPayload = `00020101021226580016ID.CO.PHOTOBOX.WWW011893600999520458125303360540${amount}5802ID5914PHOTOBOX STUDIO6007JAKARTA6304`;

    res.status(201).json({
      success: true,
      data: {
        transaction,
        qrisPayload,
      },
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ success: false, error: 'Gagal membuat transaksi baru.' });
  }
});

/**
 * PATCH /api/kiosk/transactions/:id/design
 * Memilih / memperbarui desain frame pada transaksi yang sudah dibuat
 */
kioskRouter.patch('/transactions/:id/design', authenticateDevice, async (req: KioskAuthenticatedRequest, res: Response) => {
  try {
    const branchId = req.device!.branchId!;
    const transactionId = Number(req.params.id);
    const { designId } = req.body;

    if (!designId) {
      res.status(400).json({ success: false, error: 'designId wajib disertakan.' });
      return;
    }

    const existing = await prisma.transaction.findFirst({
      where: { id: transactionId, branchId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Transaksi tidak ditemukan.' });
      return;
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: { designId: Number(designId) },
      include: { frame: true, design: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update transaction design error:', error);
    res.status(500).json({ success: false, error: 'Gagal menyimpan pilihan desain frame.' });
  }
});

/**
 * POST /api/kiosk/transactions/:id/pay
 * Simulasi konfirmasi pembayaran QRIS berhasil
 */
kioskRouter.post('/transactions/:id/pay', authenticateDevice, async (req: KioskAuthenticatedRequest, res: Response) => {
  try {
    const branchId = req.device!.branchId!;
    const transactionId = Number(req.params.id);

    const existing = await prisma.transaction.findFirst({
      where: { id: transactionId, branchId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Transaksi tidak ditemukan.' });
      return;
    }

    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentStatus: 'paid',
        status: 'paid',
      },
      include: { frame: true, design: true },
    });

    res.json({
      success: true,
      message: 'Pembayaran QRIS berhasil dikonfirmasi.',
      data: transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal mengonfirmasi pembayaran.' });
  }
});

/**
 * POST /api/kiosk/transactions/:id/complete
 * Menyelesaikan transaksi, menyimpan file foto komposit ke disk & mengembalikan URL publik untuk QR
 */
kioskRouter.post('/transactions/:id/complete', authenticateDevice, async (req: KioskAuthenticatedRequest, res: Response) => {
  try {
    const branchId = req.device!.branchId!;
    const transactionId = Number(req.params.id);
    const { compositeDataUrl, photos } = req.body;

    const existing = await prisma.transaction.findFirst({
      where: { id: transactionId, branchId },
      include: { frame: true, design: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Transaksi tidak ditemukan.' });
      return;
    }

    // Update status transaksi ke completed
    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'completed' },
    });

    // Simpan data foto komposit ke disk
    const photosDir = path.resolve(__dirname, '../../uploads/photos');
    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true });
    }

    const compositeFileName = `photo_tx_${transactionId}.jpg`;
    const compositeFilePath = path.join(photosDir, compositeFileName);

    if (compositeDataUrl && typeof compositeDataUrl === 'string' && compositeDataUrl.startsWith('data:image')) {
      const base64Data = compositeDataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(compositeFilePath, Buffer.from(base64Data, 'base64'));
    }

    const downloadBase = getDownloadBaseUrl(req);

    // ====== Foto Komposit (frame/grid) ======
    const compositeUrl = `${downloadBase}/api/kiosk/photos/${transactionId}/download`;
    let compositePhoto = await prisma.photo.findFirst({
      where: { transactionId: existing.id, kind: 'composite' },
    });

    if (compositePhoto) {
      compositePhoto = await prisma.photo.update({
        where: { id: compositePhoto.id },
        data: {
          localPath: compositeFilePath,
          cloudUrl: compositeUrl,
          uploadStatus: 'pending',
        },
      });
    } else {
      compositePhoto = await prisma.photo.create({
        data: {
          transactionId: existing.id,
          branchId: existing.branchId,
          localPath: compositeFilePath,
          cloudUrl: compositeUrl,
          uploadStatus: 'pending',
          kind: 'composite',
          slotIndex: null,
        },
      });

      // Masukkan ke sync_queue (CLAUDE.md §2: queue-based sync)
      await prisma.syncQueue.create({
        data: {
          branchId: existing.branchId,
          tableName: 'transactions',
          recordId: existing.id,
          operation: 'create',
          payload: {
            id: existing.id,
            amount: existing.amount,
            copies: existing.copies,
            status: 'completed',
            paymentStatus: 'paid',
            frameId: existing.frameId,
            designId: existing.designId,
            createdAt: existing.createdAt,
          },
          status: 'pending',
        },
      });

      // Masukkan ke upload_queue untuk sync foto ke cloud nanti
      await prisma.uploadQueue.create({
        data: {
          photoId: compositePhoto.id,
          branchId: existing.branchId,
          filePath: compositeFilePath,
          status: 'pending',
        },
      });
    }

    // ====== Foto per-Pose (foto biasa sesuai jumlah grid) ======
    const poseUrls: string[] = [];
    if (Array.isArray(photos)) {
      for (let i = 0; i < photos.length; i++) {
        const poseIndex = i + 1;
        const poseFileName = `photo_tx_${transactionId}_pose_${poseIndex}.jpg`;
        const poseFilePath = path.join(photosDir, poseFileName);

        const rawPose = photos[i];
        if (rawPose && typeof rawPose === 'string' && rawPose.startsWith('data:image')) {
          const base64Data = rawPose.replace(/^data:image\/\w+;base64,/, '');
          fs.writeFileSync(poseFilePath, Buffer.from(base64Data, 'base64'));
        }

        const poseUrl = `${downloadBase}/api/kiosk/photos/${transactionId}/download?raw=true&pose=${poseIndex}`;
        poseUrls.push(poseUrl);

        const existingPose = await prisma.photo.findFirst({
          where: { transactionId: existing.id, kind: 'single', slotIndex: poseIndex },
        });

        if (existingPose) {
          await prisma.photo.update({
            where: { id: existingPose.id },
            data: {
              localPath: poseFilePath,
              cloudUrl: poseUrl,
              uploadStatus: 'pending',
            },
          });
        } else if (fs.existsSync(poseFilePath)) {
          const newPose = await prisma.photo.create({
            data: {
              transactionId: existing.id,
              branchId: existing.branchId,
              localPath: poseFilePath,
              cloudUrl: poseUrl,
              uploadStatus: 'pending',
              kind: 'single',
              slotIndex: poseIndex,
            },
          });

          await prisma.uploadQueue.create({
            data: {
              photoId: newPose.id,
              branchId: existing.branchId,
              filePath: poseFilePath,
              status: 'pending',
            },
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Transaksi dan foto selesai diproses.',
      data: {
        transaction: updated,
        downloadUrl: compositeUrl,
        poseUrls,
        totalPoses: poseUrls.length,
      },
    });
  } catch (error) {
    console.error('Complete transaction error:', error);
    res.status(500).json({ success: false, error: 'Gagal menyelesaikan transaksi.' });
  }
});

/**
 * GET /api/kiosk/photos/:id/download
 * Link Publik untuk scan QR Code pelanggan
 */
kioskRouter.get('/photos/:id/download', async (req: Request, res: Response) => {
  try {
    const transactionId = Number(req.params.id);
    const raw = req.query.raw === 'true' || req.query.download === 'true';
    const poseParam = req.query.pose ? Math.max(1, Number(req.query.pose) || 1) : null;

    const photosDir = path.resolve(__dirname, '../../uploads/photos');
    const compositeFileName = `photo_tx_${transactionId}.jpg`;
    const compositeFilePath = path.join(photosDir, compositeFileName);
    const poseFileName = (n: number) => `photo_tx_${transactionId}_pose_${n}.jpg`;
    const poseFilePath = (n: number) => path.join(photosDir, poseFileName(n));

    // Serve file foto per-pose bila diminta (?raw=true&pose=N)
    if (poseParam) {
      const fp = poseFilePath(poseParam);
      if (fs.existsSync(fp)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', `attachment; filename="photobox_${transactionId}_pose_${poseParam}.jpg"`);
        return res.sendFile(fp);
      }
      return res.status(404).send('File foto pose tidak ditemukan.');
    }

    // Serve file foto komposit bila diminta (?raw=true)
    if (raw) {
      if (fs.existsSync(compositeFilePath)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', `attachment; filename="photobox_${transactionId}.jpg"`);
        return res.sendFile(compositeFilePath);
      }
      return res.status(404).send('File foto tidak ditemukan.');
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { frame: true, design: true, branch: true },
    });

    const compositeExists = fs.existsSync(compositeFilePath);
    const compositeImageUrl = `/uploads/photos/${compositeFileName}`;
    const branchName = transaction?.branch?.name || 'Photobox Studio';
    const frameName = transaction?.frame?.name || '';
    const designName = transaction?.design?.name || '';
    const photoCount = transaction?.frame?.photoCount || 0;
    const dateStr = transaction?.createdAt
      ? new Date(transaction.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })
      : new Date().toLocaleString('id-ID');

    // Cek ketersediaan tiap pose sesuai jumlah grid pada frame
    const poses = Array.from({ length: photoCount }).map((_, idx) => {
      const n = idx + 1;
      const exists = fs.existsSync(poseFilePath(n));
      return {
        n,
        exists,
        thumbUrl: exists ? `/uploads/photos/${poseFileName(n)}` : null,
        downUrl: `?raw=true&pose=${n}`,
        downName: `photobox_${transactionId}_pose_${n}.jpg`,
      };
    });

    const poseCardsHtml = poses
      .map(
        (p) => `<div class="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl aspect-[3/2]">
          ${
            p.exists
              ? `<img src="${p.thumbUrl}" alt="Pose ${p.n}" class="w-full h-full object-cover rounded-2xl" />`
              : `<div class="w-full h-full flex flex-col items-center justify-center text-zinc-500 text-xs gap-1"><span>Foto sedang diproses...</span></div>`
          }
          <span class="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">#${p.n}</span>
          ${
            p.exists
              ? `<a href="${p.downUrl}" download="${p.downName}" class="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-xl bg-white/95 backdrop-blur px-3 py-2 text-xs font-bold text-zinc-950 hover:brightness-90 transition active:scale-95">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Simpan Pose ${p.n}
          </a>`
              : ''
          }
        </div>`
      )
      .join('\n');

    const allPoseUrls = poses.map((p) => `'${p.downUrl}'`).join(', ');
    const allPoseNames = poses.map((p) => `'${p.downName}'`).join(', ');

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unduh Foto - ${branchName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-zinc-950 text-white min-h-screen flex flex-col justify-between p-4 sm:p-8">
  <div class="max-w-2xl mx-auto w-full space-y-8 pt-4">
    <!-- Header -->
    <div class="space-y-1 text-center">
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
        ✨ ${branchName}
      </span>
      <h1 class="text-2xl font-black tracking-tight text-white mt-2">Foto Photobox Kamu</h1>
      <p class="text-xs text-zinc-400">${dateStr}</p>
      ${
        frameName || designName
          ? `<p class="text-xs text-zinc-500">${frameName ? frameName : ''}${frameName && designName ? ' • ' : ''}${designName ? `Tema: ${designName}` : ''}</p>`
          : ''
      }
    </div>

    <!-- Hasil Frame / Grid (Komposit) -->
    <div class="text-left">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-400">Hasil Frame / Grid</h2>
        ${
          compositeExists
            ? `<a href="?raw=true" download="photobox_${transactionId}.jpg" class="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Unduh Frame HD</a>`
            : ''
        }
      </div>
      <div class="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2">
        ${
          compositeExists
            ? `<img src="${compositeImageUrl}" alt="Hasil Foto Photobox" class="w-full h-auto rounded-xl object-contain max-h-[60vh] mx-auto shadow-inner" />`
            : `<div class="h-64 flex flex-col items-center justify-center text-zinc-500 text-xs"><span>Foto sedang diproses...</span></div>`
        }
      </div>
    </div>

    <!-- Grid Foto Pose -->
    ${
      poses.length > 0
        ? `
    <div class="text-left">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-400">${poses.length} Pose Foto</h2>
        ${
          poses.some((p) => p.exists)
            ? `<button onclick="downloadAll()" class="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer">Unduh Semua</button>`
            : ''
        }
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${poseCardsHtml}
      </div>
    </div>
    `
        : ''
    }

    <!-- Tips -->
    <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 text-xs text-zinc-400">
      <p>💡 <strong>Tips:</strong> Tekan lama pada foto di atas untuk langsung menyimpan ke galeri HP Anda.</p>
    </div>
  </div>

  <!-- Footer -->
  <div class="text-center text-[11px] text-zinc-600 py-4">
    Terima kasih telah berkunjung ke Photobox Studio • ${branchName}
  </div>
  <script>
    var poseUrls = [${allPoseUrls}];
    var poseNames = [${allPoseNames}];
    function downloadAll() {
      poseUrls.forEach(function (u, i) {
        setTimeout(function () {
          var a = document.createElement('a');
          a.href = u;
          a.download = poseNames[i] || ('pose_' + (i + 1) + '.jpg');
          document.body.appendChild(a);
          a.click();
          a.remove();
        }, i * 400);
      });
    }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Download photo error:', error);
    res.status(500).send('Gagal memuat foto.');
  }
});
