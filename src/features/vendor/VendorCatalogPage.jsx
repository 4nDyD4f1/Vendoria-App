import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../AuthContext';
import { WorkspaceResourceContext } from '../shared/workspaceResource';
import { resources } from './vendorData';
import VendorResource from './VendorResource';
import { PageHeading } from './VendorUi';
import { deleteCatalogItems, getVendorCatalog, saveCatalogItem, setupCatalogVendor } from './vendorCatalogApi';

export default function VendorCatalogPage({ segments, onLoaded, notify, onUpload }) {
  const { user } = useAuth();
  const [result, setResult] = useState({ data: null, error: '' });
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState('');
  const alive = useRef(null);
  const current = useRef(null);
  const commit = value => { current.current = value; setResult({ data: value, error: '' }); onLoaded(value); };
  useEffect(() => {
    const lifecycle = new AbortController(); alive.current = lifecycle;
    getVendorCatalog().then(value => {
      if (!lifecycle.signal.aborted) { current.current = value; setResult({ data: value, error: '' }); onLoaded(value); }
    }).catch(error => { if (!lifecycle.signal.aborted) setResult({ data: null, error: error.message }); });
    return () => lifecycle.abort();
  }, [user.user_id, onLoaded]);
  const config = useMemo(() => ({ rootPath: '/vendor', resources: { ...resources, catalog: {
    ...resources.catalog, live: true, imageTypes: ['image/jpeg', 'image/png'], imageHelp: 'JPG atau PNG. Maksimal 5 MB.',
    fields: resources.catalog.fields.map(field => field.key === 'category' ? { ...field, options: (result.data?.categories ?? []).map(category => category.name) }
      : field.key === 'status' ? { ...field, options: ['Aktif', 'Nonaktif', 'Arsip'] }
      : field.key === 'name' ? { ...field, maxLength: 180 }
      : field.key === 'stock' ? { ...field, max: 2147483647 }
      : field.key === 'price' ? { ...field, min: 1, decimal: true, step: .01, max: 999999999999.99 }
      : field.key === 'description' ? { ...field, maxLength: 10000 } : field).concat([
        { key: 'condition', label: 'Kondisi barang', type: 'textarea', optional: true, maxLength: 5000 },
        { key: 'deposit', label: 'Deposit jaminan (Rp), ditagih maks. 60% biaya sewa', type: 'number', min: 1, max: 999999999999.99, step: .01, decimal: true },
      ]),
  } } }), [result.data?.categories]);
  const retry = () => { setResult({ data: null, error: '' }); const life = alive.current; getVendorCatalog().then(value => { if (!life.signal.aborted) commit(value); }).catch(error => { if (!life.signal.aborted) setResult({ data: null, error: error.message }); }); };
  if (result.error) return <><PageHeading title="Katalog alat" /><section className="v-card v-settings-form" role="alert"><p>{result.error}</p><button type="button" className="v-button v-button-secondary" onClick={retry}>Coba lagi</button></section></>;
  if (!result.data) return <p role="status">Memuat katalog Anda…</p>;
  if (!result.data.vendor) return <><PageHeading title="Siapkan katalog Anda" description="Isi nama bisnis yang memiliki perlengkapan ini." /><form className="v-card v-settings-form" onSubmit={async event => {
    event.preventDefault(); if (setupBusy) return;
    const name = new FormData(event.currentTarget).get('name').trim();
    setSetupBusy(true); setSetupError(''); const life=alive.current;
    try { const value = await setupCatalogVendor(name); if (!life.signal.aborted) commit(value); }
    catch (error) { if (!life.signal.aborted) setSetupError(error.message); }
    finally { if (!life.signal.aborted) setSetupBusy(false); }
  }}><div className="v-field"><label htmlFor="catalog-business-name">Nama bisnis</label><input id="catalog-business-name" name="name" required maxLength={150} placeholder="Nama usaha penyewaan Anda" disabled={setupBusy} /></div>{setupError && <p className="v-field-error" role="alert">{setupError}</p>}<div className="v-form-actions"><button className="v-button v-button-primary" disabled={setupBusy}>{setupBusy ? 'Menyimpan…' : 'Simpan dan lanjutkan'}</button></div></form></>;
  if (!result.data.categories.length) return <><PageHeading title="Katalog alat" /><section className="v-card v-settings-form"><p>Kategori alat belum tersedia. Hubungi administrator untuk menyiapkan kategori.</p><button className="v-button v-button-secondary" type="button" onClick={retry}>Muat ulang kategori</button></section></>;
  const save = async (_key, record) => {
    const life=alive.current; const saved=await saveCatalogItem(record);
    if (life.signal.aborted) return;
    commit({ ...current.current, items: record.id ? current.current.items.map(value => value.id === saved.id ? saved : value) : [saved, ...current.current.items] });
    notify(record.id ? 'Alat berhasil diperbarui.' : 'Alat berhasil ditambahkan.');
  };
  const remove = async (_key, ids) => {
    const life=alive.current; await deleteCatalogItems(ids); if (life.signal.aborted) return;
    commit({ ...current.current, items: current.current.items.filter(value => !ids.includes(value.id)) }); notify(`${ids.length} alat berhasil dihapus.`);
  };
  return <WorkspaceResourceContext.Provider value={config}><VendorResource resourceKey="catalog" segments={segments} data={{ catalog: result.data.items }} onSave={save} onDelete={remove} onUpload={onUpload} /></WorkspaceResourceContext.Provider>;
}
