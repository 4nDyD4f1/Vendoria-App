import { useRef, useState } from 'react';
import { useAuth } from '../../AuthContext';
import CheckoutKycNotice from './CheckoutKycNotice';

export function useCheckoutKyc() {
  const { user, refreshUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [denial, setDenial] = useState(null);
  const pending = useRef(false);
  const noticeRef = useRef(null);
  const status = denial && user.status_verifikasi === denial.previous ? denial.status : user.status_verifikasi;
  const focus = () => requestAnimationFrame(() => noticeRef.current?.focus());
  const verify = async () => {
    if (pending.current) return false;
    pending.current = true;
    setChecking(true);
    try {
      const fresh = await refreshUser();
      if (String(fresh.user_id) !== String(user.user_id) || fresh.role !== 'customer') throw new Error('Akun telah berubah. Muat ulang halaman sebelum melanjutkan checkout.');
      setDenial(null);
      if (fresh.status_verifikasi !== 'terverifikasi') { focus(); return false; }
      return true;
    } finally { pending.current = false; setChecking(false); }
  };
  const reject = error => {
    if (error.code !== 'KYC_REQUIRED') return false;
    setDenial({ previous: user.status_verifikasi, status: error.verification || 'belum_diverifikasi' });
    refreshUser().catch(() => {});
    focus();
    return true;
  };
  return { verify, reject, checking, notice: status !== 'terverifikasi' ? <CheckoutKycNotice status={status} focusRef={noticeRef} /> : null };
}
