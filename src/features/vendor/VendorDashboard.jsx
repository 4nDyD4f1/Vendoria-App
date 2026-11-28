import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { money } from './vendorData';
import { vendorAssets } from './vendorAssets';
import { getVendorDashboard } from './vendorDashboardApi';
import Skeleton from '../../components/Skeleton';

const compactMoney = value => value >= 1000000 ? `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value / 1000000)} jt` : money(value);
const verificationLabels = { terverifikasi: 'Terverifikasi', menunggu: 'Menunggu verifikasi', ditolak: 'Verifikasi ditolak', belum_diverifikasi: 'Belum diverifikasi' };
const dash = (value, format = String) => value == null ? '—' : format(value);

export default function VendorDashboard({ ownerName }) {
  const [state, setState] = useState({ summary: null, error: '' });
  useEffect(() => {
    const life = new AbortController();
    getVendorDashboard().then(summary => { if (!life.signal.aborted) setState({ summary, error: '' }); })
      .catch(error => { if (!life.signal.aborted) setState({ summary: null, error: error.message }); });
    return () => life.abort();
  }, []);
  const { summary, error } = state;
  const balance = summary?.payout.amount ?? 0;
  const weekly = summary?.weekly ?? [];
  const peak = Math.max(1, ...weekly);
  const metrics = [
    { label: 'Pesanan Baru', value: dash(summary?.newOrders), detail: 'Perlu dikonfirmasi', icon: vendorAssets.bell, to: '/vendor/pesanan' },
    { label: 'Sedang Disewa', value: dash(summary?.ongoing), detail: 'Masa sewa berjalan', icon: vendorAssets.calendar, to: '/vendor/pesanan' },
    { label: 'Dana Siap Dicairkan', value: dash(summary && balance, compactMoney), detail: 'Setelah biaya platform', icon: vendorAssets.balance, to: '/vendor/pencairan' },
    { label: 'Rating', value: summary?.rating == null ? '—' : `${summary.rating.toLocaleString('id-ID')} / 5,0`, detail: summary ? (summary.reviews ? `${summary.reviews} ulasan · ${summary.completed} pesanan selesai` : 'Belum ada ulasan') : '—', icon: vendorAssets.rating, to: '/vendor/profil-bisnis' },
  ];
  const actions = [
    { title: `Serah terima ${summary?.toHandover ?? 0} pesanan terkonfirmasi`, detail: 'Siapkan perlengkapan lalu mulai masa sewa', to: '/vendor/serah-terima' },
    { title: `Periksa ${summary?.toInspect ?? 0} pengembalian`, detail: 'Cek kondisi barang lalu selesaikan pesanan', to: '/vendor/serah-terima' },
    { title: `Tanggapi ${summary?.openClaims ?? 0} klaim terbuka`, detail: 'Pantau klaim yang menunggu keputusan admin', to: '/vendor/klaim' },
    { title: `Ajukan pencairan ${compactMoney(balance)}`, detail: 'Saldo dari pesanan yang telah selesai', to: '/vendor/pencairan' },
  ];
  return <div className="vp-dashboard" data-figma-node="86:2">
    <div className="vp-welcome"><div><p className="vp-eyebrow">PORTAL VENDOR</p><h1>Selamat datang, {summary?.business || ownerName}</h1><p className="vp-welcome-description">Berikut ringkasan aktivitas yang perlu diperhatikan hari ini.</p></div><Link className="vp-verified" to="/vendor/kyc" aria-label="Lihat status verifikasi akun">{summary ? verificationLabels[summary.verification] || summary.verification : error ? '—' : <Skeleton variant="inline" label="Memuat…" />}</Link></div>
    {error && <p role="alert" className="v-field-error" style={{ marginBottom: 16 }}>{error}</p>}
    <div className="vp-metrics">{metrics.map(metric => <Link className="vp-metric" to={metric.to} key={metric.label}><span className="vp-metric-label">{metric.label}</span><strong>{metric.value}</strong><p>{metric.detail}</p><span className="vp-metric-icon"><img src={metric.icon} alt="" /></span></Link>)}</div>
    <div className="vp-dashboard-grid">
      <section className="vp-priorities" aria-labelledby="vp-priority-title"><p className="vp-eyebrow">PRIORITAS HARI INI</p><h2 id="vp-priority-title">Perlu Tindakan</h2><ol className="vp-action-list">{actions.map((action, index) => <li key={action.title}><span className="vp-action-number" aria-hidden="true">{index + 1}</span><div><strong>{action.title}</strong><p>{action.detail}</p></div><Link to={action.to} aria-label={`Buka: ${action.title}`}>Buka<img src={vendorAssets.arrow} alt="" /></Link></li>)}</ol></section>
      <section className="vp-weekly" aria-labelledby="vp-weekly-title"><p className="vp-eyebrow">8 MINGGU TERAKHIR</p><h2 id="vp-weekly-title">Nilai Sewa Mingguan</h2><figure><figcaption className="v-sr-only">Nilai sewa pesanan selesai per minggu. {weekly.map((amount, index) => `Minggu ${index + 1}: ${money(amount)}`).join('. ')}</figcaption><div className="vp-week-chart">{weekly.map((amount, index) => <button type="button" key={index} className="vp-week-bar" style={{ height: `${Math.max(6, amount / peak * 100)}%` }} aria-label={`${index === 7 ? 'Minggu ini' : `${7 - index} minggu lalu`}: ${money(amount)}`}><span>{money(amount)}</span></button>)}</div><div className="vp-week-labels" aria-hidden="true"><span>8 minggu lalu</span><span>Minggu ini</span></div></figure></section>
    </div>
  </div>;
}
