import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Clock, LoaderCircle, XCircle } from 'lucide-react';
import { api } from '../../api';
import CheckoutHead, { money } from './CheckoutSteps';
import './live-cart.css';
import './live-payment.css';

const statusLabel = { menunggu_pembayaran: 'Menunggu pembayaran', menunggu_konfirmasi: 'Menunggu konfirmasi vendor', dikonfirmasi: 'Dikonfirmasi vendor' };

/** /booking/terkonfirmasi?ref=...: hasil pembayaran Midtrans, status dibaca server dari Midtrans. */
export default function LiveBooking() {
  const ref = useSearchParams()[0].get('ref') || '';
  const [state, setState] = useState({ ready: !ref, data: null, error: ref ? '' : 'Referensi pembayaran tidak ditemukan.' });
  const [checking, setChecking] = useState(false);
  const load = useCallback(() => {
    setChecking(true);
    return api(`/api/customer/payments/confirmation?ref=${encodeURIComponent(ref)}`)
      .then(data => setState({ ready: true, data, error: '' }), error => setState({ ready: true, data: null, error: error.message }))
      .finally(() => setChecking(false));
  }, [ref]);
  useEffect(() => { if (ref) load(); }, [ref, load]);

  const paid = state.data?.state === 'paid', pending = state.data?.state === 'pending';
  const settling = state.data?.kind === 'pelunasan';
  const retry = state.data ? `/keranjang?orders=${state.data.orders.map(order => order.orderId).join(',')}` : '/keranjang';
  const current = paid ? 2 : 1;
  const head = <CheckoutHead current={current} crumb="Booking" title={paid ? settling ? 'Pelunasan Diterima' : 'Booking Terkonfirmasi' : 'Status Pembayaran'} subtitle={paid ? settling ? 'Biaya sewa Anda sudah lunas.' : 'Deposit Anda sudah kami terima.' : 'Kami memeriksa pembayaran Anda ke Midtrans.'} />;

  if (!state.ready) return <div className="cart-page">{head}<div className="cart-empty" role="status"><LoaderCircle className="wishlist-spinner" size={28} /><p>Memeriksa status pembayaran…</p></div></div>;
  if (!state.data) return <div className="cart-page">{head}<div className="cart-empty"><XCircle size={34} /><h2>Pembayaran tidak ditemukan</h2><p>{state.error}</p><Link className="cart-primary" to="/pesanan">Lihat pesanan saya <ArrowRight size={16} /></Link></div></div>;

  return <div className="cart-page">{head}
    <section className={`cart-done booking-${state.data.state}`} role="status">
      <span className="cart-done-icon">{paid ? <Check size={28} /> : pending ? <Clock size={28} /> : <XCircle size={28} />}</span>
      <h2>{paid ? 'Pembayaran berhasil' : pending ? 'Menunggu pembayaran selesai' : 'Pembayaran belum berhasil'}</h2>
      <p>{paid ? settling ? 'Vendor sudah diberi tahu dan akan menyiapkan serah terima alat.' : 'Deposit jaminan disimpan Vendoria. Vendor akan segera mengonfirmasi pesanan Anda, lalu Anda diminta melunasi biaya sewa.'
        : pending ? 'Kami belum menerima konfirmasi dari Midtrans. Bila Anda sudah membayar, tunggu beberapa saat lalu periksa kembali.'
        : 'Pembayaran dibatalkan atau kedaluwarsa. Pesanan Anda tetap tersimpan, silakan bayar kembali.'}</p>
      <ul>{state.data.orders.map(order => <li key={order.orderId}>
        <div><strong>#{order.code}</strong><span>{order.vendorName}</span></div>
        <div><strong>{money(settling ? order.total : order.deposit)}</strong><span>{settling && paid ? 'Lunas, menunggu serah terima' : statusLabel[order.status] || order.status}</span></div>
      </li>)}</ul>
      <p className="booking-ref">No. transaksi <b>{state.data.reference}</b> · Total {money(state.data.amount)}</p>
      <div className="booking-actions">
        {paid ? <><Link className="cart-primary" to="/pesanan">Lihat pesanan saya <ArrowRight size={16} /></Link><Link className="booking-secondary" to="/catalog">Jelajahi katalog</Link></>
          : <>{pending && <button type="button" className="booking-secondary" disabled={checking} onClick={load}>{checking ? 'Memeriksa…' : 'Periksa status'}</button>}<Link className="cart-primary" to={retry}>{pending ? 'Lanjut bayar' : 'Bayar kembali'} <ArrowRight size={16} /></Link></>}
      </div>
    </section>
  </div>;
}
