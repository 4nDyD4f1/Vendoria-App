import { Camera, Lock, ShieldCheck, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import InterfaceHeader from '../features/interface/InterfaceHeader';
import '../features/interface/interface.css';
import './auth.css';

const logo = '/assets/figma/99f729440d4864ad6ebc.svg';
const features = [
  [User, 'Vendor Terverifikasi KYC', 'Identitas mitra diperiksa secara menyeluruh'],
  [Lock, 'Deposit Aman Terkelola', 'Dana tersimpan aman sampai transaksi selesai'],
  [Camera, 'Bukti Foto Kondisi Barang', 'Inspeksi dua arah untuk proteksi bersama'],
];
function Brand() {
  return <div className="auth-brand"><img src={logo} alt="" width="40" height="40" /><span>Vendoria</span></div>;
}
function AuthFooter() {
  const categories = ['Audio & Sound System', 'Stage Lighting & LED', 'Tenda & Kanopi', 'Panggung & Genset', 'Furnitur & Dekorasi'];
  const guides = ['Cara Pemesanan', 'Verifikasi KTP & KYC', 'Panduan Serah Terima', 'Kebijakan Pengembalian', 'Pusat Bantuan Pelanggan'];
  return <footer className="auth-footer">
    <div className="auth-footer-columns">
      <div><Brand /><p className="auth-footer-description">Marketplace rental perlengkapan event terpercaya dengan jaminan inspeksi kondisi terverifikasi.</p><span className="auth-footer-badge"><ShieldCheck size={14} />Kondisi terverifikasi &amp; tepat waktu</span></div>
      <div><h3>Sewa Alat</h3>{categories.map(label => <Link key={label} to="/catalog">{label}</Link>)}</div>
      <div><h3>Bantuan &amp; Panduan</h3>{guides.map(label => <Link key={label} to="/cara-sewa">{label}</Link>)}</div>
      <div><h3>Kontak Operasional</h3><p>Jl. Pajajaran No. 88<br />Baranangsiang, Kota Bogor</p><p>halo@vendoria.id<br />+62 812-8800-4420</p></div>
    </div>
    <div className="auth-footer-bottom"><span>© 2025 Vendoria Indonesia. Hak Cipta Dilindungi.</span><div><span>Syarat &amp; Ketentuan</span><span>Kebijakan Privasi</span><Link to="/register">Gabung Vendor Mitra</Link></div></div>
  </footer>;
}
export default function AuthLayout({ children, badgeText = 'Vendoria Secure', heading = 'Selamat Datang', variant = 'recovery' }) {
  const navigate = useNavigate();
  return <div className={`vendoria-interface vendoria-auth auth-${variant}`}>
    <InterfaceHeader go={navigate} activeLabel="" />
    <main className="auth-main">
      <div className="auth-card">
        <aside className="auth-aside" aria-label="Keamanan Vendoria">
          <Brand />
          <span className="auth-badge"><ShieldCheck size={14} strokeWidth={1.5} />{badgeText}</span>
          <h1>{heading}</h1>
          <div className="auth-features">{features.map(([Icon, title, description]) => <div className="auth-feature" key={title}><span className="auth-feature-icon"><Icon size={18} strokeWidth={1.6} /></span><div><h3>{title}</h3><p>{description}</p></div></div>)}</div>
          <blockquote><p>“Tenang dari awal sampai acara selesai.”</p><strong>98% Transaksi Tanpa Kendala</strong></blockquote>
        </aside>
        <section className="auth-section">{children}</section>
      </div>
      <p className="auth-security"><Lock size={14} strokeWidth={1.5} /><span>Enkripsi SSL 256-bit standar perbankan</span><span aria-hidden="true">•</span><span>Privasi &amp; Keamanan Data</span></p>
    </main>
    <AuthFooter />
  </div>;
}
