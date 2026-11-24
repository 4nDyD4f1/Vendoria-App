import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { money } from './vendorData';
import {
  actOnVendorOrder,
  claimStatusLabels,
  formatOrderDate,
  formatOrderDateTime,
  getVendorOrder,
  kycLabels,
  orderStatusLabels,
  paymentMethodLabels,
  paymentStatusLabels,
  paymentTypeLabels,
} from './vendorOrdersApi';

export function OrderStatusBadge({ status }) {
  return <span className={`vendor-order-status vendor-order-status-${status}`}><i aria-hidden="true" />{orderStatusLabels[status] || status}</span>;
}

export function OrderDetailSections({ detail }) {
  const { order } = detail;
  return <>
    <div className="vendor-orders-summary-row">
      <OrderStatusBadge status={order.status_pesanan} />
      <p>Dipesan pada {formatOrderDateTime(order.tanggal_pemesanan)}</p>
    </div>

    <dl className="vendor-orders-details">
      <div><dt>Kode pesanan</dt><dd>{order.kode_pemesanan}</dd></div>
      <div><dt>Pelanggan</dt><dd>{order.customer_name}</dd></div>
      <div><dt>Email pelanggan</dt><dd>{order.customer_email}</dd></div>
      <div><dt>Nomor WhatsApp</dt><dd>{order.customer_phone || 'Belum diisi'}</dd></div>
      <div><dt>Verifikasi KYC</dt><dd>{kycLabels[detail.customer_verification] || detail.customer_verification}</dd></div>
      <div><dt>Periode sewa</dt><dd>{formatOrderDate(order.tanggal_mulai_sewa)} – {formatOrderDate(order.tanggal_selesai_sewa)}</dd></div>
      <div className="vendor-orders-detail-wide"><dt>Lokasi acara</dt><dd>{order.lokasi_acara || 'Belum diisi'}</dd></div>
      <div><dt>Total biaya sewa</dt><dd className="v-number">{money(order.total_biaya_sewa)}</dd></div>
      <div><dt>Minimal DP</dt><dd className="v-number">{money(order.total_dp)}</dd></div>
      <div><dt>Pembayaran terverifikasi</dt><dd className="v-number">{money(detail.verified_payment_total)}</dd></div>
    </dl>

    <section className="vendor-orders-subsection">
      <h3>Perlengkapan disewa</h3>
      {detail.items.length ? <div className="vendor-orders-subtable-wrap">
        <table className="vendor-orders-subtable">
          <thead><tr><th>Alat</th><th>Kategori</th><th>Jumlah</th><th>Harga / hari</th><th>Subtotal</th></tr></thead>
          <tbody>{detail.items.map(item => <tr key={item.order_detail_id}>
            <td><strong>{item.nama_barang}</strong></td>
            <td>{item.nama_kategori}</td>
            <td className="v-number">{item.jumlah_sewa}</td>
            <td className="v-number">{money(item.harga_saat_sewa)}</td>
            <td className="v-number">{money(item.subtotal)}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="vendor-orders-muted">Belum ada item tercatat pada pesanan ini.</p>}
    </section>

    {detail.payments.length > 0 && <section className="vendor-orders-subsection">
      <h3>Riwayat pembayaran</h3>
      <ul className="vendor-orders-list">
        {detail.payments.map(payment => <li key={payment.pembayaran_id}>
          <div>
            <strong>{paymentTypeLabels[payment.jenis] || payment.jenis} · {paymentMethodLabels[payment.metode] || payment.metode}</strong>
            <small>{formatOrderDateTime(payment.dibayar_pada || payment.dibuat_pada)}</small>
          </div>
          <div className="vendor-orders-list-right">
            <strong className="v-number">{money(payment.jumlah)}</strong>
            <small>{paymentStatusLabels[payment.status] || payment.status}</small>
          </div>
        </li>)}
      </ul>
    </section>}

    {detail.claims.length > 0 && <section className="vendor-orders-subsection">
      <h3>Klaim terkait</h3>
      <ul className="vendor-orders-list">
        {detail.claims.map(claim => <li key={claim.klaim_id}>
          <div>
            <strong>KLM-{claim.klaim_id} · {claim.alasan}</strong>
            <small>Diajukan {formatOrderDateTime(claim.diajukan_pada)}</small>
          </div>
          <div className="vendor-orders-list-right">
            <strong>{claimStatusLabels[claim.status] || claim.status}</strong>
          </div>
        </li>)}
      </ul>
    </section>}

    <section className="vendor-orders-subsection">
      <h3>Riwayat status</h3>
      {detail.history.length ? <ul className="vendor-orders-list">
        {detail.history.map(entry => <li key={entry.riwayat_id}>
          <div>
            <strong>{entry.status_sebelumnya ? `${orderStatusLabels[entry.status_sebelumnya] || entry.status_sebelumnya} → ` : ''}{orderStatusLabels[entry.status_baru] || entry.status_baru}</strong>
            <small>{entry.diubah_oleh ? `Oleh ${entry.diubah_oleh} · ` : ''}{formatOrderDateTime(entry.diubah_pada)}</small>
            {entry.catatan && <p className="vendor-orders-history-note">{entry.catatan}</p>}
          </div>
        </li>)}
      </ul> : <p className="vendor-orders-muted">Belum ada catatan perubahan status.</p>}
    </section>
  </>;
}

function transitionGuidance(order) {
  if (order.can_process) {
    return `Langkah proses berikutnya: ${order.next_action_label} (${orderStatusLabels[order.status_pesanan]} → ${orderStatusLabels[order.next_status]}).`;
  }
  if (order.status_pesanan === 'menunggu_pembayaran') {
    return 'Pesanan masih menunggu pembayaran dari pelanggan sehingga belum dapat diproses. Anda masih dapat membatalkan pesanan ini jika diperlukan.';
  }
  if (order.status_pesanan === 'dikembalikan' && order.has_open_claim) {
    return 'Pesanan memiliki klaim aktif yang masih menunggu keputusan admin sebelum dapat diselesaikan.';
  }
  if (order.status_pesanan === 'selesai' || order.status_pesanan === 'dibatalkan') {
    return `Pesanan ini sudah berstatus ${orderStatusLabels[order.status_pesanan]} dan tidak dapat diubah lagi.`;
  }
  return '';
}

export default function OrderProcessModal({ orderId, onClose, onCompleted }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const pending = useRef(false);
  const dialog = useRef(null);
  const host = document.querySelector('.vendor-workspace') || document.body;

  useEffect(() => {
    const lifecycle = new AbortController();
    getVendorOrder(orderId)
      .then(value => { if (!lifecycle.signal.aborted) { setDetail(value); setError(''); } })
      .catch(reason => { if (!lifecycle.signal.aborted) setError(reason.message); });
    return () => lifecycle.abort();
  }, [orderId]);

  useEffect(() => {
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = [...host.children]
      .filter(element => !element.contains(dialog.current))
      .map(element => [element, element.inert]);
    background.forEach(([element]) => { element.inert = true; });
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('button')?.focus();
    return () => {
      background.forEach(([element, previous]) => { element.inert = previous; });
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [host]);

  const submit = async action => {
    if (pending.current || !detail) return;
    pending.current = true;
    setBusyAction(action);
    setError('');
    try {
      const updated = await actOnVendorOrder(orderId, {
        action,
        catatan: note.trim() || null,
        expected_status: detail.order.status_pesanan,
      });
      onCompleted(updated, action);
    } catch (reason) {
      setError(reason.message);
    } finally {
      pending.current = false;
      setBusyAction('');
    }
  };

  const busy = Boolean(busyAction);
  const order = detail?.order;
  const canWriteNote = Boolean(order && (order.can_process || order.can_cancel));

  return createPortal(
    <div
      className="v-modal-backdrop vendor-orders-modal-backdrop"
      onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}
    >
      <section
        className="v-modal vendor-orders-modal"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-order-modal-title"
        aria-busy={busy}
        onKeyDown={event => {
          if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose(); }
          if (event.key === 'Tab') {
            const controls = [...dialog.current.querySelectorAll('button:not(:disabled),textarea:not(:disabled),a[href]')];
            const first = controls[0];
            const last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}
      >
        <div className="v-modal-heading">
          <div>
            <p className="v-eyebrow">DETAIL &amp; PEMROSESAN PESANAN</p>
            <h2 id="vendor-order-modal-title">{order ? `Pesanan ${order.kode_pemesanan}` : `Pesanan #${orderId}`}</h2>
          </div>
          <button type="button" className="v-icon-button" aria-label="Tutup modal detail pesanan" disabled={busy} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && <p role="alert" className="vendor-orders-error">{error}</p>}

        <div className="vendor-orders-modal-body">
          {!detail ? !error && <p role="status" className="vendor-orders-muted">Memuat detail pesanan…</p> : <>
            <OrderDetailSections detail={detail} />
            <p className="vendor-orders-hint">{transitionGuidance(order)}</p>
            {['dikonfirmasi', 'berjalan', 'dikembalikan'].includes(order.status_pesanan) && <p className="vendor-orders-hint"><Link className="v-text-button" to={`/vendor/serah-terima/${order.order_id}`} onClick={onClose}>Buka pemeriksaan &amp; bukti serah terima</Link> · Empat foto dan catatan kondisi setiap alat wajib lengkap sebelum tahap berikutnya.</p>}
            {canWriteNote && <label className="v-field vendor-orders-note">
              <span>Catatan pemrosesan / pembatalan (opsional)</span>
              <textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                maxLength={1000}
                rows={3}
                disabled={busy}
                placeholder="Tambahkan catatan status untuk riwayat pesanan…"
              />
            </label>}
          </>}
        </div>

        {detail && <div className="vendor-orders-modal-actions">
          <button
            type="button"
            className="v-button v-button-danger"
            disabled={busy || !order.can_cancel}
            onClick={() => submit('batalkan')}
          >
            {busyAction === 'batalkan' ? 'Membatalkan…' : 'Batalkan'}
          </button>
          <button
            type="button"
            className="v-button v-button-primary"
            disabled={busy || !order.can_process}
            onClick={() => submit('proses')}
          >
            {busyAction === 'proses' ? 'Memproses…' : 'Proses'}
          </button>
        </div>}
      </section>
    </div>,
    host,
  );
}
