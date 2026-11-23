import { Link } from 'react-router-dom';
import { money } from './vendorData';
import { vendorAssets } from './vendorAssets';

// Financial/rating examples from Figma belong to the existing frontend preview.
const preview = { balance: 18400000, rating: '4.8 / 5.0', orders: 198, weeks: [0, 0, 0, 4200000, 0, 3950000, 0, 18400000] };
const compactMoney = value => `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value / 1000000)} jt`;

export default function VendorDashboard({ data, business }) {
  const pending = data.orders.filter(order => order.status === 'Menunggu').length;
  const rented = data.orders.filter(order => order.status === 'Berlangsung').length;
  const confirmed = data.orders.filter(order => order.status === 'Dikonfirmasi').length;
  const inspections = data.handovers.filter(item => item.type === 'Pengembalian' && item.status === 'Menunggu inspeksi').length;
  const claims = data.claims.filter(item => item.status === 'Ditinjau').length;
  const metrics = [
    { label: 'Pesanan Baru', value: pending, detail: 'Perlu diproses', icon: vendorAssets.bell, to: '/vendor/pesanan' },
    { label: 'Sedang Disewa', value: rented, detail: 'Masa sewa berjalan', icon: vendorAssets.calendar, to: '/vendor/pesanan' },
    { label: 'Dana Siap Dicairkan', value: compactMoney(preview.balance), detail: 'Saldo tersedia', icon: vendorAssets.balance, to: '/vendor/pencairan' },
    { label: 'Rating', value: preview.rating, detail: `${preview.orders}+ pesanan`, icon: vendorAssets.rating, to: '/vendor/profil-bisnis' },
  ];
  const actions = [
    { title: `Serah terima ${confirmed} pesanan terkonfirmasi`, detail: 'Unggah 4 foto kondisi awal lalu mulai masa sewa', to: '/vendor/serah-terima' },
    { title: `Inspeksi ${inspections} pengembalian`, detail: 'Konfirmasi kondisi barang agar deposit dirilis', to: '/vendor/serah-terima' },
    { title: `Tanggapi ${claims} klaim terbuka`, detail: 'Unggah bukti serah terima dan balas pesan Admin', to: '/vendor/klaim' },
    { title: `Ajukan pencairan ${compactMoney(preview.balance)}`, detail: 'Saldo dari transaksi yang telah selesai', to: '/vendor/pencairan' },
  ];
  return <div className="vp-dashboard" data-figma-node="86:2">
    <div className="vp-welcome"><div><p className="vp-eyebrow">PORTAL VENDOR</p><h1>Selamat datang, {business.name}</h1><p className="vp-welcome-description">Berikut ringkasan aktivitas yang perlu diperhatikan hari ini.</p></div><Link className="vp-verified" to="/vendor/kyc" aria-label="Lihat status verifikasi pada data contoh">Terverifikasi</Link></div>
    <div className="vp-metrics">{metrics.map(metric => <Link className="vp-metric" to={metric.to} key={metric.label}><span className="vp-metric-label">{metric.label}</span><strong>{metric.value}</strong><p>{metric.detail}</p><span className="vp-metric-icon"><img src={metric.icon} alt="" /></span></Link>)}</div>
    <div className="vp-dashboard-grid">
      <section className="vp-priorities" aria-labelledby="vp-priority-title"><p className="vp-eyebrow">PRIORITAS HARI INI</p><h2 id="vp-priority-title">Perlu Tindakan</h2><ol className="vp-action-list">{actions.map((action, index) => <li key={action.title}><span className="vp-action-number" aria-hidden="true">{index + 1}</span><div><strong>{action.title}</strong><p>{action.detail}</p></div><Link to={action.to} aria-label={`Buka: ${action.title}`}>Buka<img src={vendorAssets.arrow} alt="" /></Link></li>)}</ol></section>
      <section className="vp-weekly" aria-labelledby="vp-weekly-title"><p className="vp-eyebrow">8 MINGGU TERAKHIR</p><h2 id="vp-weekly-title">Pendapatan Mingguan</h2><figure><figcaption className="v-sr-only">Pendapatan mingguan pada data contoh. {preview.weeks.map((amount, index) => `Minggu ${index + 1}: ${money(amount)}`).join('. ')}</figcaption><div className="vp-week-chart">{preview.weeks.map((amount, index) => <button type="button" key={index} className="vp-week-bar" style={{ height: `${Math.max(6, amount / preview.balance * 100)}%` }} aria-label={`${index === 7 ? 'Minggu ini' : `${7 - index} minggu lalu`}: ${money(amount)} (data contoh)`}><span>{money(amount)}</span></button>)}</div><div className="vp-week-labels" aria-hidden="true"><span>8 minggu lalu</span><span>Minggu ini</span></div></figure></section>
    </div>
  </div>;
}
