import { useState } from 'react';
import { Heart, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { useWishlist } from './useWishlist';
import './wishlist.css';

export default function CatalogWishlistButton({ item, overlay = false }) {
  const { user, loading: authLoading } = useAuth();
  const wishlist = useWishlist(user);
  const [feedback, setFeedback] = useState('');
  const active = wishlist.items.some(saved => saved.id === String(item.id));
  const pending = wishlist.pending.includes(String(item.id));
  if (user && user.role !== 'customer') return null;
  if (!authLoading && !user) return <Link to="/login" state={{ message: 'Masuk sebagai customer untuk menyimpan alat ke wishlist.' }} className={`catalog-wishlist-button${overlay ? ' is-overlay' : ''}`} aria-label={`Masuk untuk menyimpan ${item.name}`} title="Masuk untuk menyimpan ke wishlist"><Heart size={18} /></Link>;
  return <div className={`catalog-wishlist-wrap${overlay ? ' is-overlay' : ''}`}>
    <button type="button" className="catalog-wishlist-button" aria-label={`${active ? 'Hapus' : 'Simpan'} ${item.name} ${active ? 'dari' : 'ke'} wishlist`} aria-pressed={active} disabled={authLoading || wishlist.loading || pending || !wishlist.ready} onClick={async () => {
      setFeedback('');
      try { await wishlist.setSaved(item.id, !active); setFeedback(active ? 'Dihapus dari wishlist.' : 'Disimpan ke wishlist.'); }
      catch (failure) { setFeedback(failure.message); }
    }}>
      {pending ? <LoaderCircle size={18} className="wishlist-spinner" /> : <Heart size={18} fill={active ? 'currentColor' : 'none'} />}
    </button>
    {feedback && <span className={`catalog-wishlist-feedback${wishlist.error ? '' : ' is-success'}`} role="status">{feedback}</span>}
  </div>;
}
