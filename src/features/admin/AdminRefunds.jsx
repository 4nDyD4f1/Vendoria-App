import { useCallback, useEffect, useState } from 'react';
import { EmptyState, Modal, Status } from '../vendor/VendorUi';
import { money } from '../vendor/vendorData';
import { completeRefund, listRefunds } from './reportsApi';
import Skeleton from '../../components/Skeleton';

const labels = { menunggu: 'Menunggu', diproses: 'Diproses', berhasil: 'Selesai', gagal: 'Gagal', dibatalkan: 'Dibatalkan' };

/** Pengembalian dana (deposit jaminan) ke customer: ditransfer manual, lalu ditandai di sini. */
export default function AdminRefunds() {
  const [state, setState] = useState({ items: null, error: '' });
  const [selected, setSelected] = useState(null);
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => listRefunds().then(
    items => setState({ items, error: '' }),
    reason => setState({ items: null, error: reason.message })), []);
  useEffect(() => { load(); }, [load]);

  const open = item => { setSelected(item); setReference(''); setError(''); };
  const submit = async event => {
    event.preventDefault();
    if (!reference.trim() || busy) return;
    setBusy(true); setError('');
    try { await completeRefund(selected.id, reference.trim()); setSelected(null); await load(); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };

  return <section className="v-card" aria-label="Pengembalian dana customer" style={{ marginTop: 24 }}>
    <div className="admin-kyc-toolbar"><h2>Pengembalian dana ke customer</h2></div>
    {state.error ? <p className="kyc-error admin-kyc-list-error" role="alert">{state.error}</p> : !state.items ? <Skeleton variant="list" label="Memuat pengembalian dana…" /> : !state.items.length ? <EmptyState title="Belum ada pengembalian dana" description="Deposit jaminan yang harus dikembalikan akan muncul di sini." />
      : <div className="v-table-scroll"><table className="v-table"><thead><tr><th>Pesanan</th><th>Customer</th><th>Jumlah</th><th>Alasan</th><th>Rekening tujuan</th><th>Status</th><th>Operasi</th></tr></thead><tbody>{state.items.map(item => <tr key={item.id}>
        <td>{item.order}</td><td>{item.customer}</td><td className="v-number">{money(item.amount)}</td><td>{item.reason}</td>
        <td>{item.account ? `${item.bank} ${item.account} · ${item.owner}` : 'Customer belum mengisi rekening'}</td>
        <td><Status>{labels[item.status] || item.status}</Status></td>
        <td>{['menunggu', 'diproses'].includes(item.status) ? <button type="button" className="v-text-button" disabled={!item.account} onClick={() => open(item)}>Tandai ditransfer</button> : item.reference || '—'}</td>
      </tr>)}</tbody></table></div>}
    {selected && <Modal title="Tandai sudah ditransfer" onClose={() => { if (!busy) setSelected(null); }} narrow>
      <form onSubmit={submit}>
        <p className="v-modal-copy">Transfer {money(selected.amount)} ke {selected.bank} {selected.account} a.n. {selected.owner} di luar aplikasi, lalu catat referensinya. Customer akan mendapat notifikasi uang masuk.</p>
        <label className="v-field kyc-review-note">Referensi transfer<input value={reference} onChange={event => setReference(event.target.value)} maxLength={150} required disabled={busy} /></label>
        {error && <p role="alert" className="kyc-error">{error}</p>}
        <div className="v-modal-actions"><button type="button" className="v-button v-button-secondary" disabled={busy} onClick={() => setSelected(null)}>Batal</button><button type="submit" className="v-button v-button-primary" disabled={busy || !reference.trim()}>Tandai ditransfer</button></div>
      </form>
    </Modal>}
  </section>;
}
