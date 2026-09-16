// ============================================================
// Permission Codes — format: resource.action
// Sesuai CLAUDE.md §4: permission adalah satu-satunya sumber kebenaran
// ============================================================

export const PERMISSIONS = {
  // Role & Permission management (superadmin only, hardcoded)
  ROLE_MANAGE: 'role.manage',

  // Branch management
  BRANCH_VIEW: 'branch.view',
  BRANCH_CREATE: 'branch.create',
  BRANCH_UPDATE: 'branch.update',
  BRANCH_DELETE: 'branch.delete',

  // User/Account management
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',

  // Frame management (Bentuk/Tipe)
  FRAME_VIEW: 'frame.view',
  FRAME_CREATE: 'frame.create',
  FRAME_UPDATE: 'frame.update',
  FRAME_DELETE: 'frame.delete',

  // Frame Design management (Artwork/Tema)
  DESIGN_VIEW: 'design.view',
  DESIGN_CREATE: 'design.create',
  DESIGN_UPDATE: 'design.update',
  DESIGN_DELETE: 'design.delete',

  // Transaction & Reports
  TRANSACTION_VIEW: 'transaction.view',
  REPORT_VIEW: 'report.view',
  REPORT_VIEW_ALL_BRANCH: 'report.view_all_branch',

  // Activity Log
  LOG_VIEW: 'log.view',
  LOG_VIEW_ALL_BRANCH: 'log.view_all_branch',

  // Device management
  DEVICE_VIEW: 'device.view',
  DEVICE_MANAGE: 'device.manage',

  // Settings / Konfigurasi
  SETTING_MANAGE: 'setting.manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ============================================================
// Default Roles
// ============================================================

export const DEFAULT_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  USER: 'user',
} as const;

// ============================================================
// Transaction & Payment
// ============================================================

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const;

export const TRANSACTION_STATUS = {
  CREATED: 'created',
  PAID: 'paid',
  CAPTURING: 'capturing',
  PRINTING: 'printing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

// ============================================================
// Pengaturan Cabang / Global (BranchSetting)
// ============================================================

export const SETTINGS_KEYS = {
  PHOTO_SESSION_TIMEOUT_MINUTES: 'photo_session_timeout_minutes',
} as const;

export const SETTING_DEFAULTS = {
  PHOTO_SESSION_TIMEOUT_MINUTES: 5,
} as const;
