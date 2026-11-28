import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarDays, Check, ChevronRight, Lock, Sparkles, Users } from 'lucide-react';
import { money } from '../vendor/vendorData';
import { getDashboard } from './dashboardApi';
import Skeleton from '../../components/Skeleton';

const chip = { Selesai: 'green', Terkonfirmasi: 'green', 'Menunggu Pembayaran': 'amber', 'Menunggu Konfirmasi': 'amber', Dibatalkan: 'red' };

// Grafik batang (nilai sewa) + garis (jumlah transaksi), 8 minggu.
function VolumeChart({ weekly: weeklyVolume }) {
  const width = 741, height = 285, plotTop = 28, plotBottom = 244, slot = width / weeklyVolume.length;
  const maxValue = Math.max(1, ...weeklyVolume.map(item => item.total)), maxCount = Math.max(1, ...weeklyVolume.map(item => item.count));
  const y = (value, max) => plotBottom - (plotBottom - plotTop) * (value / max);
  const x = index => slot * index + slot / 2;
  const caption = weeklyVolume.map(item => `${item.label}: ${money(item.total)}, ${item.count} transaksi`).join('. ');
  return <figure className="a-chart">
    <figcaption className="v-sr-only">Volume transaksi 8 minggu terakhir. {caption}</figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true" focusable="false">
      {[0, 1, 2, 3].map(line => <line key={line} className="a-chart-grid" x1="32" x2={width - 32} y1={plotTop + (plotBottom - plotTop) * line / 3} y2={plotTop + (plotBottom - plotTop) * line / 3} />)}
      {weeklyVolume.map((item, index) => <rect key={item.label} className="a-chart-bar" x={x(index) - 23} y={y(item.total, maxValue)} width="46" height={plotBottom - y(item.total, maxValue)} rx="4" />)}
      <polyline className="a-chart-line" fill="none" points={weeklyVolume.map((item, index) => `${x(index)},${y(item.count, maxCount)}`).join(' ')} />
      {weeklyVolume.map((item, index) => <circle key={item.label} className="a-chart-dot" cx={x(index)} cy={y(item.count, maxCount)} r="5" />)}
      {weeklyVolume.map((item, index) => <text key={item.label} className="a-chart-label" x={x(index)} y="274" textAnchor="middle">{item.label}</text>)}
    </svg>
    <div className="a-chart-legend" aria-hidden="true"><span><i className="is-bar" />Nilai sewa</span><span><i className="is-line" />Jumlah transaksi</span></div>
  </figure>;
}

const dash = (value, format) => value == null ? '—' : format(value);

export default function AdminDashboard({ data, name }) {
  const [state, setState] = useState({ summary: null, error: '' });
  useEffect(() => {
    const life = new AbortController();
    getDashboard().then(summary => { if (!life.signal.aborted) setState({ summary, error: '' }); })
      .catch(error => { if (!life.signal.aborted) setState({ summary: null, error: error.message }); });
    return () => life.abort();
  }, []);
  const { summary, error } = state;
  const pending = data.kyc.filter(item => item.status === 'Menunggu').length;
  const openClaims = data.claims.filter(item => ['Diajukan', 'Ditinjau'].includes(item.status)).length;
  const payoutRequests = data.payouts.filter(item => item.status === 'Menunggu').length;
  const activeVendors = data.vendors.filter(item => item.status === 'Aktif' && item.businessStatus === 'Aktif').length;
  const stats = [
    ['KYC Menunggu', pending, 'Perlu ditinjau', Bell],
    ['Klaim Terbuka', openClaims, 'Menunggu keputusan', CalendarDays],
    ['GMV Bulan Ini', dash(summary?.gmv30, money), '30 hari terakhir', Sparkles],
    ['Dana Ditahan di Escrow', dash(summary?.escrow, money), 'Deposit & pelunasan pesanan berjalan', Lock],
    ['Vendor Aktif', activeVendors, 'Akun dan bisnis aktif', Users],
  ];
  const actions = [
    [`Tinjau ${pending} pengajuan KYC`, 'Antrean verifikasi identitas customer dan vendor', '/admin/kyc'],
    [`Putuskan ${openClaims} klaim terbuka`, 'Deposit ditahan hingga keputusan admin', '/admin/klaim'],
    [`Setujui ${payoutRequests} pencairan vendor`, 'Pengajuan pencairan dana menunggu persetujuan', '/admin/laporan/pencairan'],
  ];
  return <>
    <header className="a-head">
      <div><p className="a-eyebrow">PANEL ADMIN</p><h1>Selamat datang, {name}</h1><p className="a-lead">Berikut ringkasan aktivitas platform yang perlu diperhatikan hari ini.</p></div>
      <span className="a-pill is-green"><Check size={13} aria-hidden="true" />Terverifikasi</span>
    </header>
    <div className="a-stats">{stats.map(([label, value, note, Icon]) => <div className="a-stat" key={label}><span className="a-stat-icon"><Icon size={18} strokeWidth={1.6} aria-hidden="true" /></span><small>{label}</small><strong>{value}</strong><em>{note}</em></div>)}</div>
    <div className="a-dash-grid">
      <div className="a-dash-col">
        <section className="a-panel"><p className="a-eyebrow">PRIORITAS HARI INI</p><h2>Perlu Tindakan</h2>
          <ol className="a-actions">{actions.map(([title, note, to], index) => <li key={to}><span className="a-step">{index + 1}</span><div><strong>{title}</strong><small>{note}</small></div><Link to={to}>Tinjau<ChevronRight size={18} aria-hidden="true" /></Link></li>)}</ol>
        </section>
        <section className="a-panel"><p className="a-eyebrow">8 MINGGU TERAKHIR</p><h2>Volume Transaksi</h2>{summary ? <VolumeChart weekly={summary.weekly} /> : error ? <p role="alert">{error}</p> : <Skeleton label="Memuat data…" count={3} />}</section>
      </div>
      <div className="a-dash-col">
        <section className="a-panel"><p className="a-eyebrow">TERBARU</p><h2>Transaksi Terakhir</h2>
          <div className="a-table-wrap" tabIndex={0} role="region" aria-label="Transaksi terakhir"><table className="a-table"><caption className="v-sr-only">Transaksi terakhir</caption><thead><tr><th scope="col">Kode</th><th scope="col">Customer</th><th scope="col">Vendor</th><th scope="col" className="is-right">Nominal</th><th scope="col">Status</th></tr></thead><tbody>{(summary?.recent ?? []).map(item => <tr key={item.id}><td>{item.id}</td><td>{item.customer}</td><td>{item.vendor}</td><td className="is-right">{money(item.total)}</td><td><span className={`a-pill is-${chip[item.status] || 'neutral'}`}>{item.status}</span></td></tr>)}</tbody></table></div>
        </section>
        <section className="a-panel"><p className="a-eyebrow">INDIKATOR</p><h2>Kesehatan Platform</h2>
          <dl className="a-health"><div><dt>Tingkat sengketa</dt><dd>{dash(summary?.health.disputeRate, value => `${value.toLocaleString('id-ID')}%`)}</dd></div><div><dt>Rata-rata waktu rilis deposit</dt><dd>{dash(summary?.health.depositReleaseHours, value => `${value.toLocaleString('id-ID')} jam`)}</dd></div><div><dt>Kepuasan pengguna</dt><dd>{dash(summary?.health.rating, value => `${value.toLocaleString('id-ID')} / 5,0 (${summary.health.reviews} ulasan)`)}</dd></div></dl>
        </section>
      </div>
    </div>
  </>;
}
