import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { api } from '../../api';
import { needsUnits } from '../shared/reportTypes';
import Skeleton from '../../components/Skeleton';

const effects = {
  tidak_sampai: 'Bila disetujui, biaya sewa dan deposit dikembalikan 100% dan pesanan dibatalkan.',
  tidak_sesuai: 'Bila disetujui, kembalikan barang ke vendor. Setelah barang diterima, biaya sewa dan deposit dikembalikan 100%.',
  kurang: 'Bila disetujui, dana senilai unit yang kurang dikembalikan.',
  tidak_berfungsi: 'Bila disetujui, dana senilai unit bermasalah untuk sisa hari sewa dikembalikan.',
  lainnya: 'Admin menentukan nominal pengembalian yang adil.',
};
const statusText = { diajukan: 'Sedang ditinjau admin', ditinjau: 'Sedang ditinjau admin', disetujui: 'Disetujui', ditolak: 'Ditolak', selesai: 'Ditutup' };

/** /pesanan/:ref/lapor: customer melaporkan masalah pada pesanannya untuk diperiksa admin. */
export default function OrderReport({ reference }) {
  const path = `/api/orders/${encodeURIComponent(reference)}/reports`;
  const [state, setState] = useState({ form: null, error: '' });
  const [input, setInput] = useState({ type: '', itemId: '', units: '1', description: '' });
  const [photo, setPhoto] = useState(null);
  const [submit, setSubmit] = useState({ busy: false, error: '' });
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    api(path).then(form => { if (active) setState({ form, error: '' }); }, error => { if (active) setState({ form: null, error: error.message }); });
    return () => { active = false; };
  }, [path]);

  const { form } = state;
  const options = form?.options || [];
  const available = options.filter(option => option.available);
  const type = input.type || available[0]?.type || '';
  const itemId = input.itemId || String(form?.items[0]?.itemId || '');
  const item = form?.items.find(entry => String(entry.itemId) === itemId);
  const set = key => event => setInput(current => ({ ...current, [key]: event.target.value }));

  const send = async event => {
    event.preventDefault();
    if (pending.current) return;
    if (!input.description.trim()) { setSubmit({ busy: false, error: 'Jelaskan masalahnya.' }); return; }
    if (type !== 'tidak_sampai' && !photo) { setSubmit({ busy: false, error: 'Sertakan foto sebagai bukti.' }); return; }
    pending.current = true; setSubmit({ busy: true, error: '' });
    const body = new FormData();
    const data = { type, description: input.description.trim(), ...(needsUnits(type) && { itemId: Number(itemId), units: Number(input.units) }) };
    body.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    if (photo) body.append('photo', photo);
    try {
      const saved = await api(path, { method: 'POST', headers: { 'X-Customer-Orders': '1' }, body });
      setState({ form: saved, error: '' }); setSubmit({ busy: false, error: '' });
    } catch (error) { setSubmit({ busy: false, error: error.message }); }
    finally { pending.current = false; }
  };

  return <div className="co-page">
    <Link className="co-back" to={`/pesanan/${encodeURIComponent(reference)}`}><ArrowLeft size={16} />Kembali ke detail pesanan</Link>
    <header className="co-heading"><div><p className="co-eyebrow">PENYEWAAN ANDA</p><h1>Laporkan Pesanan</h1><p>{form ? `#${form.code} · ${form.vendorName}` : 'Sampaikan masalah pada pesanan Anda.'}</p></div></header>
    {state.error && <p className="co-error" role="alert">{state.error}</p>}
    {!form && !state.error && <Skeleton variant="list" label="Memuat pesanan…" />}
    {form?.report ? <section className="co-card" role="status"><h2>Laporan KLM-{form.report.id}</h2>
      <p><strong>{options.find(option => option.type === form.report.type)?.label}</strong> · {statusText[form.report.status] || form.report.status}</p>
      <p className="co-note">{form.report.description}</p>
      {form.report.adminNote && <p className="co-muted">Catatan admin: {form.report.adminNote}</p>}
      <p className="co-muted">{effects[form.report.type]}</p>
    </section> : form && (available.length ? <section className="co-card"><form className="co-review-form" onSubmit={send} noValidate>
      <label>Apa yang ingin dilaporkan?<select value={type} disabled={submit.busy} onChange={event => { set('type')(event); setSubmit({ busy: false, error: '' }); }}>{available.map(option => <option key={option.type} value={option.type}>{option.label}</option>)}</select></label>
      <p className="co-muted">{effects[type]}</p>
      {needsUnits(type) && <>
        <label>Alat yang bermasalah<select value={itemId} onChange={set('itemId')} disabled={submit.busy}>{form.items.map(entry => <option key={entry.itemId} value={entry.itemId}>{entry.name} ({entry.quantity} unit)</option>)}</select></label>
        <label>{type === 'kurang' ? 'Jumlah unit yang kurang' : 'Jumlah unit bermasalah'}<input type="number" min="1" max={item?.quantity || 1} value={input.units} onChange={set('units')} disabled={submit.busy} /></label>
      </>}
      <label>Keterangan<textarea rows={4} maxLength={1000} value={input.description} onChange={set('description')} disabled={submit.busy} /></label>
      <label>Foto bukti {type === 'tidak_sampai' ? '(opsional)' : '(wajib)'}<input type="file" accept="image/jpeg,image/png" disabled={submit.busy} onChange={event => { setPhoto(event.target.files?.[0] || null); setSubmit({ busy: false, error: '' }); }} /></label>
      {submit.error && <p className="co-error" role="alert">{submit.error}</p>}
      <button className="co-primary" type="submit" disabled={submit.busy}>{submit.busy && <LoaderCircle size={16} className="co-spinner" />}Kirim laporan</button>
      <p className="co-muted">Satu pesanan hanya dapat dilaporkan satu kali. Vendor dapat memberi tanggapan sebelum admin memutuskan.</p>
    </form></section> : <section className="co-card"><h2>Belum ada yang bisa dilaporkan</h2></section>)}
    {form && !form.report && options.some(option => !option.available) && <section className="co-card" style={{ marginTop: 16 }}><h2>Belum tersedia</h2>
      <ul className="co-records">{options.filter(option => !option.available).map(option => <li key={option.type}><div><strong>{option.label}</strong><p>{option.reason}</p></div></li>)}</ul>
    </section>}
  </div>;
}
