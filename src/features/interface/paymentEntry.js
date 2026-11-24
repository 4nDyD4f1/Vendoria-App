// Kept only in this running tab. A typed URL, new tab or refresh has no entry permit.
let permit = null;

export function paymentOrders(value) {
  const ids = Array.isArray(value) ? value.map(String) : String(value || '').split(',');
  if (!ids.length || ids.length > 20 || ids.some(id => !/^[1-9]\d{0,18}$/.test(id))) return '';
  return [...new Set(ids)].sort().join(',');
}

export function paymentFromCart(owner, orderIds) {
  const orders = paymentOrders(orderIds);
  if (!owner || !orders) throw new Error('Pilih pesanan dari keranjang untuk melanjutkan pembayaran.');
  permit = { token: crypto.randomUUID(), owner: String(owner), orders };
  return { to: `/pembayaran/bank?orders=${orders}`, state: { paymentEntry: permit.token } };
}

export const canEnterPayment = (owner, state, orders) => Boolean(permit
  && permit.owner === String(owner) && permit.token === state?.paymentEntry
  && permit.orders === paymentOrders(orders));

export const clearPaymentEntry = () => { permit = null; };
