import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

/**
 * Route guard komponen
 * Sesuai CLAUDE.md §4: Setiap halaman yang butuh proteksi wajib dibungkus <ProtectedRoute requiredPermission="...">
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { isAuthenticated, isLoading, hasPermission } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-zinc-400">Memverifikasi otentikasi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-white">
        <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-8 max-w-md shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Akses Ditolak</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Akun Anda tidak memiliki izin <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-red-300">{requiredPermission}</code> untuk membuka halaman ini.
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-6 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
