import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { api } from '../../api';
import { money } from './CheckoutSteps';
import { paymentFromCart } from './paymentEntry';
import { useCheckoutKyc } from '../kyc/useCheckoutKyc';

// An existing unpaid order is reviewed in the cart before entering payment again.
export default function CartPendingPayment({ orders }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const kyc = useCheckoutKyc();
  const [continueError, setContinueError] = useState('');
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    const lifecycle = new AbortController();
    api(`/api/customer/payments?orders=${encodeURIComponent(orders)}`)
      .then(data => { if (!lifecycle.signal.aborted) setState({ loading: false, data, error: '' }); })
      .catch(error => { if (!lifecycle.signal.aborted) setState({ loading: false, data: null, error: error.message }); });
    return () => lifecycle.abort();
  }, [orders]);
  const unpaid = state.data?.orders.filter(order => order.kind) || [];
  const settling = unpaid.length > 0 && unpaid.every(order => order.kind === 'pelunasan');
  return <section className="cart-card cart-pending-payment" aria-labelledby="cart-pending-title">
    <h2 id="cart-pending-title">Lanjutkan pembayaran pesanan</h2>
    {state.loading ? <p role="status"><LoaderCircle className="wishlist-spinner" size={16} /> Memuat pesanan...</p>
      : state.error ? <p className="cart-alert" role="alert">{state.error}</p>
        : <><p>Tinjau pesanan yang sudah dibuat sebelum melanjutkan {settling ? 'pelunasan sewa' : 'pembayaran deposit'}.</p>
          <ul>{state.data.orders.map(order => <li key={order.orderId}><div><strong>#{order.code}</strong><span>{order.vendorName}</span></div><strong>{order.kind ? money(order.due) : 'Tidak menunggu pembayaran'}</strong></li>)}</ul>
          {Number(state.data.amountDue) > 0 && unpaid.length > 0 ? <><div className="cart-pending-total"><span>{settling ? 'Total pelunasan' : 'Total deposit'}</span><strong>{money(state.data.amountDue)}</strong></div>
            {kyc.notice}
            {continueError && <p className="cart-alert" role="alert">{continueError}</p>}
            <button className="cart-primary" type="button" disabled={kyc.checking} onClick={async () => {
              setContinueError('');
              try {
                if (!await kyc.verify()) return;
                const entry = paymentFromCart(user.user_id, unpaid.map(order => order.orderId));
                navigate(entry.to, { state: entry.state });
              } catch (error) { if (!kyc.reject(error)) setContinueError(error.message); }
            }}>{kyc.checking ? <LoaderCircle className="wishlist-spinner" size={16} /> : null}Lanjut ke pembayaran <ArrowRight size={16} /></button></> : <p>Pesanan ini sudah tidak menunggu pembayaran.</p>}
        </>}
    <div className="cart-pending-links"><Link to="/keranjang">Lihat keranjang alat</Link><Link to="/pesanan">Lihat pesanan saya</Link></div>
  </section>;
}
