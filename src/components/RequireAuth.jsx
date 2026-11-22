import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Halaman yang butuh login: belum ada sesi -> /login. Saat sesi masih dicek, jangan redirect dulu.
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}
