import { Link } from 'react-router-dom';
import { screens } from './screens';
import './interface.css';

export default function InterfaceReviewPage() {
  return <main className="vendoria-interface interface-review">
    <Link to="/">← Kembali ke Vendoria</Link>
    <h1>Pratinjau interface Vendoria</h1>
    <p>70 layar dari halaman Figma “versi revisi”. Pratinjau menggunakan data contoh; tindakan di sini hanya mengubah simulasi lokal.</p>
    {['Customer', 'Vendor', 'Admin'].map(group => <section key={group}>
      <h2>{group}</h2>
      <div className="interface-review-grid">{screens.filter(screen => group === 'Vendor' ? screen.role === 'vendor' : group === 'Admin' ? screen.role === 'admin' : !screen.backoffice).map(screen => <Link key={screen.key} to={`/interface-review/${screen.key}`}><strong>{screen.title}</strong><small>{screen.path}</small></Link>)}</div>
    </section>)}
  </main>;
}
