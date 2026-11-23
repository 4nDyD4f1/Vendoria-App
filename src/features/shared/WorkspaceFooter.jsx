import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

// Footer gelap dari desain Figma (node 89:395), dipakai workspace admin.
const columns = [
  ['Sewa Alat', ['Audio & Sound System', 'Stage Lighting & LED', 'Tenda & Kanopi', 'Panggung & Genset', 'Furnitur & Dekorasi'], '/catalog'],
  ['Bantuan & Panduan', ['Cara Pemesanan', 'Verifikasi KTP & KYC', 'Panduan Serah Terima', 'Kebijakan Pengembalian', 'Pusat Bantuan Pelanggan'], '/cara-sewa'],
];

export default function WorkspaceFooter() {
  return <footer className="w-footer">
    <div className="w-footer-grid">
      <div className="w-footer-brand">
        <Link className="w-footer-logo" to="/"><img src="/assets/figma/admin-footer-logo.svg" alt="" /><span>Vendoria</span></Link>
        <p>Marketplace rental perlengkapan event terpercaya dengan jaminan inspeksi kondisi terverifikasi.</p>
        <span className="w-footer-pill"><ShieldCheck size={14} aria-hidden="true" />Kondisi terverifikasi & tepat waktu</span>
      </div>
      {columns.map(([title, links, to]) => <nav key={title} aria-label={title}><h2>{title}</h2><ul>{links.map(label => <li key={label}><Link to={to}>{label}</Link></li>)}</ul></nav>)}
      <div><h2>Kontak Operasional</h2><p>Jl. Pajajaran No. 88<br />Baranangsiang, Kota Bogor</p><p>halo@vendoria.id<br />+62 812-8800-4420</p></div>
    </div>
    <div className="w-footer-bottom"><span>© 2025 Vendoria Indonesia. Hak Cipta Dilindungi.</span><span><Link to="/cara-sewa">Syarat & Ketentuan</Link><Link to="/cara-sewa">Kebijakan Privasi</Link><Link to="/register">Gabung Vendor Mitra</Link></span></div>
  </footer>;
}
