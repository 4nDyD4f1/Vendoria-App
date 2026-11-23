import { products } from '../../data/mockData';
import catalogEntries from './catalogEntries.json';
import { descendants, nodeText } from './designTree';

// Use a product identity across screens rather than the Figma button's node ID.
export function wishlistItemFor(ancestors, currentProduct) {
  const card = [...ancestors].reverse().find(node => /^(ProductCard|Article)$/.test(node.name || ''));
  const text = nodeText(card);
  const heading = descendants(card, node => /^Heading [23]$/.test(node.name || ''))[0];
  const known = products.find(product => text.includes(product.name)) || (!card ? currentProduct || products.find(product => product.id === 5) : null);
  const title = nodeText(heading) || known?.name;
  if (!title) return null;
  const entry = catalogEntries.find(item => item.title === title);
  const picture = descendants(card, node => node.tag === 'img' && /\.(png|jpe?g|webp)$/.test(node.props?.src || ''))[0];
  const metadata = descendants(card, node => node.name === 'Paragraph')[0];
  const vendor = metadata?.children?.find(node => node.tag === 'p');
  return {
    key: title,
    title,
    category: known?.category || text.match(/TENDA & KANOPI|SOUND SYSTEM|DEKORASI & PELAMINAN|LIGHTING & FX|KURSI & MEJA|PANGGUNG/)?.[0] || 'PERLENGKAPAN EVENT',
    vendor: known?.vendor || nodeText(vendor),
    rating: known?.rating || Number(text.match(/\b(\d\.\d)\b/)?.[1] || 0),
    price: known?.price || entry?.price || Number(text.match(/Rp\s*([\d.]+)/)?.[1]?.replaceAll('.', '') || 0),
    image: picture?.props?.src || entry?.image || '',
    description: known?.description || 'Periksa detail alat dan hubungi vendor untuk kebutuhan acaramu.',
  };
}
