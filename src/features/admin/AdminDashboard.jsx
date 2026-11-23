import { Link } from 'react-router-dom';
import { Bell, CalendarDays, Check, ChevronRight, Lock, Sparkles, Users } from 'lucide-react';
import { money } from '../vendor/vendorData';
import { dashboardTransactions, weeklyVolume } from './adminData';

const chip = { Selesai: 'green', Terkonfirmasi: 'green', 'Menunggu Pembayaran': 'amber', 'Sedang Disewa': 'neutral' };

// Grafik batang (nilai sewa) + garis (jumlah transaksi), 8 minggu. Data contoh dari desain.
function VolumeChart() {
  const width = 741, height = 285, plotTop = 28, plotBottom = 244, slot = width / weeklyVolume.length;
  const maxValue = Math.max(...weeklyVolume.map(item => item.value)), maxCount = Math.max(...weeklyVolume.map(item => item.count));
  const y = (value, max) => plotBottom - (plotBottom - plotTop) * (value / max);
  const x = index => slot * index + slot / 2;
  const caption = weeklyVolume.map(item => `${item.label}: ${money(item.value * 1000000)}, ${item.count} transaksi`).join('. ');
  return <figure className="a-chart">
    <figcaption className="v-sr-only">Volume transaksi 8 minggu terakhir (data contoh). {caption}</figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true" focusable="false">
      {[0, 1, 2, 3].map(line => <line key={line} className="a-chart-grid" x1="32" x2={width - 32} y1={plotTop + (plotBottom - plotTop) * line / 3} y2={plotTop + (plotBottom - plotTop) * line / 3} />)}
      {weeklyVolume.map((item, index) => <rect key={item.label} className="a-chart-bar" x={x(index) - 23} y={y(item.value, maxValue)} width="46" height={plotBottom - y(item.value, maxValue)} rx="4" />)}
      <polyline className="a-chart-line" fill="none" points={weeklyVolume.map((item, index) => `${x(index)},${y(item.count, maxCount)}`).join(' ')} />
      {weeklyVolume.map((item, index) => <circle key={item.label} className="a-chart-dot" cx={x(index)} cy={y(item.count, maxCount)} r="5" />)}
      {weeklyVolume.map((item, index) => <text key={item.label} className="a-chart-label" x={x(index)} y="274" textAnchor="middle">{item.label}</text>)}
    </svg>
    <div className="a-chart-legend" aria-hidden="true"><span><i className="is-bar" />Nilai sewa</span><span><i className="is-line" />Jumlah transaksi</span></div>
  </figure>;
}

export default function AdminDashboard({ data, name }) {
  const pending = data.kyc.filter(item => item.status === 'Menunggu').length;
  const openClaims = data.claims.filter(item => ['Diajukan', 'Ditinjau'].includes(item.status)).length;
  const payoutRequests = data.payouts.filter(item => item.status === 'Diajukan').length;
  const activeVendors = data.vendors.filter(item => item.status === 'Aktif' && item.businessStatus === 'Aktif').length;
  const stats = [
    ['KYC Menunggu', pending, 'Perlu ditinjau', Bell],
    ['Klaim Terbuka', openClaims, 'Menunggu keputusan', CalendarDays],
    ['GMV Bulan Ini', 'Rp76,5 jt', '30 hari terakhir', Sparkles],
    ['Deposit Ditahan di Escrow', 'Rp14,2 jt', 'Aman di rekening escrow', Lock],
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
        <section className="a-panel"><p className="a-eyebrow">8 MINGGU TERAKHIR</p><h2>Volume Transaksi</h2><VolumeChart /></section>
      </div>
      <div className="a-dash-col">
        <section className="a-panel"><p className="a-eyebrow">TERBARU</p><h2>Transaksi Terakhir</h2>
          <div className="a-table-wrap" tabIndex={0} role="region" aria-label="Transaksi terakhir"><table className="a-table"><caption className="v-sr-only">Transaksi terakhir, data contoh</caption><thead><tr><th scope="col">Kode</th><th scope="col">Customer</th><th scope="col">Vendor</th><th scope="col" className="is-right">Nominal</th><th scope="col">Status</th></tr></thead><tbody>{dashboardTransactions.map(item => <tr key={item.id}><td>{item.id}</td><td>{item.customer}</td><td>{item.vendor}</td><td className="is-right">{money(item.total)}</td><td><span className={`a-pill is-${chip[item.status] || 'neutral'}`}>{item.status}</span></td></tr>)}</tbody></table></div>
        </section>
        <section className="a-panel"><p className="a-eyebrow">INDIKATOR</p><h2>Kesehatan Platform</h2>
          <dl className="a-health"><div><dt>Tingkat sengketa</dt><dd>2%</dd></div><div><dt>Rata-rata waktu rilis deposit</dt><dd>2,5 jam</dd></div><div><dt>Kepuasan pengguna</dt><dd>4.9 / 5.0</dd></div></dl>
        </section>
      </div>
    </div>
  </>;
}
