import { api } from '../../api';

export const searchVendorWorkspace = ({ q = '', kind = 'all', page = 1, size = 10 } = {}) =>
  api(`/api/vendor/search?${new URLSearchParams({ q, kind, page: String(page), size: String(size) })}`);
