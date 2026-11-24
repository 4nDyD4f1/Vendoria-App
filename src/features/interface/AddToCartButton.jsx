import { useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, LoaderCircle, Plus, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { addToCart, useCart } from './useCart';
import './catalog-cart.css';

export default function AddToCartButton({ item, compact = false }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const cart = useCart(user);
  const feedbackId = useId();
  const pending = useRef(false);
  const [state, setState] = useState({ pending: false, message: '', success: false, celebrate: false });
  if (user && user.role !== 'customer') return null;
  const className = compact ? 'catalog-cart-button' : 'live-catalog-cart';
  if (!loading && !user) return <Link className={className} to="/login" state={{ message: 'Masuk sebagai customer untuk menambahkan alat ke keranjang.' }} aria-label={`Masuk untuk menambahkan ${item.name} ke keranjang`} title="Masuk untuk menambahkan ke keranjang"><ShoppingCart size={18} aria-hidden="true" />{compact ? <Plus size={10} className="catalog-cart-plus" aria-hidden="true" /> : 'Masuk untuk menyewa'}</Link>;
  const inCart = cart.items.some(entry => entry.id === String(item.id));
  const label = inCart ? `Lihat ${item.name} di keranjang` : `Tambah ${item.name} ke keranjang`;
  const add = async event => {
    event.stopPropagation();
    if (pending.current) return;
    if (inCart) { navigate('/keranjang'); return; }
    pending.current = true;
    setState({ pending: true, message: '', success: false, celebrate: false });
    try {
      await addToCart(item.id);
      setState({ pending: false, message: 'Ditambahkan ke keranjang!', success: true, celebrate: true });
    } catch (failure) {
      setState({ pending: false, message: failure.message, success: false, celebrate: false });
    } finally { pending.current = false; }
  };
  return <div className={compact ? 'catalog-cart-wrap' : 'live-catalog-cart-wrap'}>
    <button type="button" className={`${className}${inCart ? ' is-done' : ''}${state.celebrate ? ' is-celebrating' : ''}`} aria-label={label} title={label} aria-busy={state.pending} aria-describedby={state.message ? feedbackId : undefined} disabled={loading || !cart.ready || Boolean(cart.error) || state.pending} onClick={add} onAnimationEnd={event => { if (event.target === event.currentTarget) setState(current => ({ ...current, celebrate: false })); }}>
      {state.pending ? <LoaderCircle size={18} className="wishlist-spinner" aria-hidden="true" /> : inCart ? <Check size={18} aria-hidden="true" /> : <><ShoppingCart size={18} aria-hidden="true" />{compact && <Plus size={10} className="catalog-cart-plus" aria-hidden="true" />}</>}
      {!compact && (inCart ? 'Lihat keranjang' : 'Tambah ke keranjang')}
      {state.celebrate && <span className="catalog-cart-burst" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--spark': index }} />)}</span>}
    </button>
    {state.message && <span id={feedbackId} className={`${compact ? 'catalog-cart-feedback' : 'live-catalog-cart-error'}${state.success ? ' is-success' : ''}`} role={state.success ? 'status' : 'alert'}>{state.message}</span>}
  </div>;
}
