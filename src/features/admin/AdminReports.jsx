import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { EmptyState, PageHeading, Pagination, Status } from '../vendor/VendorUi';
import { money, shortDate } from '../vendor/vendorData';
import { transactions } from './adminData';

export default function AdminReports() {
  const [start, setStart] = useState('2026-11-01');
  const [end, setEnd] = useState('2026-11-30');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [requestedPage, setPage] = useState(1);
  const [size, setSize] = useState(5);
  const invalidRange = start && end && end < start;
  const filtered = invalidRange ? [] : transactions.filter(item => (!start || item.date >= start) && (!end || item.date <= end) && (!status || item.status === status) && Object.values(item).some(value => String(value).toLowerCase().includes(query.toLowerCase())));
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(filtered.length / size)));
  const completed = filtered.filter(item => item.status === 'Selesai');
  const exportCsv = () => {
    const rows = [['No. transaksi', 'Tanggal', 'Customer', 'Vendor', 'Total', 'Biaya platform', 'Status'], ...filtered.map(item => [item.id, item.date, item.customer, item.vendor, item.total, item.fee, item.status])];
    const csv = '\uFEFF' + rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'laporan-transaksi-vendoria.csv'; link.click(); URL.revokeObjectURL(url);
  };
  return <><PageHeading title="Laporan transaksi" description="Tinjau ringkasan transaksi dan biaya platform berdasarkan periode."><button className="v-button v-button-secondary" type="button" disabled={!filtered.length} onClick={exportCsv}><Download size={16} />Unduh CSV</button></PageHeading><section className="v-card a-report-filters"><div className="v-field"><label htmlFor="report-start">Tanggal mulai</label><input id="report-start" type="date" value={start} onChange={event => { setStart(event.target.value); setPage(1); }} /></div><div className="v-field"><label htmlFor="report-end">Tanggal akhir</label><input id="report-end" type="date" value={end} min={start} aria-invalid={Boolean(invalidRange)} onChange={event => { setEnd(event.target.value); setPage(1); }} /></div><div className="v-field"><label htmlFor="report-status">Status transaksi</label><select id="report-status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Semua status</option>{['Selesai', 'Diproses', 'Dibatalkan'].map(value => <option key={value}>{value}</option>)}</select></div>{invalidRange && <p className="v-field-error" role="alert">Tanggal akhir harus sama atau setelah tanggal mulai.</p>}</section><div className="v-inline-stats"><div><span>Nilai transaksi selesai</span><strong>{money(completed.reduce((sum, item) => sum + item.total, 0))}</strong></div><div><span>Biaya platform</span><strong>{money(completed.reduce((sum, item) => sum + item.fee, 0))}</strong></div><div><span>Jumlah transaksi</span><strong>{filtered.length} transaksi</strong></div></div><section className="v-card"><div className="v-table-toolbar"><label className="v-search-field"><Search size={17} /><input aria-label="Cari transaksi" value={query} placeholder="Cari transaksi, customer, atau vendor…" onChange={event => { setQuery(event.target.value); setPage(1); }} /></label><span className="a-table-note">Data transaksi contoh</span></div><div className="v-table-scroll" tabIndex={0} role="region" aria-label="Tabel laporan transaksi"><table className="v-table"><caption className="v-sr-only">Laporan transaksi berdasarkan filter</caption><thead><tr>{['No. transaksi', 'Tanggal', 'Customer', 'Vendor', 'Total transaksi', 'Biaya platform', 'Status'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{filtered.slice((page - 1) * size, page * size).map(item => <tr key={item.id}><td className="v-record-id">{item.id}</td><td>{shortDate(item.date)}</td><td>{item.customer}</td><td>{item.vendor}</td><td className="v-number">{money(item.total)}</td><td className="v-number">{money(item.fee)}</td><td><Status>{item.status}</Status></td></tr>)}</tbody></table></div>{!filtered.length && <EmptyState title="Tidak ada transaksi pada filter ini" description="Sesuaikan periode, status, atau kata kunci pencarian." />}<Pagination count={filtered.length} page={page} onPage={setPage} size={size} onSize={value => { setSize(value); setPage(1); }} /></section></>;
}
