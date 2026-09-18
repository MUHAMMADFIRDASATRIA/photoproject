import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, checkPermission, AuthenticatedRequest } from '../middleware/auth';
import { PERMISSIONS } from '@photobox/shared';

export const uploadsRouter = Router();

// Pastikan folder uploads ada
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Konfigurasi multer — simpan file dengan nama unik
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, uniqueName);
  },
});

/**
 * Deteksi tipe gambar sesungguhnya dari magic bytes (bukan sekadar mimetype
 * yang dikirim klien, yang mudah dipalsukan).
 */
function detectImageType(buf: Buffer): 'png' | 'jpeg' | 'webp' | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpeg';
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // Max 20 MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.png', '.jpg', '.jpeg', '.webp'];
    // Browser kadang mengirim mimetype generik (octet-stream) walau file-nya gambar
    if (allowedTypes.includes(file.mimetype) || (file.mimetype === 'application/octet-stream' && allowedExts.includes(ext))) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (PNG, JPG, WEBP) yang diperbolehkan.'));
    }
  },
});

/**
 * POST /api/uploads
 * Upload gambar desain (background) dari perangkat admin
 * Returns: { success: true, url: "/uploads/filename.png" }
 */
uploadsRouter.post(
  '/',
  authenticateToken,
  checkPermission(PERMISSIONS.DESIGN_CREATE),
  upload.single('file'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'Tidak ada file yang diunggah.' });
        return;
      }

      // Verifikasi isi file benar-benar gambar (magic bytes), bukan file yang
      // sekadar di-rename menjadi .png/.jpg.
      const fd = fs.openSync(req.file.path, 'r');
      const header = Buffer.alloc(12);
      fs.readSync(fd, header, 0, 12, 0);
      fs.closeSync(fd);

      if (!detectImageType(header)) {
        fs.unlinkSync(req.file.path);
        res.status(400).json({
          success: false,
          error: 'Isi file bukan gambar yang valid (PNG, JPG, atau WEBP).',
        });
        return;
      }

      // Paksa ekstensi file mengikuti tipe gambar yang terdeteksi.
      const detected = detectImageType(header)!;
      const ext = detected === 'jpeg' ? '.jpg' : `.${detected}`;
      const currentExt = path.extname(req.file.path).toLowerCase();
      if (currentExt !== ext && !(ext === '.jpg' && currentExt === '.jpeg')) {
        const safePath = req.file.path.slice(0, -currentExt.length) + ext;
        fs.renameSync(req.file.path, safePath);
        req.file.path = safePath;
        req.file.filename = path.basename(safePath);
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({
        success: true,
        data: {
          url: fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Gagal mengunggah file.' });
    }
  },
);
