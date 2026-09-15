# CLAUDE.md

Panduan ini menjadi acuan utama saat bekerja di project aplikasi Photobox. Baca dan ikuti aturan di sini sebelum menulis atau mengubah kode.

## 1. Gambaran Project

Aplikasi Photobox berbasis hybrid (Kiosk Desktop + Cloud Web Dashboard) dengan 3 role: **superadmin**, **admin**, **user**.

- **User** — pengunjung di lokasi. Login sebagai "akun device" di mesin kiosk, langsung ke alur: pilih tipe frame → pilih frame → bayar → foto → cetak → QR code untuk unduh foto. Tidak ada akun pelanggan individual.
- **Admin** — pemilik/pengelola 1 cabang. Login lewat **Web Dashboard (cloud)** dari browser web (PC/Laptop/Mobile) di mana saja. Akses dibatasi hanya ke data cabangnya sendiri: dashboard ringkasan, laporan pendapatan, CRUD frame cabang.
- **Superadmin** — pemilik sistem (developer). Login lewat **Web Dashboard (cloud)** dari browser web. Akses penuh ke semua cabang: kelola akun admin, kelola akun user (device), laporan gabungan semua cabang, log aktivitas, pengaturan role & permission (RBAC).

Sistem didesain **multi-tenant dari awal** meski saat ini baru 1 cabang, supaya menambah cabang baru cukup menambah 1 baris `branches` + 1 akun admin, tanpa refactor struktur.

## 2. Arsitektur

Model **hybrid**: database operasional lokal per cabang untuk kiosk offline resilience, serta sinkronisasi 2-arah ke cloud backend untuk melayani Web Dashboard (Admin & Superadmin).

```
[Mesin Kiosk per cabang]
├── PostgreSQL LOKAL      → transaksi, foto, operasional harian, cache frame & config
├── Backend API lokal     → Node.js + Express/NestJS + Prisma (localhost)
└── Electron + React      → alur user (kiosk UI, fullscreen)

        │ sync 2-arah berkala / per transaksi (queue-based, retry saat online)
        ▼
[Cloud — Supabase/Neon PostgreSQL + Cloud Storage]
├── Data master & ringkasan: transaksi, pendapatan, status mesin, master frame, users, log
└── Storage: Cloudflare R2 / Firebase Storage (untuk foto QR download)

        ▲
[Web Dashboard (Cloud) — React web app terpisah]
├── Dashboard Admin       → diakses via browser web oleh pemilik cabang (laporan, CRUD frame)
└── Dashboard Superadmin  → diakses via browser web oleh developer/pemilik sistem (RBAC, cabang, log)
```

**Prinsip penting:**

- **Dashboard Admin 100% berbasis Web (Cloud):** Admin cabang mengelola frame dan melihat laporan melalui browser web dari mana saja tanpa perlu mengakses atau berada di depan mesin kiosk.
- **Sinkronisasi Data Master:** Perubahan data dari Web Dashboard (seperti penambahan/edit frame) akan disinkronkan (pull) oleh mesin kiosk ke database lokal agar kiosk dapat menggunakan data frame terbaru.
- **Offline Resilience:** Data besar (file foto asli) **tidak pernah** dikirim ke cloud kecuali lewat proses upload ke object storage terpisah (Cloudflare R2 / Firebase Storage) untuk keperluan QR download. Jika internet putus, transaksi & operasional di lokasi **tetap jalan normal** menggunakan database lokal dan frame cache lokal.
- Semua proses cloud (upload foto, sync transaksi, fetch frame baru) wajib punya mekanisme queue + retry, tidak boleh blocking alur user di kiosk.
- Jangan pernah mendesain fitur yang membuat mesin kiosk bergantung mutlak pada koneksi cloud untuk operasi dasar (pilih frame, bayar, capture, cetak).

## 3. Tech Stack

| Layer                              | Teknologi                                                    |
| ---------------------------------- | ------------------------------------------------------------ |
| Kiosk app (user)                   | Electron + React + Vite                                      |
| Web Dashboard (Admin & Superadmin) | React web app terpisah (hosting Vercel/Netlify)              |
| State management                   | Zustand                                                      |
| Styling                            | Tailwind CSS                                                 |
| Backend API Kiosk (Lokal)          | Node.js + Express/NestJS                                     |
| Backend Cloud / API Cloud          | Supabase / Node.js API (Vercel/Cloud Provider)               |
| ORM                                | Prisma                                                       |
| Database lokal                     | PostgreSQL (instal di mesin kiosk)                           |
| Database cloud                     | PostgreSQL (Supabase / Neon)                                 |
| Auth                               | JWT + RBAC (role & permission dari database, bukan hardcode) |
| Payment                            | Midtrans / Xendit (QRIS)                                     |
| Cloud storage foto                 | Cloudflare R2 / Firebase Storage                             |
| QR Code                            | qrcode.react                                                 |
| Kamera                             | getUserMedia (webcam) atau gphoto2 (DSLR)                    |
| Print                              | CUPS / pdf-to-printer                                        |
| Packaging Kiosk                    | electron-builder                                             |

Jangan mengganti pilihan stack ini tanpa didiskusikan dulu, terutama pilihan PostgreSQL lokal + hybrid sync — ini sudah disesuaikan dengan kondisi 1 mesin per cabang dengan koneksi internet yang kadang tidak stabil.

## 4. Aturan RBAC (Wajib Diikuti)

- **Permission adalah satu-satunya sumber kebenaran**, disimpan di tabel `role_permissions`. Jangan pernah menulis pengecekan akses berbasis nama role langsung di kode (`if role === 'superadmin'`). Selalu cek berdasarkan kode permission (`role.manage`, `frame.create`, dst).
- Backend: setiap route yang me-require proteksi wajib memakai middleware `checkPermission('kode.permission')`.
- Frontend (Web Dashboard & Kiosk): setiap halaman/menu yang butuh proteksi wajib dibungkus komponen guard (`<ProtectedRoute requiredPermission="...">`) dan menu sidebar wajib difilter berdasarkan permission user yang login.
- JWT payload menyimpan daftar permission user (bukan cuma role_id) supaya tidak perlu query ulang ke DB tiap request.
- Permission `role.manage` (akses ke pengaturan role & permission) **wajib di-hardcode terkunci pada role superadmin** — tidak boleh bisa dicabut lewat UI, untuk mencegah superadmin terkunci dari sistemnya sendiri.
- Setiap kali menambah halaman/fitur admin atau superadmin baru di Web Dashboard: tentukan nama permission-nya dulu (format `resource.action`, contoh: `frame.delete`, `report.view_all_branch`), lalu terapkan di backend dan frontend secara bersamaan. Jangan menambah halaman tanpa permission terkait.

## 5. Konvensi Skema Database

Setiap tabel yang datanya milik cabang tertentu **wajib** punya kolom `branch_id`, termasuk saat baru ada 1 cabang. Ini termasuk: `frames`, `transactions`, `photos`, `devices`, dan tabel operasional lain yang akan ditambahkan.

Tabel inti minimal:

| Tabel              | Keterangan                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `branches`         | Data cabang                                                                                        |
| `roles`            | Daftar role (bisa ditambah lewat dashboard superadmin)                                             |
| `permissions`      | Daftar kode permission                                                                             |
| `role_permissions` | Relasi many-to-many role ↔ permission                                                              |
| `users`            | Semua akun (superadmin/admin/user-device), punya `role_id` dan `branch_id` (null untuk superadmin) |
| `frames`           | Frame per cabang (dibuat di Web Dashboard, di-sync ke Kiosk)                                       |
| `transactions`     | Transaksi per cabang                                                                               |
| `photos`           | Foto hasil transaksi, path lokal + url cloud setelah upload                                        |
| `activity_logs`    | Log aksi sensitif (tambah/hapus frame, ubah role, nonaktifkan akun, dll)                           |
| `sync_queue`       | Antrian sinkronisasi data lokal ↔ cloud                                                            |
| `upload_queue`     | Antrian upload foto ke cloud storage                                                               |

Setiap aksi sensitif (create/update/delete oleh admin atau superadmin di Web Dashboard) wajib dicatat ke `activity_logs` — jangan lewatkan ini saat membuat fitur CRUD baru.

## 6. Aturan Development

- Gunakan **Prisma migration**, jangan mengubah skema database secara manual/langsung ke DB.
- Query laporan & CRUD di Web Dashboard **wajib difilter** berdasarkan `branch_id` milik admin yang login — jangan pernah mengandalkan filter di frontend saja, validasi juga di backend cloud.
- Jangan menaruh logic bisnis penting (validasi harga, status transaksi, dsb) hanya di frontend.
- Proses yang me-require internet (payment, upload foto, sync cloud, pull master frame) harus non-blocking terhadap alur utama user di kiosk.
- Ikuti struktur folder monorepo (disarankan): pisahkan `apps/kiosk` (Electron+React), `apps/web-dashboard` (React web app untuk Admin & Superadmin), `apps/api-local`, `apps/api-cloud` (atau pakai Supabase langsung), dan `packages/shared` untuk tipe & util bersama.
- Semua environment/secrets (DB connection string, API key payment, storage credential) lewat `.env`, jangan hardcode di kode.

## 7. Yang Harus Ditanyakan Sebelum Menambah Fitur Baru

Sebelum menambah fitur besar, pastikan sudah jelas:

1. Fitur ini diterapkan di Kiosk app atau Web Dashboard (Admin/Superadmin)?
2. Fitur ini butuh permission baru atau pakai permission yang sudah ada?
3. Data terkait fitur ini perlu di-scope per `branch_id` atau global (khusus superadmin)?
4. Fitur ini butuh sync 2-arah lokal ↔ cloud, atau cukup lokal/cloud saja?
5. Apakah fitur ini harus tetap berfungsi saat internet mati di lokasi kiosk?

Jika ragu pada salah satu poin di atas, tanyakan dulu sebelum implementasi, jangan berasumsi.
