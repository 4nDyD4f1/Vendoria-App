import { Link } from 'react-router-dom';
import { vendorAssets } from './vendorAssets';

const workspace = [['Katalog alat', '/vendor/katalog'], ['Pesanan masuk', '/vendor/pesanan'], ['Serah terima', '/vendor/serah-terima'], ['Klaim', '/vendor/klaim'], ['Pencairan', '/vendor/pencairan']];
const help = [['Profil pemilik', '/vendor/pengaturan'], ['Profil bisnis', '/vendor/profil-bisnis'], ['Verifikasi KTP & KYC', '/vendor/kyc'], ['Keamanan akun', '/vendor/keamanan'], ['Pencarian workspace', '/vendor/pencarian']];

export default function VendorFooter() {
  return <footer className="vp-footer"><div className="vp-footer-inner"><div className="vp-footer-grid">
    <div className="vp-footer-brand"><Link className="vp-brand" to="/vendor/dashboard"><img src={vendorAssets.footerLogo} alt="" /><span>Vendoria</span></Link><p>Marketplace rental perlengkapan event terpercaya dengan jaminan inspeksi kondisi terverifikasi.</p><span className="vp-footer-assurance"><img src={vendorAssets.shield} alt="" />Kondisi terverifikasi &amp; tepat waktu</span></div>
    <div><h2>Workspace Vendor</h2><ul>{workspace.map(([label, to]) => <li key={label}><Link to={to}>{label}</Link></li>)}</ul></div>
    <div><h2>Pengaturan Akun</h2><ul>{help.map(([label, to]) => <li key={label}><Link to={to}>{label}</Link></li>)}</ul></div>
    <div><h2>Kontak Operasional</h2><p>Jl. Pajajaran No. 88<br />Baranangsiang, Kota Bogor</p><p><a href="mailto:halo@vendoria.id">halo@vendoria.id</a><br /><a href="tel:+6281288004420">+62 812-8800-4420</a></p></div>
  </div><div className="vp-footer-bottom"><span>© 2026 Vendoria Indonesia. Hak Cipta Dilindungi.</span><div><Link to="/vendor/dashboard">Dashboard</Link><Link to="/vendor/profil-bisnis">Profil Bisnis</Link><Link to="/vendor/keamanan">Keamanan Akun</Link></div></div></div></footer>;
}
