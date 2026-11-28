import { useEffect, useState } from 'react';
import { apiUrl } from '../../api';
import Skeleton from '../../components/Skeleton';

export default function PrivateKycImage({ src, alt }) {
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    fetch(apiUrl(src), { credentials: 'include', cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Dokumen tidak dapat dimuat.');
        return response.blob();
      }).then(blob => {
        if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setImage(objectUrl); }
      }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);
  return error ? <p role="alert" className="kyc-error">{error}</p> : image ? <a href={image} target="_blank" rel="noreferrer" aria-label={`Buka ${alt} ukuran penuh`}><img src={image} alt={alt} className="kyc-private-image" /></a> : <Skeleton variant="image" label="Memuat dokumen…" />;
}
