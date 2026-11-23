import { useState } from 'react';
import { Modal } from '../vendor/VendorUi';

export default function AdminReviewDialog({ action, record, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  return <Modal title={action.title} onClose={onClose} narrow><p className="v-modal-copy">{record.name || record.id} akan diubah menjadi <strong>{action.nextStatus}</strong> pada data contoh.</p><form className="a-review-form" onSubmit={event => { event.preventDefault(); if (action.requiresNote && !note.trim()) { setError('Tuliskan alasan keputusan terlebih dahulu.'); return; } onConfirm(note.trim()); }}><div className="v-field"><label htmlFor="admin-review-note">Catatan keputusan{action.requiresNote ? ' *' : ' (opsional)'}</label><textarea id="admin-review-note" rows={4} value={note} onChange={event => { setNote(event.target.value); setError(''); }} placeholder={action.requiresNote ? 'Jelaskan alasan keputusan…' : 'Tambahkan catatan peninjauan…'} aria-invalid={Boolean(error)} aria-describedby={error ? 'admin-review-error' : undefined} />{error && <p id="admin-review-error" className="v-field-error" role="alert">{error}</p>}</div><div className="v-modal-actions"><button className="v-button v-button-secondary" type="button" onClick={onClose}>Batal</button><button className={`v-button ${action.requiresNote ? 'v-button-danger' : 'v-button-primary'}`} type="submit">Konfirmasi keputusan</button></div></form></Modal>;
}
