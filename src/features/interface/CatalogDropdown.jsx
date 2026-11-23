import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Armchair, CalendarDays, Check, ChevronDown, Grid2X2, HeartHandshake, LampDesk, LayoutGrid, MapPin, MapPinned, Music2, PanelsTopLeft, PartyPopper, Presentation, Sparkles, Speaker, Star, Tent, TrendingUp } from 'lucide-react';
import './catalog-dropdown.css';

const presentation = {
  'Semua kategori': { title: 'Semua Kategori', icon: LayoutGrid },
  'Tenda & kanopi': { title: 'Tenda & Kanopi', icon: Tent },
  'Sound system': { title: 'Sound System', icon: Speaker },
  'Lighting & FX': { title: 'Lighting & FX', icon: LampDesk },
  'Dekorasi & pelaminan': { title: 'Dekorasi & Pelaminan', icon: Sparkles },
  'Kursi & meja': { title: 'Kursi & Meja', icon: Armchair },
  Panggung: { title: 'Panggung', icon: Grid2X2 },
  'Paling populer': { title: 'Paling populer', description: 'Pilihan favorit untuk berbagai acara', icon: TrendingUp },
  'Harga terendah': { title: 'Harga terendah', description: 'Mulai dari yang paling hemat', icon: ArrowUpNarrowWide },
  'Harga tertinggi': { title: 'Harga tertinggi', description: 'Mulai dari harga paling tinggi', icon: ArrowDownWideNarrow },
  'Rating tertinggi': { title: 'Rating tertinggi', description: 'Berdasarkan penilaian penyewa', icon: Star },
  Pernikahan: { title: 'Pernikahan', icon: HeartHandshake },
  Seminar: { title: 'Seminar', icon: Presentation },
  Pesta: { title: 'Pesta', icon: PartyPopper },
  Konser: { title: 'Konser', icon: Music2 },
  Pameran: { title: 'Pameran', icon: PanelsTopLeft },
  'Bogor & Sekitarnya': { title: 'Bogor & Sekitarnya', icon: MapPinned },
  'Semua lokasi': { title: 'Semua lokasi', icon: MapPinned },
};

export default function CatalogDropdown({ kind, options, value, onChange, containerProps }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const typeahead = useRef({ text: '', time: 0 });
  const id = useId();
  const selectedIndex = Math.max(0, options.indexOf(value));
  const selected = presentation[value] || { title: value };
  const home = kind === 'event' || kind === 'location';
  const TriggerIcon = { category: LayoutGrid, sort: ArrowDownWideNarrow, event: CalendarDays, location: MapPin }[kind];
  const label = { category: 'Kategori alat', sort: 'Urutkan', event: 'Jenis acara', location: 'Lokasi layanan' }[kind];
  const heading = { category: 'Kategori alat', sort: 'Urutkan berdasarkan', event: 'Pilih jenis acara', location: 'Pilih lokasi layanan' }[kind];

  const show = (index = selectedIndex) => {
    setActiveIndex(index);
    setPosition(null);
    setOpen(true);
  };
  const choose = index => {
    onChange(options[index]);
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  useLayoutEffect(() => {
    if (!open) return;
    const placeMenu = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const gap = 8;
      const gutter = 12;
      const width = Math.min(Math.max(rect.width, 280), window.innerWidth - gutter * 2);
      const below = window.innerHeight - rect.bottom - gap - gutter;
      const above = rect.top - gap - gutter;
      const list = menuRef.current.querySelector('.catalog-dropdown-options');
      const headingHeight = menuRef.current.firstElementChild.getBoundingClientRect().height;
      const naturalHeight = list.scrollHeight + headingHeight + 14;
      const desiredHeight = Math.min(kind === 'category' || home ? 420 : 336, naturalHeight);
      const upward = below < desiredHeight && above > below;
      const maxHeight = Math.max(100, Math.min(desiredHeight, upward ? above : below));
      const height = Math.min(naturalHeight, maxHeight);
      setPosition({
        left: Math.max(gutter, Math.min(home ? rect.left : rect.right - width, window.innerWidth - width - gutter)),
        top: Math.max(gutter, upward ? rect.top - gap - height : rect.bottom + gap),
        width,
        maxHeight,
      });
    };
    placeMenu();
    const onScroll = event => { if (!menuRef.current?.contains(event.target)) placeMenu(); };
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, kind, home]);

  useEffect(() => {
    if (!open) return;
    const dismiss = event => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const option = document.getElementById(`${id}-option-${activeIndex}`);
    const list = option?.parentElement;
    if (!list) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }, [open, activeIndex, id]);

  const handleKeyDown = event => {
    if (event.key === 'Escape') {
      if (open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) show();
      else setActiveIndex(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const index = event.key === 'Home' ? 0 : options.length - 1;
      if (open) setActiveIndex(index); else show(index);
    } else if (open && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      const now = Date.now();
      const previous = now - typeahead.current.time < 700 ? typeahead.current.text : '';
      const text = previous + event.key.toLocaleLowerCase('id');
      typeahead.current = { text, time: now };
      const match = options.findIndex(option => option.toLocaleLowerCase('id').startsWith(text));
      if (match >= 0) { event.preventDefault(); if (open) setActiveIndex(match); else show(match); }
    }
  };

  return <div {...containerProps} className={`${containerProps.className} catalog-dropdown catalog-dropdown--${kind}${home ? ' home-search-field' : ''}`}>
    <button
      ref={triggerRef}
      type="button"
      className="catalog-dropdown-trigger"
      role="combobox"
      aria-label={`${label}: ${selected.title}`}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? `${id}-listbox` : undefined}
      aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
      onClick={() => open ? setOpen(false) : show()}
      onKeyDown={handleKeyDown}
    >
      <TriggerIcon className="catalog-dropdown-trigger-icon" size={16} strokeWidth={1.7} aria-hidden="true" />
      {home ? <span className="home-search-field-copy"><small>{label}</small><span>{selected.title}</span></span> : <span>{selected.title}</span>}
      <ChevronDown className="catalog-dropdown-chevron" size={15} strokeWidth={1.7} aria-hidden="true" />
    </button>
    {open && createPortal(<div
      ref={menuRef}
      className="catalog-dropdown-menu"
      style={position || { left: 0, top: 0, width: 280, visibility: 'hidden' }}
    >
      <div className="catalog-dropdown-menu-heading">{heading}<span>{options.length} pilihan</span></div>
      <div id={`${id}-listbox`} role="listbox" aria-label={label} className="catalog-dropdown-options" style={{ maxHeight: position ? Math.max(48, position.maxHeight - 52) : 312 }}>
        {options.map((option, index) => {
          const item = presentation[option] || { title: option, icon: kind === 'location' ? MapPin : LayoutGrid };
          const Icon = item.icon;
          const isSelected = option === value;
          return <div
            id={`${id}-option-${index}`}
            key={option}
            role="option"
            aria-selected={isSelected}
            className={`catalog-dropdown-option${activeIndex === index ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}`}
            onPointerMove={() => setActiveIndex(index)}
            onPointerDown={event => event.preventDefault()}
            onClick={() => choose(index)}
          >
            <span className="catalog-dropdown-option-icon"><Icon size={17} strokeWidth={1.7} aria-hidden="true" /></span>
            <span className="catalog-dropdown-option-copy"><span>{item.title}</span>{item.description && <small>{item.description}</small>}</span>
            {isSelected && <Check className="catalog-dropdown-check" size={16} strokeWidth={2} aria-hidden="true" />}
          </div>;
        })}
      </div>
    </div>, document.body)}
  </div>;
}
