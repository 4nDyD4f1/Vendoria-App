import { nodeText } from './designTree';

export const accountTabs = [
  { key: 'account-profile', label: 'Profil' },
  { key: 'account-security', label: 'Keamanan' },
  { key: 'account-kyc', label: 'KYC' },
  { key: 'account-address', label: 'Alamat Acara' },
  { key: 'account-refund', label: 'Rekening Refund' },
];

export const profileFieldIds = {
  nama: '109:14253',
  email: '109:14262',
  no_telp: '109:14274',
};

export const profileSaveId = '109:14288';

// Exported inputs keep their original IDs/values; add the visible label to their accessible name.
export function accountFields(node, label = '') {
  if (!node || typeof node !== 'object') return node;
  const currentLabel = node.name === 'Fld' ? nodeText(node.children?.[0]?.children?.find(child => child.tag === 'p') || node.children?.[0]).trim() : label;
  const input = /^(?:Text|Password|Phone|Email|Number) Input|^Text Area/.test(node.name || '');
  return {
    ...node,
    ...(input && currentLabel ? { name: `${node.name.split(' - ')[0]} - ${currentLabel}` } : {}),
    ...(node.children ? { children: node.children.map(child => accountFields(child, currentLabel)) } : {}),
  };
}
