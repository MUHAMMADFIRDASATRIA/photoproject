// ============================================================
// RBAC Types
// ============================================================

export interface Permission {
  id: number;
  code: string;
  description: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface JwtPayload {
  userId: number;
  roleId: number;
  branchId: number | null;
  permissions: string[];
  iat?: number;
  exp?: number;
}

// ============================================================
// Core Model Types
// ============================================================

export interface Branch {
  id: number;
  name: string;
  address: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: number;
  username: string;
  roleId: number;
  branchId: number | null; // null untuk superadmin
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SlotConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  radius?: number;
}

export interface Frame {
  id: number;
  branchId: number | null;
  name: string; // "Photo Strip 2x3", "Grid 4-Cut 4R"
  code: string; // "strip_3", "grid_4"
  width: number; // Lebar kanvas cetak (px)
  height: number; // Tinggi kanvas cetak (px)
  photoCount: number; // Jumlah jepretan/slot
  slotsConfig: SlotConfig[]; // Koordinat slot foto
  price: number; // Harga dasar
  thumbnailUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FrameDesign {
  id: number;
  branchId: number;
  frameId: number;
  name: string; // "Y2K Aesthetic", "Vintage Retro", "Pastel Pink"
  overlayUrl: string; // PNG transparan untuk border, logo, stiker
  backgroundUrl?: string | null; // Background image (opsional)
  bgColorHex?: string | null; // Warna background default (e.g. #FFFFFF)
  thumbnailUrl: string; // Preview di layar kiosk
  priceOverride?: number | null; // Harga kustom (opsional)
  slotBorderColor?: string | null; // Warna garis pinggir slot foto (opsional)
  slotBorderWidth?: number | null; // Ketebalan garis pinggir slot foto dalam px (opsional)
  backgroundLayer?: 'below' | 'above' | null; // 'below' = artwork di bawah slot foto; 'above' = artwork menutupi slot foto
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: number;
  branchId: number;
  frameId: number;
  designId: number;
  amount: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'expired';
  status: 'created' | 'paid' | 'capturing' | 'printing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export type PhotoKind = 'composite' | 'single';

export interface Photo {
  id: number;
  transactionId: number;
  branchId: number;
  kind: PhotoKind;
  slotIndex: number | null;
  localPath: string;
  cloudUrl: string | null;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  createdAt: Date;
}

export interface ActivityLog {
  id: number;
  userId: number;
  branchId: number | null;
  action: string;
  resource: string;
  resourceId: number | null;
  details: string | null;
  createdAt: Date;
}

// ============================================================
// Sync Types
// ============================================================

export interface SyncQueueItem {
  id: number;
  tableName: string;
  recordId: number;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  createdAt: Date;
}

export interface UploadQueueItem {
  id: number;
  photoId: number;
  filePath: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  retryCount: number;
  createdAt: Date;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
