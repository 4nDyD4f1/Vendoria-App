import { useSyncExternalStore } from 'react';
import { api } from '../../api';
import { wishlistItemFor } from './wishlistData';

const empty = Object.freeze({ items: [], loading: false, ready: true, error: '', errorStatus: null, accountChanged: false, pending: [], limit: 200 });
const guest = { subscribe: () => () => {}, getSnapshot: () => empty };
const stores = new Map();
const previewListeners = new Set();
let previewState = { ...empty, items: [wishlistItemFor([])] };
const previewStore = {
  subscribe: listener => { previewListeners.add(listener); return () => previewListeners.delete(listener); },
  getSnapshot: () => previewState,
  toggle: item => {
    if (!item) return false;
    const active = !previewState.items.some(saved => saved.key === item.key);
    previewState = { ...previewState, items: active ? [...previewState.items, item] : previewState.items.filter(saved => saved.key !== item.key) };
    previewListeners.forEach(listener => listener());
    return active;
  },
};

function accountStore(owner) {
  if (stores.has(owner)) return stores.get(owner);
  const listeners = new Set();
  const pending = new Map();
  let state = { ...empty, loading: true, ready: false };
  let sequence = 0;
  let channel;
  let timer;
  const publish = changes => {
    if (!listeners.size) return;
    state = { ...state, ...changes };
    listeners.forEach(listener => listener());
  };
  const refresh = async () => {
    const request = ++sequence;
    try {
      const result = await api('/api/customer/wishlist');
      if (result.userId !== owner) throw Object.assign(new Error('Akun telah berubah. Muat ulang halaman untuk memuat wishlist akun ini.'), { accountChanged: true });
      if (request === sequence) publish({ items: result.items, loading: false, ready: true, error: '', errorStatus: null, accountChanged: false, limit: result.limit });
      return result;
    } catch (failure) {
      if (request === sequence) publish({ items: [], loading: false, ready: false, error: failure.message, errorStatus: failure.status || 0, accountChanged: Boolean(failure.accountChanged) });
      throw failure;
    }
  };
  const quietRefresh = () => { refresh().catch(() => {}); };
  const focus = () => { if (document.visibilityState === 'visible') quietRefresh(); };
  const setSaved = (id, saved) => {
    id = String(id);
    if (!/^[1-9]\d{0,18}$/.test(id)) return Promise.reject(new Error('Alat tidak valid. Buka katalog untuk memilih alat.'));
    if (pending.has(id)) return pending.get(id);
    const mutation = (async () => {
      sequence += 1;
      try {
        await api(`/api/customer/wishlist/${encodeURIComponent(id)}`, { method: saved ? 'PUT' : 'DELETE', headers: { 'X-Wishlist-Request': '1', 'X-Wishlist-Owner': owner } });
        channel?.postMessage({ owner });
        await refresh();
        return saved;
      } catch (failure) {
        publish({ error: failure.message, errorStatus: failure.status || 0 });
        throw failure;
      } finally {
        pending.delete(id);
        publish({ pending: [...pending.keys()] });
      }
    })();
    pending.set(id, mutation);
    publish({ pending: [...pending.keys()], error: '' });
    return mutation;
  };
  const store = {
    getSnapshot: () => state,
    subscribe: listener => {
      listeners.add(listener);
      if (listeners.size === 1) {
        quietRefresh();
        window.addEventListener('focus', focus);
        timer = setInterval(focus, 60000);
        if (typeof BroadcastChannel !== 'undefined') {
          channel = new BroadcastChannel('vendoria:wishlist');
          channel.onmessage = event => { if (event.data?.owner === owner) quietRefresh(); };
        }
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          sequence += 1; clearInterval(timer); channel?.close(); channel = undefined;
          window.removeEventListener('focus', focus);
          state = { ...empty, loading: true, ready: false };
        }
      };
    },
    refresh,
    setSaved,
    toggle: item => item?.source === 'database' ? setSaved(item.id, !state.items.some(saved => saved.id === String(item.id))) : Promise.reject(new Error('Buka katalog untuk menyimpan alat yang tersedia.')),
  };
  stores.set(owner, store);
  return store;
}

export function useWishlist(user, preview = false) {
  const store = preview ? previewStore : user?.role === 'customer' && user.user_id ? accountStore(String(user.user_id)) : guest;
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...state, toggle: store.toggle, setSaved: store.setSaved, refresh: store.refresh };
}
