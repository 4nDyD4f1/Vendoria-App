import { useContext, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import DesignNode from './DesignNode';
import { descendants, nodeText } from './designTree';
import { InterfaceContext } from './InterfaceContext';
import { screenByKey } from './screens';
import { accountFields } from './accountDesign';

// ID isian dari desain Figma. `onSave(nilai)` menyimpan ke backend dan menolak (throw) bila gagal; `record` = data yang diedit.
const fieldIds = {
  address: { name: '109:16679', address: '109:16685', note: '109:16691', primary: '109:16665' },
  refund: { bank: 'account-refund-bank-select', number: '109:17232', owner: '109:17238' },
};

export default function AccountModal({ kind, tree, onClose, onSave, record }) {
  const context = useContext(InterfaceContext);
  const screen = screenByKey[kind === 'address' ? 'account-add-address' : 'account-add-refund'];
  const dialog = descendants(tree, node => node.name === 'Dialog')[0];
  const fields = dialog.children.filter(node => node.name === 'Fld');
  const checkbox = dialog.children.find(node => node.children?.some(child => child.name === 'Checkbox'));
  const actions = dialog.children.find(node => node.name === 'Account' && node.children?.some(child => child.name === 'Button'));
  const heading = record ? 'Edit Alamat' : nodeText(dialog.children[0]);
  const ref = useRef(null);
  const ids = fieldIds[kind];
  const key = field => field === 'primary' ? ids.primary : `${screen.key}:${ids[field]}`;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState({ message: '', errors: {} });
  const pending = useRef(false);
  const setFields = context.setFields;

  useLayoutEffect(() => {
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = [...document.querySelectorAll('.vendoria-interface > .interface-header, .vendoria-interface > main, .vendoria-interface > footer')].map(element => [element, element.inert]);
    background.forEach(([element]) => { element.inert = true; });
    document.body.style.overflow = 'hidden';
    // isian dimuat dari data yang diedit (kosong untuk data baru) dan dibersihkan saat dialog ditutup
    const own = Object.keys(ids).map(field => key(field));
    setFields(current => ({ ...Object.fromEntries(Object.entries(current).filter(([name]) => !own.includes(name))), ...(record ? {
      [key('name')]: record.name, [key('address')]: record.address, [key('note')]: record.note ?? '', [key('primary')]: record.primary } : {}) }));
    ref.current.querySelector('input:not(:disabled), select, textarea, button')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      setFields(current => Object.fromEntries(Object.entries(current).filter(([name]) => !own.includes(name))));
      background.forEach(([element, previous]) => { element.inert = previous; });
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (pending.current) return;
    const value = field => context.fields[key(field)];
    const values = kind === 'address'
      ? { name: value('name') ?? '', address: value('address') ?? '', note: value('note') ?? '', primary: Boolean(value('primary')) }
      : { bank: value('bank') ?? 'Mandiri', number: value('number') ?? '', owner: value('owner') ?? context.user?.nama ?? '' };
    pending.current = true; setBusy(true); setProblem({ message: '', errors: {} });
    try { await onSave(values); onClose(); }
    catch (error) {
      const errors = error.errors || {};
      setProblem({ errors, message: Object.keys(errors).length ? '' : error.status === 401 ? 'Sesi berakhir. Silakan masuk kembali.' : error.message });
      pending.current = false; setBusy(false);
    }
  };

  const modalContext = {
    ...context,
    screen,
    profileFields: Object.fromEntries(Object.entries(ids).filter(([field]) => field !== 'primary' && field !== 'bank').map(([field, id]) => [id, {
      required: field !== 'note', maxLength: { name: 150, address: 500, note: 500, number: 24, owner: 120 }[field], error: problem.errors[field] }])),
    formatText: (text, ancestors) => busy && ['Simpan', 'Validasi & Simpan'].includes(text) ? 'Menyimpan…' : context.formatText(text, ancestors),
    action: args => {
      if (args.node.name === 'Button - Tutup' || args.label.trim() === 'Batal') { if (!pending.current) onClose(); return; }
      if (['Simpan', 'Validasi & Simpan'].includes(args.label.trim())) { submit(); return; }
      context.action(args);
    },
  };
  // The bank selector in the exported frame is decorative; reuse the native dropdown renderer.
  const formFields = kind === 'refund' ? fields.map((field, index) => index === 0 ? {
    ...field,
    children: [field.children[0], { ...field.children[1], children: [{ id: 'account-refund-bank-select', name: 'Dropdown - Bank', tag: 'div', children: ['Mandiri'] }] }],
  } : field) : fields;

  return createPortal(<div className="account-modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="account-modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="account-modal-title" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const controls = [...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
      <h2 id="account-modal-title">{heading}</h2>
      <InterfaceContext.Provider value={modalContext}>
        <div className="account-modal-fields">{formFields.map(field => <DesignNode key={field.id} node={accountFields(field)} ancestors={[dialog]} />)}</div>
        {problem.message && <p className="account-profile-message account-profile-error" role="alert">{problem.message}</p>}
        {checkbox && <div className="account-modal-checkbox"><DesignNode node={{ ...checkbox, tag: 'label' }} ancestors={[dialog]} /></div>}
        <div className="account-modal-actions"><DesignNode node={actions} ancestors={[dialog]} /></div>
      </InterfaceContext.Provider>
      <button type="button" className="account-modal-close" aria-label="Tutup" onClick={onClose}><X size={19} strokeWidth={1.6} /></button>
    </section>
  </div>, document.querySelector('.vendoria-interface'));
}
