import { useSyncExternalStore } from 'react';
import { api } from '../../api';

const empty = Object.freeze({ items: [], categories: [], ready: true, error: '' });
const guest = { subscribe: () => () => {}, getSnapshot: () => empty, reload: () => {} };
const stores = new Map();
const headers = { 'X-Cart-Request': '1' };
const item = id => '/api/customer/cart/items/' + encodeURIComponent(id);
const changed = () => Promise.allSettled([...stores.values()].filter(store => store.active()).map(store => store.refresh()));

// One account-bound request/store for the header, all catalog cards and the cart.
function accountStore(owner) {
  if (stores.has(owner)) return stores.get(owner);
  const listeners = new Set();
  let state = { ...empty, ready: false };
  let sequence = 0;
  const publish = next => {
    if (!listeners.size) return;
    state = next;
    listeners.forEach(listener => listener());
  };
  const refresh = async () => {
    const request = ++sequence;
    try {
      const result = await api('/api/customer/cart');
      if (String(result.userId) !== owner) throw new Error('Akun telah berubah. Muat ulang untuk memuat keranjang akun ini.');
      if (request === sequence) publish({ items: result.items, categories: result.eventCategories, ready: true, error: '' });
    } catch (error) {
      if (request === sequence) publish({ ...empty, error: error.message });
    }
  };
  const store = {
    active: () => listeners.size > 0,
    getSnapshot: () => state,
    refresh,
    reload: refresh,
    subscribe: listener => {
      listeners.add(listener);
      if (listeners.size === 1) {
        refresh();
        window.addEventListener('focus', refresh);
        window.addEventListener('vendoria:cart', refresh);
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          ++sequence;
          window.removeEventListener('focus', refresh);
          window.removeEventListener('vendoria:cart', refresh);
          state = { ...empty, ready: false };
        }
      };
    },
  };
  stores.set(owner, store);
  return store;
}

export const addToCart = async id => { await api(item(id), { method: 'PUT', headers, body: { quantity: 1, keepExisting: true } }); await changed(); };
export const setCartQuantity = async (id, quantity) => { await api(item(id), { method: 'PUT', headers, body: { quantity } }); await changed(); };
export const removeFromCart = async id => { await api(item(id), { method: 'DELETE', headers }); await changed(); };
export const checkoutCart = async body => { const result = await api('/api/customer/cart/checkout', { method: 'POST', headers, body }); await changed(); return result; };

export function useCart(user) {
  const store = user?.role === 'customer' && user.user_id ? accountStore(String(user.user_id)) : guest;
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...state, count: state.items.length, reload: store.reload };
}
