import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { api } from '../../api';
import AccountModal from './AccountModal';
import DesignNode from './DesignNode';
import { InterfaceContext } from './InterfaceContext';
import { accountFields } from './accountDesign';
import { accountCards, addressCards, holdsAccounts, holdsAddresses, recordIdOf, replaceNode } from './accountBook';

// Daftar dari backend; null = memuat. Gagal muat ditampilkan, bukan diganti data contoh.
function useList(path) {
  const [state, setState] = useState({ items: null, error: '' });
  const load = useCallback(() => api(path).then(items => setState({ items, error: '' }), error => setState(current => ({ ...current, error: error.message }))), [path]);
  useEffect(() => {
    let active = true;
    api(path).then(items => { if (active) setState({ items, error: '' }); }, error => { if (active) setState(current => ({ ...current, error: error.message })); });
    return () => { active = false; };
  }, [path]);
  return [state, load];
}

const Status = ({ state, empty, children }) => state.error ? <p className="account-profile-message account-profile-error" role="alert">{state.error}</p>
  : state.items === null ? <p className="account-profile-message" role="status">Memuat…</p>
    : state.items.length === 0 ? <p className="account-profile-message" role="status">{empty}</p> : children;

export function AccountAddressPanel({ content, page, modalTree, initialModal }) {
  const context = useContext(InterfaceContext);
  const [list, reload] = useList('/api/account/addresses');
  const [modal, setModal] = useState(initialModal === 'address' ? {} : null);
  const [message, setMessage] = useState(null);
  const items = list.items ?? [];

  const save = async values => {
    await api(modal.record ? `/api/account/addresses/${modal.record.id}` : '/api/account/addresses', { method: modal.record ? 'PUT' : 'POST', body: values });
    await reload();
    setMessage({ text: modal.record ? 'Alamat acara diperbarui.' : 'Alamat acara ditambahkan.' });
  };
  const remove = async record => {
    if (!window.confirm(`Hapus alamat "${record.name}"?`)) return;
    try { await api(`/api/account/addresses/${record.id}`, { method: 'DELETE' }); await reload(); setMessage({ text: 'Alamat acara dihapus.' }); }
    catch (error) { setMessage({ text: error.message, error: true }); }
  };
  const panelContext = { ...context, action: args => {
    const label = args.label.trim();
    const record = items.find(item => item.id === recordIdOf(args.node));
    if (label === 'Tambah Alamat') setModal({});
    else if (label === 'Edit' && record) setModal({ record });
    else if (label === 'Hapus' && record) remove(record);
    else context.action(args);
  } };
  const tree = replaceNode(content, holdsAddresses, container => addressCards(container, items));

  return <InterfaceContext.Provider value={panelContext}>
    <DesignNode node={accountFields(tree)} ancestors={[page]} />
    <Status state={list} empty="Belum ada alamat acara tersimpan. Pilih Tambah Alamat untuk menyimpan lokasi acara Anda." />
    {message && <p className={`account-profile-message${message.error ? ' account-profile-error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
    {modal && <AccountModal kind="address" tree={modalTree} record={modal.record} onSave={save} onClose={() => setModal(null)} />}
  </InterfaceContext.Provider>;
}

const money = value => `Rp ${Number(value).toLocaleString('id-ID')}`;
const refundStatus = { menunggu: 'Menunggu', diproses: 'Diproses', berhasil: 'Berhasil', gagal: 'Gagal', dibatalkan: 'Dibatalkan' };

function RefundHistory({ onClose }) {
  const [list] = useList('/api/account/refunds');
  const close = useRef(null);
  useEffect(() => { close.current?.focus(); }, []);
  return createPortal(<div className="account-modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="refund-history-title" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <h2 id="refund-history-title">Riwayat Refund</h2>
      <Status state={list} empty="Belum ada refund untuk pesanan Anda.">
        <ul className="account-refund-history">{(list.items ?? []).map(refund => <li key={refund.id}>
          <div><strong>{refund.orderCode}</strong><span>{refundStatus[refund.status] ?? refund.status}</span></div>
          <p>{money(refund.amount)}{refund.reason ? ` · ${refund.reason}` : ''}</p>
          <small>Diajukan {new Date(refund.requestedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}{refund.refundedAt ? ` · Dikembalikan ${new Date(refund.refundedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</small>
        </li>)}</ul>
      </Status>
      <button type="button" ref={close} className="account-modal-close" aria-label="Tutup" onClick={onClose}><X size={19} strokeWidth={1.6} /></button>
    </section>
  </div>, document.querySelector('.vendoria-interface'));
}

export function AccountRefundPanel({ content, page, modalTree, initialModal }) {
  const context = useContext(InterfaceContext);
  const [list, reload] = useList('/api/account/refund-accounts');
  const [modal, setModal] = useState(initialModal === 'refund' ? 'form' : null);
  const [message, setMessage] = useState(null);

  const save = async values => {
    await api('/api/account/refund-accounts', { method: 'POST', body: values });
    await reload();
    setMessage({ text: 'Rekening refund tersimpan.' });
  };
  const panelContext = { ...context, action: args => {
    const label = args.label.trim();
    if (label === 'Tambah Rekening') setModal('form');
    else if (label === 'Riwayat Refund') setModal('history');
    else context.action(args);
  } };
  const tree = replaceNode(content, holdsAccounts, container => accountCards(container, list.items ?? []));

  return <InterfaceContext.Provider value={panelContext}>
    <DesignNode node={accountFields(tree)} ancestors={[page]} />
    <Status state={list} empty="Belum ada rekening refund. Pilih Tambah Rekening agar pengembalian dana bisa diproses." />
    {message && <p className="account-profile-message" role="status">{message.text}</p>}
    {modal === 'form' && <AccountModal kind="refund" tree={modalTree} onSave={save} onClose={() => setModal(null)} />}
    {modal === 'history' && <RefundHistory onClose={() => setModal(null)} />}
  </InterfaceContext.Provider>;
}
