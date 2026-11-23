import { use, useContext, useRef, useState } from 'react';
import { useAuth } from '../../AuthContext';
import SlidingTabs from './SlidingTabs';
import DesignNode from './DesignNode';
import { InterfaceContext } from './InterfaceContext';
import { descendants, layoutStyle, nodeClass } from './designTree';
import { screenByKey } from './screens';
import { AccountAddressPanel, AccountRefundPanel } from './AccountBookPanels';
import AccountSecurityPanel from './AccountSecurityPanel';
import { accountFields, accountTabs, profileFieldIds, profileSaveId } from './accountDesign';
import './account.css';

// Menu /akun: satu path, isi panel berganti dengan animasi geser. Tiap menu memakai desain Figma-nya sendiri.
const pageOf = tree => descendants(tree, node => node.children?.some(child => child.name === 'Breadcrumb'))[0];

export default function AccountTabs({ loadDesign, initialTab, initialModal }) {
  const context = useContext(InterfaceContext);
  const { updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const pendingSave = useRef(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [profileMessage, setProfileMessage] = useState(null);
  const [profileDraft, setProfileDraft] = useState({ userId: context.user?.user_id, fields: {} });
  const profileValues = profileDraft.userId === context.user?.user_id ? profileDraft.fields : {};
  const setProfileFields = updater => setProfileDraft(current => ({
    userId: context.user?.user_id,
    fields: updater(current.userId === context.user?.user_id ? current.fields : {}),
  }));
  // Semua desain dimuat bersamaan agar pindah menu tidak memunculkan loader.
  const designs = [...accountTabs.map(tab => loadDesign(screenByKey[tab.key].nodeId)), loadDesign('109:16389'), loadDesign('109:16970')];
  const trees = designs.map(promise => use(promise));
  const pages = trees.slice(0, accountTabs.length).map(pageOf);
  const [active, setActive] = useState(Math.max(0, accountTabs.findIndex(tab => tab.key === initialTab)));
  const [direction, setDirection] = useState(1);
  const kycStatus = context.user?.status_verifikasi || 'belum_diverifikasi';
  const kycCopy = {
    terverifikasi: ['Terverifikasi', 'Identitas Anda terverifikasi. Booking alat aktif.'],
    menunggu: ['Menunggu verifikasi', 'Dokumen Anda sedang ditinjau. Lihat detail KYC untuk memantau statusnya.'],
    ditolak: ['Perlu diperbaiki', 'Periksa catatan verifikasi dan perbarui dokumen Anda di halaman KYC.'],
    belum_diverifikasi: ['Belum diverifikasi', 'Lengkapi verifikasi identitas Anda untuk melanjutkan pemesanan alat.'],
  }[kycStatus] || ['Belum diverifikasi', 'Lengkapi verifikasi identitas Anda untuk melanjutkan pemesanan alat.'];
  const page = pages[active];
  const [content, foot] = [page.children[3], pages[0].children[4]];
  const select = index => {
    if (index === active) return;
    setDirection(index > active ? 1 : -1);
    setActive(index);
  };
  const saveProfile = async event => {
    event.preventDefault();
    if (pendingSave.current) return;
    pendingSave.current = true;
    setSaving(true);
    setProfileErrors({});
    setProfileMessage(null);
    const data = Object.fromEntries(Object.entries(profileFieldIds).map(([field, id]) => [
      field, profileValues[`account-profile:${id}`] ?? context.user?.[field] ?? '',
    ]));
    try {
      const updated = await updateProfile(data);
      setProfileFields(current => ({ ...current, ...Object.fromEntries(Object.entries(profileFieldIds).map(([field, id]) => [
        `account-profile:${id}`, updated[field] ?? '',
      ])) }));
      setProfileMessage({ text: 'Data pribadi dan kontak berhasil disimpan.', error: false });
    } catch (error) {
      setProfileErrors(error.errors || {});
      setProfileMessage({ text: error.status === 401 ? 'Sesi berakhir. Silakan masuk kembali.' : error.message, error: true });
    } finally {
      pendingSave.current = false;
      setSaving(false);
    }
  };
  const isProfile = accountTabs[active].key === 'account-profile';
  const panelContext = {
    ...context,
    fields: isProfile ? profileValues : context.fields,
    setFields: isProfile ? setProfileFields : context.setFields,
    submitNodeId: isProfile ? profileSaveId : undefined,
    profileFields: isProfile ? {
      [profileFieldIds.nama]: { required: true, maxLength: 120, autoComplete: 'name', error: profileErrors.nama },
      [profileFieldIds.email]: { required: true, maxLength: 255, autoComplete: 'email', error: profileErrors.email },
      [profileFieldIds.no_telp]: { required: true, autoComplete: 'tel', pattern: '\\+?[0-9\\s\\(\\)\\-]{8,30}', error: profileErrors.no_telp },
      '109:14281': { disabled: true, hint: 'Organisasi belum dapat diubah.' },
    } : undefined,
    screen: screenByKey[accountTabs[active].key],
    formatText: (text, ancestors) => {
      if (isProfile && saving && text === 'Simpan Perubahan') return 'Menyimpan…';
      if (accountTabs[active].key === 'account-kyc') {
        if (text === 'Terverifikasi') return kycCopy[0];
        if (text === 'Identitas Anda terverifikasi. Booking alat aktif.') return kycCopy[1];
      }
      return context.formatText(text, ancestors);
    },
  };

  return <div className={`${nodeClass(pages[0])} design-node account-tabs-page`} data-name="Account" data-kyc-status={kycStatus} style={layoutStyle(pages[0])}>
    {/* kepala profil selalu dari desain pertama (satu-satunya yang dipetakan ke data sesi) */}
    {pages[0].children.slice(0, 2).map(node => <DesignNode key={node.id} node={node} ancestors={[pages[0]]} />)}
    <SlidingTabs tabs={accountTabs} active={active} onSelect={select} label="Menu akun" className="account-tabs-wrap" />
    <InterfaceContext.Provider value={panelContext}>
      <div className="account-panel-viewport">
        <section key={accountTabs[active].key} id={`${accountTabs[active].key}-panel`} role="tabpanel" aria-labelledby={`${accountTabs[active].key}-tab`} tabIndex={0} className="account-tab-panel" style={{ '--account-slide-direction': direction }}>
          {isProfile ? <form onSubmit={saveProfile} aria-label="Data pribadi dan kontak" aria-busy={saving} onChange={() => { setProfileMessage(null); setProfileErrors({}); }}>
            <fieldset disabled={saving} className="account-profile-fields">
              <DesignNode node={accountFields(content)} ancestors={[page]} />
            </fieldset>
            {profileMessage && <p className={`account-profile-message${profileMessage.error ? ' account-profile-error' : ''}`} role={profileMessage.error ? 'alert' : 'status'}>{profileMessage.text}</p>}
          </form> : accountTabs[active].key === 'account-security' ? <AccountSecurityPanel key={context.user?.user_id} content={content} page={page} />
            : accountTabs[active].key === 'account-address' ? <AccountAddressPanel key={context.user?.user_id} content={content} page={page} modalTree={trees[5]} initialModal={initialModal} />
              : accountTabs[active].key === 'account-refund' ? <AccountRefundPanel key={context.user?.user_id} content={content} page={page} modalTree={trees[6]} initialModal={initialModal} />
                : <DesignNode node={accountFields(content)} ancestors={[page]} />}
        </section>
      </div>
    </InterfaceContext.Provider>
    <DesignNode node={foot} ancestors={[pages[0]]} />
  </div>;
}
