// Tanpa impor gaya Figma: dipakai header di halaman login, jadi harus tetap ringan.
export function nodeText(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return (node?.children || []).map(nodeText).filter(Boolean).join(' ');
}
export function descendants(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...(node.children || []).flatMap(child => descendants(child, predicate))];
}
