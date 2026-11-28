import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { authDestination } from '../authDestination';
import Skeleton from './Skeleton';

// Resolve the session before mounting a page outside the user's workspace.
export default function RoleRouteBoundary({ children }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <Skeleton variant="page" label="Memuat akun..." />;

  if (user && /^\/(login|register)\/?$/i.test(pathname)) return <Navigate to={authDestination(user.role)} replace />;

  if (user?.role === 'admin' && !/^\/admin(?:\/|$)/.test(pathname)) {
    return <Navigate to="/admin" replace />;
  }
  const workspace = /^\/vendor\/[^/]+/.test(pathname)
    && !/^\/vendor\/\d+(?:\/|$)/.test(pathname);
  if (user?.role === 'vendor' && !workspace) {
    return <Navigate to="/vendor/dashboard" replace />;
  }
  return children;
}
