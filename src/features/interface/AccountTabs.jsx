import { use, useContext, useState } from 'react';
import SlidingTabs from './SlidingTabs';
import DesignNode from './DesignNode';
import { InterfaceContext } from './InterfaceContext';
import { descendants, layoutStyle, nodeClass } from './designTree';
import { screenByKey } from './screens';
import AccountModal from './AccountModal';
import { accountFields, accountTabs } from './accountDesign';
import './account.css';

// Menu /akun: satu path, isi panel berganti dengan animasi geser. Tiap menu memakai desain Figma-nya sendiri.
const pageOf = tree => descendants(tree, node => node.children?.some(child => child.name === 'Breadcrumb'))[0];

export default function AccountTabs({ loadDesign, initialTab, initialModal }) {
  const context = useContext(InterfaceContext);
  // Semua desain dimuat bersamaan agar pindah menu tidak memunculkan loader.
  const designs = [...accountTabs.map(tab => loadDesign(screenByKey[tab.key].nodeId)), loadDesign('109:16389'), loadDesign('109:16970')];
  const trees = designs.map(promise => use(promise));
  const pages = trees.slice(0, accountTabs.length).map(pageOf);
  const [active, setActive] = useState(Math.max(0, accountTabs.findIndex(tab => tab.key === initialTab)));
  const [direction, setDirection] = useState(1);
  const [modal, setModal] = useState(initialModal || null);
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
  const panelContext = {
    ...context,
    screen: screenByKey[accountTabs[active].key],
    formatText: (text, ancestors) => {
      if (accountTabs[active].key === 'account-kyc') {
        if (text === 'Terverifikasi') return kycCopy[0];
        if (text === 'Identitas Anda terverifikasi. Booking alat aktif.') return kycCopy[1];
      }
      return context.formatText(text, ancestors);
    },
    action: args => {
      const label = args.label.trim();
      if (label === 'Tambah Alamat' || label === 'Edit' && accountTabs[active].key === 'account-address') {
        setModal('address');
      } else if (label === 'Tambah Rekening') {
        setModal('refund');
      } else context.action(args);
    },
  };

  return <div className={`${nodeClass(pages[0])} design-node account-tabs-page`} data-name="Account" data-kyc-status={kycStatus} style={layoutStyle(pages[0])}>
    {/* kepala profil selalu dari desain pertama (satu-satunya yang dipetakan ke data sesi) */}
    {pages[0].children.slice(0, 2).map(node => <DesignNode key={node.id} node={node} ancestors={[pages[0]]} />)}
    <SlidingTabs tabs={accountTabs} active={active} onSelect={select} label="Menu akun" className="account-tabs-wrap" />
    <InterfaceContext.Provider value={panelContext}>
      <div className="account-panel-viewport">
        <section key={accountTabs[active].key} id={`${accountTabs[active].key}-panel`} role="tabpanel" aria-labelledby={`${accountTabs[active].key}-tab`} tabIndex={0} className="account-tab-panel" style={{ '--account-slide-direction': direction }}>
          <DesignNode node={accountFields(content)} ancestors={[page]} />
        </section>
      </div>
    </InterfaceContext.Provider>
    <DesignNode node={foot} ancestors={[pages[0]]} />
    {modal && <AccountModal kind={modal} tree={trees[modal === 'address' ? 5 : 6]} onClose={() => setModal(null)} />}
  </div>;
}
