import { Link } from 'react-router-dom';
import { vendorAssets } from './vendorAssets';

const categories = ['Audio & Sound System', 'Stage Lighting & LED', 'Tenda & Kanopi', 'Panggung & Genset', 'Furnitur & Dekorasi'];
const help = [['Cara Pemesanan', '/cara-sewa'], ['Verifikasi KTP & KYC', '/vendor/kyc'], ['Panduan Serah Terima', '/vendor/serah-terima'], ['Kebijakan Pengembalian', '/cara-sewa/kebijakan'], ['Pusat Bantuan Pelanggan', '/cara-sewa/faq']];

export default function VendorFooter() {
  return <footer className="vp-footer"><div className="vp-footer-inner"><div className="vp-footer-grid">
    <div className="vp-footer-brand"><Link className="vp-brand" to="/"><img src={vendorAssets.footerLogo} alt="" /><span>Vendoria</span></Link><p>Marketplace rental perlengkapan event terpercaya dengan jaminan inspeksi kondisi terverifikasi.</p><span className="vp-footer-assurance"><img src={vendorAssets.shield} alt="" />Kondisi terverifikasi &amp; tepat waktu</span></div>
    <div><h2>Sewa Alat</h2><ul>{categories.map(category => <li key={category}><Link to={`/catalog?category=${encodeURIComponent(category)}`}>{category}</Link></li>)}</ul></div>
    <div><h2>Bantuan &amp; Panduan</h2><ul>{help.map(([label, to]) => <li key={label}><Link to={to}>{label}</Link></li>)}</ul></div>
    <div><h2>Kontak Operasional</h2><p>Jl. Pajajaran No. 88<br />Baranangsiang, Kota Bogor</p><p><a href="mailto:halo@vendoria.id">halo@vendoria.id</a><br /><a href="tel:+6281288004420">+62 812-8800-4420</a></p></div>
  </div><div className="vp-footer-bottom"><span>© 2026 Vendoria Indonesia. Hak Cipta Dilindungi.</span><div><Link to="/cara-sewa/kebijakan">Syarat &amp; Ketentuan</Link><Link to="/cara-sewa/kebijakan">Kebijakan Privasi</Link><Link to="/register?role=vendor">Gabung Vendor Mitra</Link></div></div></div></footer>;
}
