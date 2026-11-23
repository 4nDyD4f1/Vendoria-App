import { api } from '../../api';

const base = '/api/vendor/settings';
const headers = { 'X-Vendor-Settings': '1' };

export const getVendorSettings = () => api(base);

export const updateVendorOwner = data =>
  api(`${base}/owner`, { method: 'PUT', headers, body: data });

export const updateVendorBusiness = data =>
  api(`${base}/business`, { method: 'PUT', headers, body: data });

export const getVendorSecurity = () => api('/api/account/security');

export const updateVendorPassword = data =>
  api('/api/account/security/password', { method: 'PUT', body: data });

export const configureVendorTwoFactor = enabled =>
  api('/api/account/security/two-factor', { method: 'POST', body: { enabled } });
