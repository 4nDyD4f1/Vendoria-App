import { Link } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import './live-cart.css';

export const money = value => `Rp${Number(value).toLocaleString('id-ID')}`;
const steps = ['Keranjang & Acara', 'Pembayaran', 'Terkonfirmasi'];

/** Kepala tiga langkah alur sewa: /keranjang -> /pembayaran/bank -> /booking/terkonfirmasi. */
export default function CheckoutHead({ current, crumb, title, subtitle }) {
  return <>
    <nav className="cart-breadcrumb" aria-label="Breadcrumb"><Link to="/">Beranda</Link><ChevronRight size={13} /><span>{crumb}</span></nav>
    <section className="cart-hero"><h1>{title}</h1><p>{subtitle}</p></section>
    <ol className="cart-steps" aria-label="Tahapan sewa">{steps.map((label, index) => <li key={label} className={index === current ? 'is-current' : index < current ? 'is-done' : ''} aria-current={index === current ? 'step' : undefined}><b>{index < current ? <Check size={14} /> : index + 1}</b><span>{label}</span></li>)}</ol>
  </>;
}
