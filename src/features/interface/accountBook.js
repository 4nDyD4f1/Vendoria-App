// Mengisi kartu desain Figma (alamat acara, rekening refund) dengan data backend: kartu contoh digandakan per data.
// Id node diberi akhiran "~<id data>" agar kunci React unik dan tombol Edit/Hapus tahu data mana yang dimaksud.
const suffix = (node, tag) => typeof node === 'string' ? node : { ...node, id: `${node.id}~${tag}`, children: node.children?.map(child => suffix(child, tag)) };

// Ganti teks pertama di dalam node (node <p> berisi string, node pembungkus meneruskan ke anak pertamanya).
const withText = (node, text) => typeof node === 'string' ? text : node.tag === 'p' ? { ...node, children: [text] } : { ...node, children: node.children.map((child, index) => index === 0 ? withText(child, text) : child) };

export const recordIdOf = node => node.id.split('~')[1];

export function replaceNode(tree, matches, build) {
  if (!tree || typeof tree !== 'object') return tree;
  if (matches(tree)) return build(tree);
  return tree.children ? { ...tree, children: tree.children.map(child => replaceNode(child, matches, build)) } : tree;
}

// Wadah yang anaknya kartu "Article" (alamat): kartu pertama = gaya alamat utama, kartu kedua = gaya alternatif.
export const holdsAddresses = node => node.children?.some(child => child.name === 'Article');
export function addressCards(container, addresses) {
  const [primary, alternate = primary] = container.children.filter(child => child.name === 'Article');
  return { ...container, children: addresses.map(address => {
    const card = suffix(address.primary ? primary : alternate, address.id);
    const [label, title, line, note, actions] = card.children;
    return { ...card, children: [withText(label, address.primary ? 'Alamat Utama' : 'Alternatif'), withText(title, address.name), withText(line, address.address),
      ...(address.note ? [withText(note, `Catatan: ${address.note}`)] : []), actions] };
  }) };
}

// Wadah rekening: kartu = "Container" yang punya anak "Text:align"; tombol Riwayat Refund tetap di wadah yang sama.
const isAccountCard = node => node.name === 'Container' && node.children?.some(child => child.name === 'Text:align');
export const holdsAccounts = node => node.children?.some(isAccountCard);
export function accountCards(container, accounts) {
  const template = container.children.find(isAccountCard);
  const cards = accounts.map(account => {
    const card = suffix(template, account.id);
    const [identity, validated, primary] = card.children;
    const [bank, owner] = identity.children[0].children;
    return { ...card, children: [{ ...identity, children: [{ ...identity.children[0], children: [withText(bank, `${account.bank} ${account.masked}`), withText(owner, `a.n. ${account.owner}`)] }] }, validated, ...(account.primary ? [primary] : [])] };
  });
  return { ...container, children: container.children.flatMap(child => child === template ? cards : [child]) };
}
