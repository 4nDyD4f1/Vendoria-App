import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../AuthContext';
import WorkspaceResource from '../vendor/VendorResource';
import { PageHeading } from '../vendor/VendorUi';
import { listAccounts } from './accountsApi';

export default function AdminAccountPage({ resourceKey, segments, onLoaded }) {
  const { user } = useAuth();
  const [result, setResult] = useState({ data: null, error: '' });
  const alive = useRef(null);
  const commit = data => { setResult({ data, error: '' }); onLoaded(data); };
  useEffect(() => {
    const lifecycle = new AbortController(); alive.current = lifecycle;
    listAccounts().then(data => {
      if (!lifecycle.signal.aborted) { setResult({ data, error: '' }); onLoaded(data); }
    }).catch(error => { if (!lifecycle.signal.aborted) setResult({ data: null, error: error.message }); });
    return () => lifecycle.abort();
  }, [user.user_id, onLoaded]);
  if (result.error) return <><PageHeading title="Pengguna" /><section className="v-card v-settings-form" role="alert"><p>{result.error}</p><button type="button" className="v-button v-button-secondary" onClick={() => {
    const life = alive.current; setResult({ data: null, error: '' });
    listAccounts().then(data => { if (!life.signal.aborted) commit(data); }).catch(error => { if (!life.signal.aborted) setResult({ data: null, error: error.message }); });
  }}>Coba lagi</button></section></>;
  if (!result.data) return <p role="status">Memuat data pengguna…</p>;
  return <WorkspaceResource resourceKey={resourceKey} segments={segments} data={result.data} />;
}
