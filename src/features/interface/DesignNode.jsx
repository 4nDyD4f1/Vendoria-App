import { createElement, useContext } from 'react';
import { createPortal } from 'react-dom';
import { InterfaceContext } from './InterfaceContext';
import { descendants, layoutStyle, nodeClass, nodeText } from './designTree';
import { faqAnswers } from './faqAnswers';
import googleLogo from './googleLogo';
import CatalogDropdown from './CatalogDropdown';
import WishlistButton from './WishlistButton';
import { wishlistItemFor } from './wishlistData';
import './catalog-card.css';

const categoryText = value => value.replace(/\([^)]*\)/g, '').trim().toLowerCase();
const homeSearchFields = {
  '84:3483': { kind: 'event', fieldId: '84:3487', options: ['Pernikahan', 'Seminar', 'Pesta', 'Konser', 'Pameran'] },
  '84:3495': { kind: 'location', fieldId: '84:3498', options: ['Bogor & Sekitarnya', 'Semua lokasi', 'Bogor', 'Depok', 'Jakarta', 'Tangerang', 'Bekasi'] },
};

function HomeSearchField({ node, props }) {
  const context = useContext(InterfaceContext);
  const { kind, fieldId, options } = homeSearchFields[node.id];
  const key = `${context.screen.key}:${fieldId}`;
  return <CatalogDropdown kind={kind} options={options} value={context.fields[key] ?? options[0]} onChange={value => context.setFields(current => ({ ...current, [key]: value }))} containerProps={props} />;
}

function fieldLabel(node, ancestors) {
  const direct = node.name?.split(' - ')[1];
  if (direct) return direct;
  const field = [...ancestors].reverse().find(n => /^(Field|Label|FormField)$/.test(n.name || '')) || ancestors.at(-1);
  const label = nodeText(field).replace(nodeText(node), '').trim();
  return label.length > 0 && label.length < 100 ? label : node.name || 'Isian';
}

function NativeField({ node, ancestors, props }) {
  const context = useContext(InterfaceContext);
  const name = node.name || '';
  const label = fieldLabel(node, ancestors);
  const example = nodeText(node);
  const key = `${context.screen.key}:${node.id}`;
  const password = /Password/.test(name);
  const date = /Date|date|tanggal|mulai|selesai/i.test(`${name} ${label}`) || /^\d{4}-\d{2}-\d{2}$/.test(example);
  const number = /Number|Numeric/.test(name) || /^\d+$/.test(example);
  const search = /Kata kunci|Cari|Search/i.test(name) || /^Cari /i.test(example);
  const type = password ? 'password' : date ? 'date' : /Phone|Tel|WhatsApp/i.test(`${name} ${label}`) ? 'tel' : /email/i.test(`${name} ${label} ${example}`) ? 'email' : number ? 'number' : 'text';
  const isPlaceholder = /^(Cari |Masukkan|Contoh|contoh|Pilih |Tulis |Gedung|Jalan,)/.test(example);
  let initial = isPlaceholder || password ? '' : example;
  if (!context.preview && context.user) {
    if (example === 'Bagas Arya Pratama') initial = context.user.nama;
    if (example === 'bagas.arya@ipb.ac.id') initial = context.user.email;
    if (/^\+62 812-9876-5432$/.test(example)) initial = context.user.no_telp || '';
  }
  const googleEmail = !context.preview && context.user?.akun_google && example === 'bagas.arya@ipb.ac.id'; // email akun Google dikelola Google
  const value = context.fields[key] ?? initial;
  const multiline = /Text ?Area/i.test(name) || example.length > 130;
  const classes = nodeClass(node);
  const textStyle = descendants(node, n => n.tag === 'p')[0];
  const fontSize = Number((textStyle ? nodeClass(textStyle) : classes).match(/text-\[([\d.]+)px\]/)?.[1] || 11);
  const input = createElement(multiline ? 'textarea' : 'input', {
    ...(multiline ? { rows: 3 } : { type }),
    className: `design-native-input ${textStyle ? nodeClass(textStyle) : ''}`,
    style: { width: '100%', position: 'relative', height: '100%', minHeight: multiline ? 72 : undefined, fontSize },
    'aria-label': label,
    name: node.id,
    placeholder: isPlaceholder ? example : !context.preview && context.user && example === '+62 812-9876-5432' ? 'Contoh: 08xxxx' : undefined,
    value,
    min: number ? 0 : date && /selesai/i.test(label) ? context.rentalDates.start : undefined,
    autoComplete: password ? 'new-password' : 'off',
    disabled: googleEmail || undefined,
    title: googleEmail ? 'Email dikelola oleh akun Google dan tidak dapat diubah' : undefined,
    onChange: event => {
      context.setFields(current => ({ ...current, [key]: event.target.value }));
      if (date && (context.screen.key.startsWith('product') || context.screen.key === 'checkout')) context.setRentalDates(current => ({ ...current, [/selesai|akhir/i.test(label) ? 'end' : 'start']: event.target.value }));
      if (search) context.setFilter(current => ({ ...current, keyword: event.target.value }));
    },
    onKeyDown: event => { if (search && event.key === 'Enter') { event.preventDefault(); context.search(); } },
  });
  return <div {...props} className={`${props.className} design-input${date ? ' design-date-field' : ''}${date && !value ? ' design-date-empty' : ''}`} style={{ ...props.style, ...(classes.includes('absolute') ? {} : { flexShrink: 1 }) }}>{input}</div>;
}

function NativeSelect({ node, ancestors, props }) {
  const context = useContext(InterfaceContext);
  const label = fieldLabel(node, ancestors);
  const text = nodeText(node);
  const hint = `${label} ${text} ${node.name}`;
  const options = /catégorie|kategori/i.test(hint) ? ['Semua kategori', 'Tenda & kanopi', 'Sound system', 'Lighting & FX', 'Dekorasi & pelaminan', 'Kursi & meja', 'Panggung']
    : /populer|urut|harga|rating/i.test(hint) ? ['Paling populer', 'Harga terendah', 'Harga tertinggi', 'Rating tertinggi']
      : /lokasi|Bogor|area/i.test(hint) ? ['Bogor & Sekitarnya', 'Semua lokasi', 'Bogor', 'Depok', 'Jakarta', 'Tangerang', 'Bekasi']
        : /Pernikahan|acara/i.test(hint) ? ['Pernikahan', 'Seminar', 'Pesta', 'Konser', 'Pameran']
          : /bank|rekening/i.test(hint) ? ['BCA', 'Mandiri', 'BRI', 'BNI'] : [text || 'Pilih', 'Semua', 'Aktif', 'Nonaktif'];
  if (text && !options.includes(text)) options.unshift(text);
  const key = `${context.screen.key}:${node.id}`;
  const initial = text || options[0];
  const updateValue = value => {
    context.setFields(current => ({ ...current, [key]: value }));
    if (/kategori/i.test(hint)) context.setFilter(current => ({ ...current, category: value }));
    if (/populer|urut/i.test(hint)) context.setFilter(current => ({ ...current, sort: value }));
  };
  if (context.screen.key === 'catalog' && /kategori|populer|urut/i.test(hint)) {
    const category = /kategori/i.test(hint);
    const activeCategory = categoryText(context.filter.category || '');
    const value = category
      ? options.find(option => option.toLowerCase() === activeCategory) || (activeCategory.startsWith('semua') ? options[0] : context.fields[key] ?? initial)
      : context.filter.sort ?? context.fields[key] ?? initial;
    return <CatalogDropdown kind={category ? 'category' : 'sort'} options={options} value={value} onChange={updateValue} containerProps={props} />;
  }
  return <div {...props} className={`${props.className} design-input`}>
    <select className="design-native-input" aria-label={label} value={context.fields[key] ?? initial} onChange={event => updateValue(event.target.value)}>{options.map(option => <option key={option} value={option}>{option}</option>)}</select>
  </div>;
}

export default function DesignNode({ node, ancestors = [], insideControl = false, index = 0 }) {
  const context = useContext(InterfaceContext);
  if (typeof node === 'string' || typeof node === 'number') return context.formatText(String(node), ancestors);
  if (!node) return null;
  const name = node.name || '';
  const label = nodeText(node);
  const classes = nodeClass(node);
  const style = layoutStyle(node);
  const chain = [...ancestors, node];
  const isCard = /^(ProductCard|ArticleCard|OrderCard|HandoverCard|Article)$/.test(name);
  const catalogCard = context.screen.key === 'catalog' && name === 'ProductCard';
  if (context.hidden[node.id]) return null;
  if (/^Sticky placeholder/.test(name)) return null;
  if (name === 'ProductCard' && !context.matchesProduct(node)) return null;
  const isGrid = /(?:^| )(?:inline-)?grid(?: |$)/.test(classes);
  const control = !insideControl && /^(Button(?: - .*)?|Tab|Link(?:\$\d+)?|Switch(?: - .*)?|Menu Item)$/.test(name);
  const fixedHeight = classes.match(/(?:^| )(?:min-)?h-\[([\d.]+)px\]/)?.[1];
  const isMedia = node.children?.some(child => child.tag === 'img') || node.props?.style?.backgroundImage;
  const layoutBlock = fixedHeight && Number(fixedHeight) > 90 && !isMedia && !classes.includes('absolute');
  const fixedWidth = classes.match(/(?:^| )w-\[([\d.]+)px\]/)?.[1];
  const wideBlock = fixedWidth && Number(fixedWidth) >= 1000 && !classes.includes('absolute');
  const absoluteBadge = classes.includes('absolute') && /rounded-\[(999|99)px\]/.test(classes) && !insideControl;
  const flowBlock = classes.includes('absolute') && !isMedia && !control && (node.tag === 'p' || /^(Heading [1-6]|Paragraph|Small|Bold Text|Italic Text|Fld|Field|Text|Container)(:margin)?$/.test(name));
  const productsGrid = isGrid && node.children?.some(c => c.name === 'ProductCard');
  const isSwitch = control && name.startsWith('Switch');
  const pressed = context.selected[node.id];
  const read = isCard && context.read[node.id];
  const props = {
    ...node.props,
    'data-node-id': node.id,
    'data-name': name || undefined,
    className: `${classes} design-node${isGrid ? ' design-grid' : ''}${productsGrid ? ' products-grid' : ''}${layoutBlock ? ' design-layout-block' : ''}${wideBlock ? ' design-wide-block' : ''}${absoluteBadge ? ' design-absolute-badge' : ''}${flowBlock ? ' design-flow-block' : ''}${control ? ' design-control' : ''}${pressed ? ' interface-filter-active' : ''}${read ? ' interface-read' : ''}`,
    style,
  };
  if (node.props?.['data-wishlist-grid']) props.className += ' wishlist-live-grid';
  if (context.screen.key === 'home' && homeSearchFields[node.id]) return <HomeSearchField node={node} props={props} />;
  if (node.props?.['data-wishlist-item']) props.className += ' wishlist-live-item';
  if (catalogCard) props.className += ' catalog-product-card';
  if (context.screen.key === 'catalog' && name === 'Button' && /^(Semua|Tenda & kanopi|Sound system|Lighting & FX|Dekorasi & pelaminan|Kursi & meja|Panggung) \(\d+\)$/.test(label)) {
    const category = categoryText(context.filter.category || 'Semua kategori');
    const active = category.startsWith('semua') ? label.startsWith('Semua') : categoryText(label) === category;
    props.className += ' catalog-category-chip';
    props['aria-pressed'] = active;
  }
  const faqQuestion = context.screen.key === 'rental-faq' ? node.children?.find(child => child.name === 'Button' && nodeText(child).trim().endsWith('?')) : null;
  if (faqQuestion && context.filter.keyword && !label.toLowerCase().includes(context.filter.keyword.toLowerCase())) return null;
  if (context.screen.key === 'rental-faq' && Object.keys(context.faqExpanded).length && descendants(node, child => child.name === 'Button' && nodeText(child).trim().endsWith('?')).length) {
    props.style = { ...props.style, height: 'auto', gridTemplateRows: 'none', gridAutoRows: 'auto' };
  }
  if (name === 'Modal') {
    props.style = { ...style, width: '100%', gridTemplateColumns: 'minmax(0, 1fr)', zIndex: 60 };
    props.role = 'dialog';
    props['aria-modal'] = true;
    props['aria-label'] = context.screen.title;
  }
  if (name === 'ProductCard') { style.gridColumn = 'auto'; style.gridRow = 'auto'; }
  if (productsGrid && (context.filter.category || context.filter.keyword)) { style.height = 'auto'; style.gridTemplateRows = 'none'; }
  // lingkaran avatar halaman /akun: ikon bawaan desain diganti foto profil user bila ada
  if (context.avatarUrl && node.children?.[0]?.children?.[0]?.props?.src?.includes('9bbc1282ad46bd5f817d')) {
    return <div {...props}><img src={context.avatarUrl} alt="" referrerPolicy="no-referrer" style={{ gridColumn: 1, gridRow: 1, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /></div>;
  }
  if (node.tag === 'img') {
    const imageName = ancestors.at(-1)?.name || '';
    if (context.activeImage && /Tenda Roder.*Tampak Depan/i.test(imageName) && !ancestors.some(n => n.name === 'ProductCard')) props.src = context.activeImage;
    if (context.googleEmail && props.src?.includes('0e9d3e83339b40d20343')) { props.src = googleLogo; props.title = 'Email dari akun Google'; } // gembok -> logo Google
    return <img {...props} alt={imageName.startsWith('Image - ') ? imageName.slice(8) : ''} loading={ancestors.some(n => n.name === 'ProductCard' || n.name === 'Footer') ? 'lazy' : 'eager'} decoding="async" />;
  }
  if (/^(?:Text|Password|Number|Phone|Email|Date|Search|Numeric) Input/.test(name) || /^Text ?Area|^Date Picker/i.test(name)) return <NativeField node={node} ancestors={ancestors} props={props} />;
  if (/^Dropdown(?: - .*)?$/.test(name)) return <NativeSelect node={node} ancestors={ancestors} props={props} />;
  if (name === 'Checkbox' || name.startsWith('Radio Button')) {
    return <input {...props} type={name === 'Checkbox' ? 'checkbox' : 'radio'} aria-label={fieldLabel(node, ancestors)} checked={Boolean(context.fields[node.id])} onChange={event => context.setFields(current => ({ ...current, [node.id]: event.target.checked }))} className={`${classes} design-checkbox`} />;
  }
  if (/^Heading ([1-6])$/.test(name)) { props.role = 'heading'; props['aria-level'] = Number(name.at(-1)); }
  if (name === 'Tabs') props.role = 'tablist';
  if (isCard) props['data-card-id'] = node.id;
  if (name === 'Table') { props.role = 'table'; props['aria-label'] = context.screen.title; }
  if (name === 'Row' || name === 'Table Row') props.role = 'row';
  if (name === 'Table Cell') props.role = 'cell';
  let tag = node.tag;
  if (catalogCard) tag = 'article';
  if (name === 'Footer') tag = 'footer';
  if (name === 'Header') tag = 'header';
  if (name === 'Breadcrumb') { tag = 'nav'; props['aria-label'] = 'Breadcrumb'; }
  if (control) {
    const target = context.targetFor({ node, label, ancestors, index });
    if (!target && Object.keys(context.selected).length && (name === 'Tab' || /^(Semua|Tenda|Sound|Lighting|Dekorasi|Kursi|Panggung|Genset|Furniture)/i.test(label))) {
      props.style = { ...props.style, backgroundColor: pressed ? '#3a2a21' : '#ede1d9' };
      if (!pressed) props.className += ' interface-filter-idle';
    }
    tag = target ? 'a' : 'button';
    if (target) props.href = context.href(target);
    else props.type = 'button';
    props['aria-label'] = name.includes(' - ') ? name.split(' - ')[1] : label || 'Buka pilihan';
    if (context.screen.key === 'catalog' && label.trim() === 'Lihat' && ancestors.some(ancestor => ancestor.name === 'ProductCard')) {
      // The full-card link is the single keyboard destination for this product.
      props.tabIndex = -1;
      props['aria-hidden'] = true;
    }
    if (context.screen.key === 'rental-faq' && label.trim().endsWith('?')) props['aria-expanded'] = context.faqExpanded[node.id] ?? ancestors.at(-1)?.children?.some(child => child.name === 'Paragraph');
    if (name === 'Tab') { props.role = 'tab'; props['aria-selected'] = /bg-\[#3a2a21\]/.test(classes) || Boolean(pressed); }
    if (isSwitch) { props.role = 'switch'; props['aria-checked'] = context.fields[node.id] ?? true; props.className += ' design-switch'; }
    props.onClick = event => {
      if (target && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
      event.preventDefault();
      event.stopPropagation();
      context.action({ node, label, ancestors, index, target });
    };
  }
  if (control && /wishlist/i.test(name) && !/^Button - Wishlist,/.test(name)) {
    const item = wishlistItemFor(ancestors, context.currentProduct);
    return <WishlistButton active={context.wishlist.some(saved => saved.key === item?.key)} item={item} buttonProps={props} overlay={classes.includes('absolute')} />;
  }
  if (name === 'Header') props.style = { ...style, width: '100%' };
  const upload = context.uploads[node.id];
  let children = node.children;
  const faqOpen = faqQuestion ? context.faqExpanded[faqQuestion.id] ?? node.children.some(child => child.name === 'Paragraph') : false;
  if (faqQuestion && !faqOpen) children = children.filter(child => child.name !== 'Paragraph');
  if (productsGrid && context.filter.sort) {
    const price = child => Number(nodeText(child).match(/Rp\s*([\d.]+)/)?.[1]?.replaceAll('.', '') || 0);
    const rating = child => Number(nodeText(child).match(/\b(\d\.\d)\b/)?.[1] || 0);
    children = [...children].sort((a, b) => context.filter.sort === 'Harga terendah' ? price(a) - price(b) : context.filter.sort === 'Harga tertinggi' ? price(b) - price(a) : context.filter.sort === 'Rating tertinggi' ? rating(b) - rating(a) : 0);
  }
  const renderedChildren = children?.map((child, childIndex) => <DesignNode key={typeof child === 'object' ? child.id || childIndex : childIndex} node={child} ancestors={chain} insideControl={insideControl || control} index={childIndex} />);
  if (catalogCard) {
    const title = nodeText(descendants(node, child => child.name === 'Heading 3')[0]);
    const target = context.targetFor({ node: { name: 'Button' }, label: 'Lihat', ancestors: chain });
    renderedChildren.push(<a
      key="card-detail-link"
      className="catalog-card-link"
      href={context.href(target)}
      aria-label={`Lihat detail ${title}`}
      onClick={event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        event.stopPropagation();
        context.action({ node, label: 'Lihat', ancestors: chain, index, target });
      }}
    />);
  }
  if (faqQuestion && faqOpen && !children.some(child => child.name === 'Paragraph')) renderedChildren.push(<p key="answer" className="px-5 pb-5 text-[12px] leading-[22px] text-[#6f6058]">{faqAnswers[nodeText(faqQuestion).trim()]}</p>);
  if (productsGrid && !children.some(child => context.matchesProduct(child))) renderedChildren.push(<p key="empty" role="status" className="col-span-full py-8 text-sm text-[#6f6058]">Tidak ada alat yang sesuai. Coba kata kunci atau kategori lain.</p>);
  const result = createElement(tag, props, upload ? <span className="text-xs break-all">{upload.name}</span> : renderedChildren);
  const overlayRoot = name === 'Modal' ? document.querySelector('.vendoria-interface') : null;
  return overlayRoot ? createPortal(result, overlayRoot) : result;
}
