import { useState } from 'react';
import { Heart } from 'lucide-react';
import './wishlist.css';

export default function WishlistButton({ active, item, buttonProps, overlay = false }) {
  const [animation, setAnimation] = useState(null);
  const label = `${active ? 'Hapus' : 'Simpan'} ${item?.title || 'alat'} ${active ? 'dari' : 'ke'} wishlist`;
  return <button
    {...buttonProps}
    type="button"
    className={`${buttonProps.className} wishlist-toggle${overlay ? ' wishlist-toggle--overlay' : ''}`}
    aria-label={label}
    aria-pressed={active}
    title={active ? 'Hapus dari wishlist' : 'Simpan ke wishlist'}
    data-wishlist-product={item?.key}
    onClick={event => {
      setAnimation(current => ({ count: (current?.count || 0) + 1, adding: !active }));
      buttonProps.onClick(event);
    }}
  >
    <span key={animation?.count || 0} className={`wishlist-heart${animation ? animation.adding ? ' wishlist-heart--add' : ' wishlist-heart--remove' : ''}`}>
      <Heart size={18} strokeWidth={1.8} fill={active ? 'currentColor' : 'none'} aria-hidden="true" />
    </span>
    {animation?.adding && <span key={`burst-${animation.count}`} className="wishlist-burst" aria-hidden="true">
      <span className="wishlist-ring" />
      {Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--wish-angle': `${index * 45}deg` }} />)}
    </span>}
  </button>;
}
