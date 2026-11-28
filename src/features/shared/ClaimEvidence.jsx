import { apiUrl } from '../../api';

const photoStyle = { maxWidth: 220, maxHeight: 160, borderRadius: 10, display: 'block', marginTop: 6 };
const Photo = ({ src, alt }) => <a href={apiUrl(src)} target="_blank" rel="noreferrer"><img src={apiUrl(src)} alt={alt} style={photoStyle} /></a>;

/** Foto pelapor dan tanggapan vendor di dalam daftar rincian klaim (<dl>). */
export default function ClaimEvidence({ claim, className }) {
  return <>
    {claim.photoUrl && <div className={className}><dt>Foto dari pelapor</dt><dd><Photo src={claim.photoUrl} alt={`Foto bukti ${claim.id}`} /></dd></div>}
    {claim.response && <div className={className}><dt>Tanggapan vendor</dt><dd>{claim.response}{claim.responsePhotoUrl && <Photo src={claim.responsePhotoUrl} alt={`Foto tanggapan vendor ${claim.id}`} />}</dd></div>}
  </>;
}
