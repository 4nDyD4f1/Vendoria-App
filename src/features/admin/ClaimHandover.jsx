import { useEffect, useState } from 'react';
import { api, apiUrl } from '../../api';

const phases = [['serah_terima', 'Foto serah terima (awal)'], ['pengembalian', 'Foto pengembalian (akhir)']];
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginTop: 6 };
const photo = { width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, display: 'block' };

/** Bukti kondisi dari vendor, supaya admin tidak memutuskan klaim hanya berdasarkan teks. */
export default function ClaimHandover({ orderId }) {
  const [state, setState] = useState({ data: null, error: '' });
  useEffect(() => {
    let active = true;
    api(`/api/orders/${orderId}/handovers`).then(
      data => { if (active) setState({ data, error: '' }); },
      error => { if (active) setState({ data: null, error: error.message }); });
    return () => { active = false; };
  }, [orderId]);

  if (state.error) return <p role="alert" className="kyc-error">Bukti serah terima tidak dapat dimuat: {state.error}</p>;
  if (!state.data) return <p role="status">Memuat bukti serah terima…</p>;
  const { evidence = [], items = [] } = state.data;
  const name = id => items.find(item => item.itemId === id)?.name || 'Alat';
  return <section aria-label="Bukti serah terima">{phases.map(([type, title]) => {
    const entries = evidence.filter(entry => entry.type === type);
    return <div key={type} style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600 }}>{title}</h3>
      {entries.length ? <div style={grid}>{entries.map(entry => <figure key={entry.id} style={{ margin: 0, fontSize: 11 }}>
        {entry.available ? <a href={apiUrl(entry.photoUrl)} target="_blank" rel="noreferrer"><img src={apiUrl(entry.photoUrl)} alt={`${title}: ${name(entry.itemId)}`} style={photo} loading="lazy" /></a> : <span>File tidak tersedia</span>}
        <figcaption style={{ overflowWrap: 'anywhere', marginTop: 4 }}>{name(entry.itemId)}: {entry.note}</figcaption>
      </figure>)}</div> : <p style={{ fontSize: 12 }}>Belum ada foto pada tahap ini.</p>}
    </div>;
  })}</section>;
}
