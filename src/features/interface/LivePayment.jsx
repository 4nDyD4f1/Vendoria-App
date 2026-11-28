import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, LoaderCircle, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { api } from '../../api';
import CheckoutHead, { money } from './CheckoutSteps';
import { useCheckoutKyc } from '../kyc/useCheckoutKyc';
import './live-cart.css';
import './live-payment.css';
import Skeleton from '../../components/Skeleton';

const heading = settling => <CheckoutHead current={1} crumb="Pembayaran" title={settling ? 'Pelunasan Sewa' : 'Pembayaran Deposit'} subtitle={settling ? 'Lunasi biaya sewa agar vendor bisa menyerahkan alat.' : 'Bayar deposit untuk mengamankan jadwal dan alat sewa Anda.'} />;

/** /pembayaran/bank: tagihan deposit atau pelunasan, lalu pindah ke halaman pembayaran Midtrans. */
export default function LivePayment() {
  const kyc = useCheckoutKyc();
  const [params] = useSearchParams();
  const orders = params.get('orders') || '';
  const [state, setState] = useState({ ready: false, data: null, error: '' });
  const [pay, setPay] = useState({ pending: false, error: '' });

  useEffect(() => {
    let active = true;
    api(`/api/customer/payments${orders ? `?orders=${encodeURIComponent(orders)}` : ''}`)
      .then(data => { if (active) setState({ ready: true, data, error: '' }); }, error => { if (active) setState({ ready: true, data: null, error: error.message }); });
    return () => { active = false; };
  }, [orders]);

  const unpaid = state.data?.orders.filter(order => order.kind) || [];
  const settling = unpaid.length > 0 && unpaid.every(order => order.kind === 'pelunasan');
  const what = settling ? 'Pelunasan sewa' : 'Deposit';
  const head = heading(settling);

  if (!state.ready) return <div className="cart-page">{head}<Skeleton variant="detail" label="Memuat tagihan…" /></div>;
  if (!state.data || !Number(state.data.amountDue)) return <div className="cart-page">{head}
    <div className="cart-empty"><Wallet size={34} /><h2>{state.error ? 'Tagihan tidak ditemukan' : 'Tidak ada tagihan yang harus dibayar'}</h2>
      <p>{state.error || 'Tagihan pesanan ini sudah dibayar.'}</p>
      <Link className="cart-primary" to="/pesanan">Lihat pesanan saya <ArrowRight size={16} /></Link></div></div>;

  const { data } = state;
  const start = async () => {
    setPay({ pending: true, error: '' });
    try {
      if (!await kyc.verify()) { setPay({ pending: false, error: '' }); return; }
      const result = await api('/api/customer/payments', { method: 'POST', headers: { 'X-Payment-Request': '1' }, body: { orderIds: unpaid.map(order => order.orderId) } });
      window.location.assign(result.redirectUrl); // keluar ke Midtrans; kembali ke /booking/terkonfirmasi setelah selesai
    } catch (failure) { setPay({ pending: false, error: kyc.reject(failure) ? '' : failure.message }); }
  };

  return <div className="cart-page">{head}
    <div className="cart-layout">
      <section className="cart-card pay-orders" aria-labelledby="pay-orders-title">
        <h2 id="pay-orders-title">Rincian Pesanan</h2>
        <ul>{data.orders.map(order => <li key={order.orderId}>
          <div><strong>#{order.code}</strong><span>{order.vendorName}</span></div>
          <dl><div><dt>Total sewa</dt><dd>{money(order.total)}</dd></div><div><dt>Deposit jaminan</dt><dd>{order.status === 'menunggu_pembayaran' ? money(order.deposit) : <em><Check size={13} />Sudah dibayar</em>}</dd></div>{order.kind === 'pelunasan' && <div><dt>Tagihan pelunasan</dt><dd>{money(order.due)}</dd></div>}</dl>
        </li>)}</ul>
        <p className="pay-note"><ShieldCheck size={16} />Deposit adalah jaminan dan tidak mengurangi biaya sewa. Dikembalikan setelah alat diperiksa tanpa masalah; diberikan ke vendor bila laporan kerusakan disetujui admin.</p>
      </section>
      <aside className="cart-summary" aria-label="Ringkasan pembayaran">
        <h2>Jumlah yang harus dibayar</h2>
        <p className="pay-amount">{money(data.amountDue)}</p>
        <p className="pay-sub">{what} untuk {unpaid.length} pesanan</p>
        {pay.error && <p className="cart-alert" role="alert">{pay.error}</p>}
        {kyc.notice}
        <button className="cart-primary" type="button" disabled={pay.pending} onClick={start}>{pay.pending ? <LoaderCircle className="wishlist-spinner" size={16} /> : <Lock size={16} />}Bayar<ArrowRight size={16} /></button>
        <ul className="cart-assure"><li><Check size={14} />Anda diarahkan ke halaman pembayaran aman Midtrans</li><li><Check size={14} />Pilih metode bayar langsung di Midtrans</li><li><Check size={14} />{settling ? 'Vendor mendapat notifikasi begitu pembayaran berhasil' : 'Pesanan otomatis terkonfirmasi setelah pembayaran berhasil'}</li></ul>
      </aside>
    </div>
  </div>;
}
