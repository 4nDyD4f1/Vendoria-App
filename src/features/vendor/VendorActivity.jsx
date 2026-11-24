import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { EmptyState, PageHeading } from './VendorUi';

export function VendorNotifications({ notifications, onRead, onDelete }) {
  const [filter, setFilter] = useState('all');
  const unread = notifications.filter(item => !item.read).length;
  const items = notifications.filter(item => filter !== 'unread' || !item.read);
  return <><PageHeading title="Notifikasi" description="Informasi pesanan, jadwal, dan aktivitas workspace Anda."><button className="v-button v-button-secondary" type="button" disabled={!unread} onClick={() => onRead(notifications.map(item => item.id))}><CheckCheck size={17} />Tandai semua dibaca</button></PageHeading><section className="v-card"><div className="v-notification-tabs" role="group" aria-label="Filter notifikasi"><button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Semua<span>{notifications.length}</span></button><button type="button" aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>Belum dibaca<span>{unread}</span></button></div>{items.length ? <div className="v-notifications">{items.map(item => <article className={`v-notification${item.read ? '' : ' is-unread'}`} key={item.id}><div className="v-notification-icon"><Bell size={18} strokeWidth={1.5} /></div><Link to={item.path} onClick={() => onRead([item.id])}><strong>{item.title}</strong><p>{item.body}</p><small>{item.time}</small></Link><div className="v-row-actions">{!item.read && <button className="v-icon-button" type="button" aria-label={`Tandai dibaca: ${item.title}`} title="Tandai dibaca" onClick={() => onRead([item.id])}><CheckCheck size={17} /></button>}<button className="v-icon-button v-delete-button" type="button" aria-label={`Hapus notifikasi: ${item.title}`} title="Hapus notifikasi" onClick={() => onDelete(item.id)}><Trash2 size={16} /></button></div></article>)}</div> : <EmptyState title={filter === 'unread' ? 'Semua sudah dibaca' : 'Belum ada notifikasi'} description="Informasi terbaru workspace akan muncul di sini." />}</section></>;
}

export { default as VendorSearch } from './VendorSearchPage';
