import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Status({ children }) {
  const tone = /^(Aktif|Selesai|Disetujui|Terverifikasi)$/.test(children) ? 'green' : /Menunggu|Ditinjau|Diproses|Diajukan|Perawatan/.test(children) ? 'amber' : /Dibatalkan|Ditolak/.test(children) ? 'red' : 'neutral';
  return <span className={`v-status v-status-${tone}`}><i aria-hidden="true" />{children}</span>;
}

export function PageHeading({ eyebrow, title, description, children }) {
  return <div className="v-page-heading"><div>{eyebrow && <p className="v-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="v-description">{description}</p>}</div>{children && <div className="v-heading-actions">{children}</div>}</div>;
}

export function EmptyState({ title = 'Belum ada data', description = 'Data yang Anda tambahkan akan muncul di sini.', children }) {
  return <div className="v-empty"><Search size={26} strokeWidth={1.4} /><h3>{title}</h3><p>{description}</p>{children}</div>;
}

export function Pagination({ count, page, onPage, size, onSize }) {
  const pages = Math.max(1, Math.ceil(count / size));
  return <div className="v-pagination"><div><span>{count ? `${(page - 1) * size + 1}–${Math.min(page * size, count)}` : '0'} dari {count} data</span><label>Tampilkan <select aria-label="Jumlah baris" value={size} onChange={event => onSize(Number(event.target.value))}>{[5, 10, 20].map(value => <option key={value}>{value}</option>)}</select></label></div><div><button className="v-icon-button" type="button" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={17} /></button><span>{page} / {pages}</span><button className="v-icon-button" type="button" aria-label="Halaman berikutnya" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight size={17} /></button></div></div>;
}

export function BackLink({ to, children = 'Kembali' }) { return <Link className="v-back-link" to={to}><ArrowLeft size={16} />{children}</Link>; }

export function Modal({ title, onClose, children, narrow = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = [...document.querySelectorAll('.vendor-workspace > :not(.v-modal-backdrop)')].map(element => [element, element.inert]);
    background.forEach(([element]) => { element.inert = true; });
    document.body.style.overflow = 'hidden';
    ref.current.querySelector('button, input, select, textarea')?.focus();
    return () => {
      background.forEach(([element, previous]) => { element.inert = previous; });
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<div className="v-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className={`v-modal${narrow ? ' is-narrow' : ''}`} role="dialog" aria-modal="true" aria-labelledby="vendor-modal-title" ref={ref} onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    if (event.key === 'Tab') {
      const controls = [...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select,textarea,a[href]')];
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}><div className="v-modal-heading"><h2 id="vendor-modal-title">{title}</h2><button className="v-icon-button" type="button" aria-label="Tutup dialog" onClick={onClose}><X size={19} /></button></div>{children}</section></div>, document.querySelector('.vendor-workspace'));
}
