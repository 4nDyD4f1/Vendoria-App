import { useSyncExternalStore } from 'react';
import { wishlistItemFor } from './wishlistData';

const prefix = 'vendoria:wishlist:v1:';
const stores = new Map();

function parseItems(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) return [];
    const unique = new Map();
    for (const item of parsed.slice(0, 200)) {
      if (item && typeof item.key === 'string' && item.key === item.title && typeof item.image === 'string' && item.image.startsWith('/assets/figma/') && Number.isFinite(item.price)) unique.set(item.key, item);
    }
    return [...unique.values()];
  } catch { return []; }
}

function getStore(scope) {
  if (stores.has(scope)) return stores.get(scope);
  const key = prefix + scope;
  const preview = scope === 'preview';
  let items = [];
  if (preview) items = [wishlistItemFor([])];
  else {
    try { items = parseItems(localStorage.getItem(key)); } catch { /* In-memory state still works when browser storage is unavailable. */ }
  }
  const listeners = new Set();
  const publish = next => { items = next; listeners.forEach(listener => listener()); };
  const store = {
    getSnapshot: () => items,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    toggle: item => {
      if (!item) return false;
      const active = !items.some(saved => saved.key === item.key);
      const next = active ? [...items, item] : items.filter(saved => saved.key !== item.key);
      if (!preview) {
        try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep the immediate UI update available. */ }
      }
      publish(next);
      return active;
    },
    receive: value => {
      const next = parseItems(value);
      if (JSON.stringify(next) !== JSON.stringify(items)) publish(next);
    },
  };
  stores.set(scope, store);
  return store;
}

if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key?.startsWith(prefix)) stores.get(event.key.slice(prefix.length))?.receive(event.newValue);
  else if (event.key === null) for (const [scope, store] of stores) if (scope !== 'preview') store.receive(null);
});

export function useWishlist(user, preview = false) {
  const scope = preview ? 'preview' : user ? `user:${user.id}` : 'guest';
  const store = getStore(scope);
  const items = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { items, toggle: store.toggle };
}
