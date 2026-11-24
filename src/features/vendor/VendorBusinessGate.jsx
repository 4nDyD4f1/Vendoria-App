import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, CheckCircle2, Clock, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { api } from '../../api';
import './vendor-business-gate.css';

const fields = { nama_vendor: 'Nama bisnis', kota: 'Kota operasional', alamat: 'Alamat bisnis', deskripsi: 'Tentang bisnis' };

export default function VendorBusinessGate({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const owner = String(user.user_id);
  const key = `${owner}:${pathname}`;
  const [state, setState] = useState({ key: '', data: null, error: '', status: 0 });
  const sequence = useRef(0);
  const load = useCallback(() => {
    const request = ++sequence.current;
    return api('/api/vendor/readiness').then(data => {
      if (String(data.userId) !== owner) throw Object.assign(new Error('Akun berubah. Muat ulang halaman untuk melanjutkan.'), { status: 409 });
      if (request === sequence.current) setState({ key, data, error: '', status: 0 });
    }).catch(error => { if (request === sequence.current) setState({ key, data: null, error: error.message, status: error.status }); });
  }, [key, owner]);
  useEffect(() => {
    const requests = sequence;
    load();
    const focus = () => { if (!document.hidden) load(); };
    window.addEventListener('focus', focus);
    const timer = setInterval(focus, 20_000);
    return () => { ++requests.current; clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [load]);
  const current = state.key === key;
  if (!current) return <p className="vb-loading" role="status"><LoaderCircle className="vb-spinner" size={20} />Memeriksa kesiapan bisnis…</p>;
  if (state.error) return <section className="v-card vb-gate" role="alert"><h1>Kesiapan bisnis belum dapat diperiksa</h1><p>{state.error}</p><div className="vb-actions">{[401, 403].includes(state.status) ? <Link className="v-button v-button-primary" to="/login">Masuk kembali</Link> : <button className="v-button v-button-primary" type="button" onClick={state.status === 409 ? () => window.location.reload() : load}>{state.status === 409 ? 'Muat ulang halaman' : 'Coba lagi'}</button>}</div></section>;
  const { data } = state;
  if (data.ready) return children;
  const verified = data.verification === 'terverifikasi';
  return <section className="v-card vb-gate" aria-labelledby="business-gate-title"><div className="vb-icon"><LockKeyhole size={27} /></div><p className="vb-eyebrow">SIAPKAN BISNIS ANDA</p><h1 id="business-gate-title">Aktifkan bisnis untuk mulai menyewakan alat</h1><p>Katalog, pesanan, serah terima, klaim, dan pencairan tersedia setelah KYC Anda terverifikasi dan profil bisnis lengkap. Status bisnis akan aktif secara otomatis.</p>
    <ol className="vb-checklist"><li><ShieldCheck size={24} /><div><h2>Verifikasi identitas KYC</h2><p>{verified ? 'Identitas Anda sudah terverifikasi.' : data.verification === 'menunggu' ? 'Pengajuan KYC sedang ditinjau admin.' : data.verification === 'ditolak' ? 'Perbaiki pengajuan sesuai catatan pemeriksa.' : 'Kirim identitas dan dokumen untuk diperiksa.'}</p></div>{verified ? <CheckCircle2 className="vb-complete" size={22} aria-label="KYC selesai" /> : <Clock size={22} aria-label="KYC belum selesai" />}</li>
      <li><Building2 size={24} /><div><h2>Lengkapi profil bisnis</h2><p>{data.profileComplete ? 'Informasi bisnis Anda sudah lengkap.' : `Belum lengkap: ${data.missingFields.map(field => fields[field] || field).join(', ')}.`}</p></div>{data.profileComplete ? <CheckCircle2 className="vb-complete" size={22} aria-label="Profil bisnis lengkap" /> : <Clock size={22} aria-label="Profil bisnis belum lengkap" />}</li></ol>
    <div className="vb-actions"><Link className="v-button v-button-primary" to={!verified ? '/vendor/kyc' : '/vendor/profil-bisnis'}>{!verified ? data.verification === 'menunggu' ? 'Lihat status KYC' : 'Lengkapi KYC' : 'Lengkapi profil bisnis'}</Link>{!verified && !data.profileComplete && <Link className="v-button v-button-secondary" to="/vendor/profil-bisnis">Lengkapi profil bisnis</Link>}<button className="v-button v-button-secondary" type="button" onClick={load}>Periksa kembali</button></div>
  </section>;
}
