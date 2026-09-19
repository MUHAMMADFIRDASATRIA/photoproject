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
import { DesignFormPage } from './pages/admin/DesignFormPage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { BranchesPage } from './pages/superadmin/BranchesPage';
import { UsersPage } from './pages/superadmin/UsersPage';
import { RolesPage } from './pages/superadmin/RolesPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PERMISSIONS } from '@photobox/shared';

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

          {/* Create Design */}
          <Route
            path="designs/new"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.DESIGN_CREATE}>
                <DesignFormPage />
              </ProtectedRoute>
            }
          />

          {/* Edit Design */}
          <Route
            path="designs/:id/edit"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.DESIGN_UPDATE}>
                <DesignFormPage />
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
                <ActivityLogsPage />
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
