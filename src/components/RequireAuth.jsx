import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Halaman yang butuh login: belum ada sesi -> /login. Saat sesi masih dicek, jangan redirect dulu.
// `role` (opsional): hanya role itu yang boleh masuk, lainnya ke beranda. Ini hanya pengatur tampilan;
// yang melindungi data adalah pemeriksaan di backend.
export default function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return role && user.role !== role ? <Navigate to="/" replace /> : children;
}
