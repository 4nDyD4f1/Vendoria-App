import { api } from '../../api';

export const listAccounts = () => api('/api/admin/accounts');
