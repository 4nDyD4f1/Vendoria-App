import { useEffect, useState } from 'react';
import WorkspaceResource from '../vendor/VendorResource';
import { PageHeading } from '../vendor/VendorUi';
import { listCatalog, saveCatalogStatus } from './catalogApi';
import Skeleton from '../../components/Skeleton';

export default function AdminCatalogPage({ segments, onLoaded, notify }) {
  const [state, setState] = useState({ items: null, error: '' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const life = new AbortController();
    listCatalog().then(items => { if (!life.signal.aborted) setState({ items, error: '' }); })
      .catch(error => { if (!life.signal.aborted) setState({ items: null, error: error.message }); });
    return () => life.abort();
  }, [retry]);
  useEffect(() => { if (state.items) onLoaded(state.items); }, [state.items, onLoaded]);
  if (state.error) return <><PageHeading title="Katalog alat" /><section className="v-card v-settings-form" role="alert"><p>{state.error}</p><button type="button" className="v-button v-button-secondary" onClick={() => { setState({ items: null, error: '' }); setRetry(count => count + 1); }}>Coba lagi</button></section></>;
  if (!state.items) return <Skeleton variant="list" label="Memuat katalog alat…" />;
  const save = async (key, record) => {
    const saved = await saveCatalogStatus(record.id, record.status); // menolak (throw) bila gagal: form menampilkan pesannya
    setState(current => ({ ...current, items: current.items.map(item => item.id === saved.id ? saved : item) }));
    notify('Status alat diperbarui.');
  };
  return <WorkspaceResource resourceKey="catalog" segments={segments} data={{ catalog: state.items }} onSave={save} />;
}
