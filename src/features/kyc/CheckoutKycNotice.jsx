import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { kycMessage } from './kycMessages';
import './checkout-kyc.css';

export default function CheckoutKycNotice({ status, focusRef }) {
  const notice = kycMessage(status);
  return <aside className="checkout-kyc-notice" role="status" tabIndex={-1} ref={focusRef}>
    <ShieldCheck size={22} aria-hidden="true" /><div><strong>{notice.title}</strong><p>{notice.message}</p><Link to={notice.to}>{notice.action}<ArrowRight size={14} aria-hidden="true" /></Link></div>
  </aside>;
}
