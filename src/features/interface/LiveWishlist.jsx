import { use, useContext, useEffect, useRef, useState } from 'react';
import { InterfaceContext } from './InterfaceContext';
import DesignNode from './DesignNode';
import { descendants } from './designTree';

const rupiah = amount => `Rp${amount.toLocaleString('id-ID')}`;

function itemCard(template, item, removing) {
  const values = {
    '109:13700': 'Tersedia',
    '109:13706': item.category,
    '109:13709': item.title,
    '109:13715': item.vendor,
    '109:13719': String(item.rating || ''),
    '109:13721': item.description,
  };
  function clone(node) {
    if (typeof node === 'string') return node === 'Rp3.200.000' ? rupiah(item.price) : node;
    const copy = {
      ...node,
      id: node.id ? `${node.id}::${encodeURIComponent(item.key)}` : undefined,
      props: { ...node.props },
      children: node.id in values ? [values[node.id]] : node.children?.map(clone),
    };
    if (node.id === '109:13698') copy.name = `Image (${item.title})`;
    if (node.tag === 'img' && /\.(png|jpe?g|webp)$/.test(node.props?.src || '')) copy.props.src = item.image;
    if (node.id === template.id) {
      copy.props['data-wishlist-item'] = item.key;
      copy.props['data-wishlist-removing'] = removing;
      copy.props.style = { ...copy.props.style, gridColumn: 'auto', gridRow: 'auto' };
    }
    return copy;
  }
  return clone(template);
}

function wishlistTree(tree, visible, saved) {
  const template = descendants(tree, node => node.id === '109:13696')[0];
  const keys = new Set(saved.map(item => item.key));
  const total = saved.reduce((sum, item) => sum + item.price, 0);
  function clone(node) {
    if (typeof node === 'string') {
      if (node === '1 Unit' || node === '0 Unit') return `${saved.length} Unit`;
      if (node === 'Semua (1)') return `Semua (${saved.length})`;
      if (node === 'Rp3.200.000') return rupiah(total);
      return node;
    }
    if (node.id === '109:13656') return null; // The live list has no artificial empty-mode switch.
    if (node.id === '109:13695') return {
      ...node,
      props: { ...node.props, 'data-wishlist-grid': true, style: { ...node.props?.style, height: 'auto', gridTemplateRows: 'none' } },
      children: visible.length ? visible.map(item => itemCard(template, item, !keys.has(item.key))) : [{
        tag: 'p',
        props: { role: 'status', style: { gridColumn: '1 / -1', padding: '32px 0', fontSize: 13, color: '#6f6058' } },
        children: ['Belum ada alat dalam kategori ini di wishlist kamu.'],
      }],
    };
    return {
      ...node,
      props: node.children?.some(child => child === '1 Unit' || child === '0 Unit') ? { ...node.props, 'data-wishlist-count': true } : node.props,
      children: node.children?.map(clone).filter(child => child !== null),
    };
  }
  return clone(tree);
}

export default function LiveWishlist({ loadDesign }) {
  const { wishlist, filter } = useContext(InterfaceContext);
  const timers = useRef(new Map());
  const [transition, setTransition] = useState({ saved: wishlist, visible: wishlist });
  if (transition.saved !== wishlist) {
    // Keep removed cards mounted briefly so their exit animation can finish.
    const keys = new Set(wishlist.map(item => item.key));
    const removed = transition.visible.filter(item => !keys.has(item.key));
    setTransition({ saved: wishlist, visible: [...wishlist, ...removed] });
  }
  const visible = transition.visible;

  useEffect(() => {
    const currentKeys = new Set(wishlist.map(item => item.key));
    for (const item of wishlist) {
      clearTimeout(timers.current.get(item.key));
      timers.current.delete(item.key);
    }
    for (const item of visible.filter(saved => !currentKeys.has(saved.key))) {
      if (timers.current.has(item.key)) continue;
      timers.current.set(item.key, setTimeout(() => {
        setTransition(current => ({
          ...current,
          visible: current.visible.filter(saved => saved.key !== item.key || current.saved.some(savedItem => savedItem.key === item.key)),
        }));
        timers.current.delete(item.key);
      }, 240));
    }
  }, [wishlist, visible]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const tree = use(loadDesign(visible.length ? '109:13575' : '109:13149'));
  const category = (filter.category || '').toLowerCase();
  const matchesCategory = item => {
    if (!category || category.startsWith('semua')) return true;
    if (category.startsWith('sound')) return /sound/i.test(item.category);
    if (category.startsWith('tenda')) return /tenda/i.test(item.category);
    if (category.startsWith('lighting')) return /lighting/i.test(item.category);
    if (category.startsWith('genset')) return /genset/i.test(item.title);
    if (category.startsWith('furniture')) return /kursi|furnitur/i.test(item.category);
    return true;
  };
  return <DesignNode node={wishlistTree(tree, visible.filter(matchesCategory), wishlist)} />;
}
