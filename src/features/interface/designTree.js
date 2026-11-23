import styles from './designStyles';

export function nodeText(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return (node?.children || []).map(nodeText).filter(Boolean).join(' ');
}
export function descendants(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...(node.children || []).flatMap(child => descendants(child, predicate))];
}
export function nodeClass(node) { return styles[node.style] || ''; }

// Flexible tracks preserve Figma's column ratios at 1280px while allowing narrower viewports.
export function layoutStyle(node) {
  const classes = nodeClass(node);
  const style = { ...node.props?.style };
  const tracks = classes.match(/(?:^| )grid-cols-\[([^\]]+)\]/)?.[1]?.split('_').filter(Boolean);
  if (!classes.includes('absolute') && tracks?.length && tracks.every(t => /^\d+(\.\d+)?px$/.test(t)) && tracks.some(t => parseFloat(t) >= 100)) {
    style.gridTemplateColumns = tracks.map(t => `minmax(0, ${parseFloat(t)}fr)`).join(' ');
    if (classes.includes('inline-grid')) style.width = '100%';
  }
  return style;
}
