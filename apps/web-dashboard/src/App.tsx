import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { SuperadminDashboardPage } from './pages/superadmin/SuperadminDashboardPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { FramesPage } from './pages/admin/FramesPage';
import { FrameFormPage } from './pages/admin/FrameFormPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { DesignsPage } from './pages/admin/DesignsPage';
import { BranchesPage } from './pages/superadmin/BranchesPage';
import { UsersPage } from './pages/superadmin/UsersPage';
import { RolesPage } from './pages/superadmin/RolesPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PERMISSIONS } from '@photobox/shared';

// Placeholder views for other tabs
function ComingSoonPage({ title, permissionCode }: { title: string; permissionCode: string }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-12 text-center backdrop-blur-xl">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
        Modul ini siap dikembangkan pada tahapan berikutnya.
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-mono text-indigo-300">
        Required permission: <code>{permissionCode}</code>
      </div>
    </div>
  );
}

// Smart Root Redirect based on user permission
function IndexRedirect() {
  const { user, hasPermission } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;

  if (hasPermission(PERMISSIONS.REPORT_VIEW_ALL_BRANCH)) {
    return <Navigate to="/superadmin" replace />;
  }
  return <Navigate to="/admin" replace />;
}

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Smart index redirect */}
          <Route index element={<IndexRedirect />} />

          {/* Superadmin Overview */}
          <Route
            path="superadmin"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.REPORT_VIEW_ALL_BRANCH}>
                <SuperadminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Branch Dashboard */}
          <Route
            path="admin"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.REPORT_VIEW}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Branches Management (Superadmin) */}
          <Route
            path="branches"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.BRANCH_VIEW}>
                <BranchesPage />
              </ProtectedRoute>
            }
          />

          {/* Users Management (Superadmin) */}
          <Route
            path="users"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.USER_VIEW}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          {/* Roles & Permissions Management (RBAC) */}
          <Route
            path="roles"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.ROLE_MANAGE}>
                <RolesPage />
              </ProtectedRoute>
            }
          />

          {/* Frames */}
          <Route
            path="frames"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.FRAME_VIEW}>
                <FramesPage />
              </ProtectedRoute>
            }
          />

          {/* Create Frame */}
          <Route
            path="frames/new"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.FRAME_CREATE}>
                <FrameFormPage />
              </ProtectedRoute>
            }
          />

          {/* Edit Frame */}
          <Route
            path="frames/:id/edit"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.FRAME_UPDATE}>
                <FrameFormPage />
              </ProtectedRoute>
            }
          />

          {/* Designs */}
          <Route
            path="designs"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.DESIGN_VIEW}>
                <DesignsPage />
              </ProtectedRoute>
            }
          />

          {/* Settings / Konfigurasi */}
          <Route
            path="settings"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.SETTING_MANAGE}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Activity Logs */}
          <Route
            path="activity-logs"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.LOG_VIEW}>
                <ComingSoonPage title="Audit Trail & Log Aktivitas Sistem" permissionCode={PERMISSIONS.LOG_VIEW} />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
