import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Bell, CheckCheck, CreditCard, Package, ShieldCheck, Wallet, X } from 'lucide-react';
import { api } from '../../api';
import './customer-notifications.css';
import Skeleton from '../../components/Skeleton';

const base = '/api/customer/notifications';
const headers = { 'X-Customer-Notifications': '1' };
const icons = { order: Package, kyc: ShieldCheck, payment: CreditCard, refund: Wallet, claim: AlertCircle };
const time = value => new Date(value).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function CustomerNotifications({ open, onOpenChange }) {
  const trigger = useRef(null);
  const panel = useRef(null);
  const mounted = useRef(false);
  const sequence = useRef(0);
  const id = useId();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState(null);
  const positioned = position !== null;
  const refresh = useCallback(() => {
    const request = ++sequence.current;
    return api(base).then(result => {
      if (mounted.current && request === sequence.current) { setData(result); setError(''); }
    }).catch(failure => {
      if (mounted.current && request === sequence.current) setError(failure.message);
    }).finally(() => { if (mounted.current && request === sequence.current) setLoading(false); });
  }, []);
  useEffect(() => {
    mounted.current = true;
    refresh();
    const focus = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', focus);
    const timer = setInterval(focus, 60000);
    return () => { mounted.current = false; sequence.current += 1; clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [refresh]);
  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current.getBoundingClientRect();
      const width = Math.min(400, window.innerWidth - 24);
      const top = Math.max(12, Math.min(rect.bottom + 10, window.innerHeight - 180));
      setPosition({ top, left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)), width, maxHeight: Math.max(160, window.innerHeight - top - 12) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);
  useLayoutEffect(() => { if (open && positioned) panel.current?.focus({ preventScroll: true }); }, [open, positioned]);
  useEffect(() => {
    if (!open) return;
    const outside = event => {
      if (!panel.current?.contains(event.target) && !trigger.current?.contains(event.target)) onOpenChange(false);
    };
    const escape = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onOpenChange(false); trigger.current?.focus({ preventScroll: true }); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); document.removeEventListener('keydown', escape, true); };
  }, [open, onOpenChange]);

  const read = async item => {
    if (busy || item?.read) return;
    setBusy(true); setError('');
    // Invalidate any pre-mutation GET so it cannot restore stale unread state.
    sequence.current += 1;
    try {
      await api(`${base}/${item ? 'read' : 'read-all'}`, { method: 'POST', headers, ...(item ? { body: { ids: [item.id] } } : {}) });
      if (mounted.current) await refresh();
    } catch (failure) { if (mounted.current) setError(failure.message); }
    finally { if (mounted.current) setBusy(false); }
  };
  const unread = data?.unread || 0;
  return <div className="customer-notifications">
    <button ref={trigger} type="button" className="interface-bell customer-notifications-trigger" aria-label={data ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? id : undefined} onClick={() => onOpenChange(!open)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); onOpenChange(true); } }}>
      <Bell size={18} strokeWidth={1.7} />{unread > 0 && <span>{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && createPortal(<section ref={panel} id={id} tabIndex={-1} role="dialog" aria-labelledby={`${id}-heading`} className="customer-notifications-panel" style={position || { visibility: 'hidden' }}>
      <div className="customer-notifications-heading"><div><h2 id={`${id}-heading`}>Notifikasi</h2><p>{data ? `${unread} belum dibaca` : 'Kabar terbaru untukmu'}</p></div><button type="button" aria-label="Tutup notifikasi" onClick={() => { onOpenChange(false); trigger.current?.focus({ preventScroll: true }); }}><X size={18} /></button></div>
      <div className="customer-notifications-toolbar"><span>{data?.total > 50 ? '50 notifikasi terbaru' : 'Aktivitas akun Anda'}</span><button type="button" disabled={busy || !unread} onClick={() => read()}><CheckCheck size={14} />Tandai semua dibaca</button></div>
      {error && <div className="customer-notifications-error" role="alert"><p>{error}</p><button type="button" onClick={refresh} disabled={loading}>Coba lagi</button></div>}
      <div className="customer-notifications-list" aria-busy={loading || busy}>
        {loading && !data ? <Skeleton variant="list" label="Memuat notifikasi…" /> : data?.items.length ? data.items.map(item => {
          const Icon = icons[item.kind] || Bell;
          return <button type="button" key={item.id} className={`customer-notifications-item${item.read ? '' : ' is-unread'}`} disabled={busy} onClick={() => { read(item); const settle = /^c:o:(\d+):settle$/.exec(item.id); const target = item.kind === 'kyc' ? '/kyc' : settle && `/keranjang?orders=${settle[1]}`; if (target) { onOpenChange(false); navigate(target); } }} aria-label={`${item.title}${item.read ? ', sudah dibaca' : ', tandai dibaca'}`}>
            <span className="customer-notifications-icon"><Icon size={18} /></span><span className="customer-notifications-copy"><strong>{item.title}</strong><span>{item.body}</span><time dateTime={item.createdAt}>{time(item.createdAt)}</time></span>{!item.read && <span className="customer-notifications-dot" aria-label="Belum dibaca" />}
          </button>;
        }) : !error && <div className="customer-notifications-empty" role="status"><Bell size={28} /><strong>Belum ada notifikasi</strong><span>Kabar pesanan, pembayaran, dan akunmu akan muncul di sini.</span></div>}
      </div>
      <p className="customer-notifications-footer" role="status">{busy ? 'Menyimpan status baca…' : 'Klik notifikasi untuk menandainya sebagai dibaca.'}</p>
    </section>, document.querySelector('.vendoria-interface') || document.body)}
  </div>;
}
