import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function ProtectedMemberRoute({ children }: { children: ReactNode }) {
  const { session, member, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-forest-500">
        載入中...
      </div>
    );
  }

  if (!session || !member) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export default ProtectedMemberRoute;
