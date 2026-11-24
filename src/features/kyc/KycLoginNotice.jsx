import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { kycMessage } from './kycMessages';
import './kyc-reminder.css';

const key = 'vendoria:kyc-notice-dismissed';
const lastDismissed = () => { try { return sessionStorage.getItem(key); } catch { return null; } };

export default function KycLoginNotice() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(lastDismissed);
  const event = user?.login_event ? `${user.user_id}:${user.login_event}` : null;
  if (!event || !['customer', 'vendor'].includes(user.role) || user.status_verifikasi === 'terverifikasi'
    || dismissed === event || /^\/(login|register|two-factor-verification)(?:\/|$)/.test(pathname)) return null;

  const close = () => {
    setDismissed(event);
    try { sessionStorage.setItem(key, event); } catch { /* Dismissal still works for this mounted notice. */ }
  };
  const notice = kycMessage(user.status_verifikasi, user.role);
  return <aside className="kyc-login-notice" role="status" aria-label="Pengingat verifikasi KYC">
    <span className="kyc-login-notice-icon"><ShieldCheck size={24} aria-hidden="true" /></span>
    <div><strong>{notice.title}</strong><p>{notice.message}</p><Link to={notice.to} onClick={close}>{notice.action}<ArrowRight size={14} aria-hidden="true" /></Link></div>
    <button type="button" aria-label="Tutup pengingat KYC" onClick={close}><X size={18} aria-hidden="true" /></button>
  </aside>;
}
