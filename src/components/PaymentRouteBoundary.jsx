import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { authDestination } from '../authDestination';
import { canEnterPayment, clearPaymentEntry, paymentOrders } from '../features/interface/paymentEntry';

export default function PaymentRouteBoundary({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const payment = /^\/pembayaran(?:\/|$)/i.test(location.pathname);
  useEffect(() => { if (!payment) clearPaymentEntry(); }, [payment, location.key]);

  if (!payment) return children;
  if (loading) return <div className="p-10" role="status">Memuat akun...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'customer') return <Navigate to={authDestination(user.role)} replace />;
  const orders = paymentOrders(new URLSearchParams(location.search).get('orders'));
  if (!canEnterPayment(user.user_id, location.state, orders)) {
    return <Navigate to={`/keranjang${orders ? `?orders=${orders}` : ''}`} replace />;
  }
  return children;
}
