import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../AuthContext';
import WorkspaceResource from '../vendor/VendorResource';
import { PageHeading } from '../vendor/VendorUi';
import { deleteAccounts, listAccounts, saveAccount } from './accountsApi';

export default function AdminAccountPage({ resourceKey, segments, onLoaded, notify }) {
  const { user } = useAuth();
  const [result, setResult] = useState({ data: null, error: '' });
  const alive = useRef(null);
  const current = useRef(null);
  const commit = data => { current.current = data; setResult({ data, error: '' }); onLoaded(data); };
  useEffect(() => {
    const lifecycle = new AbortController(); alive.current = lifecycle;
    listAccounts().then(data => {
      if (!lifecycle.signal.aborted) { current.current = data; setResult({ data, error: '' }); onLoaded(data); }
    }).catch(error => { if (!lifecycle.signal.aborted) setResult({ data: null, error: error.message }); });
    return () => lifecycle.abort();
  }, [user.user_id, onLoaded]);
  if (result.error) return <><PageHeading title="Pengguna" /><section className="v-card v-settings-form" role="alert"><p>{result.error}</p><button type="button" className="v-button v-button-secondary" onClick={() => {
    const life = alive.current; setResult({ data: null, error: '' });
    listAccounts().then(data => { if (!life.signal.aborted) commit(data); }).catch(error => { if (!life.signal.aborted) setResult({ data: null, error: error.message }); });
  }}>Coba lagi</button></section></>;
  if (!result.data) return <p role="status">Memuat data pengguna…</p>;
  const save = async (key, record) => {
    const life = alive.current; const saved = await saveAccount(key, record); if (life.signal.aborted) return;
    commit({ ...current.current, [key]: record.id ? current.current[key].map(item => item.id === saved.id ? saved : item) : [saved, ...current.current[key]] });
    notify(`Pengguna ${record.id ? 'diperbarui' : 'ditambahkan'}.`);
  };
  const remove = async (key, ids) => {
    const life = alive.current; await deleteAccounts(key, ids); if (life.signal.aborted) return;
    commit({ ...current.current, [key]: current.current[key].filter(item => !ids.includes(item.id)) }); notify(`${ids.length} pengguna dihapus.`);
  };
  return <WorkspaceResource resourceKey={resourceKey} segments={segments} data={result.data} onSave={save} onDelete={remove} />;
}
