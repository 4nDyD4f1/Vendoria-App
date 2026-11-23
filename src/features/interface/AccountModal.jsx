import { useContext, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import DesignNode from './DesignNode';
import { descendants, nodeText } from './designTree';
import { InterfaceContext } from './InterfaceContext';
import { screenByKey } from './screens';
import { accountFields } from './accountDesign';

// Keep the existing field IDs and local preview actions; no account API is added here.
export default function AccountModal({ kind, tree, onClose }) {
  const context = useContext(InterfaceContext);
  const screen = screenByKey[kind === 'address' ? 'account-add-address' : 'account-add-refund'];
  const dialog = descendants(tree, node => node.name === 'Dialog')[0];
  const fields = dialog.children.filter(node => node.name === 'Fld');
  const checkbox = dialog.children.find(node => node.children?.some(child => child.name === 'Checkbox'));
  const actions = dialog.children.find(node => node.name === 'Account' && node.children?.some(child => child.name === 'Button'));
  const heading = nodeText(dialog.children[0]);
  const ref = useRef(null);

  useLayoutEffect(() => {
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = [...document.querySelectorAll('.vendoria-interface > .interface-header, .vendoria-interface > main, .vendoria-interface > footer')].map(element => [element, element.inert]);
    background.forEach(([element]) => { element.inert = true; });
    document.body.style.overflow = 'hidden';
    ref.current.querySelector('input:not(:disabled), select, textarea, button')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach(([element, previous]) => { element.inert = previous; });
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  const modalContext = {
    ...context,
    screen,
    action: args => {
      if (args.node.name === 'Button - Tutup' || args.label.trim() === 'Batal') { onClose(); return; }
      if (['Simpan', 'Validasi & Simpan'].includes(args.label.trim())) {
        context.action({ ...args, label: 'Simpan' });
        onClose();
        return;
      }
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
        {checkbox && <div className="account-modal-checkbox"><DesignNode node={{ ...checkbox, tag: 'label' }} ancestors={[dialog]} /></div>}
        <div className="account-modal-actions"><DesignNode node={actions} ancestors={[dialog]} /></div>
      </InterfaceContext.Provider>
      <button type="button" className="account-modal-close" aria-label="Tutup" onClick={onClose}><X size={19} strokeWidth={1.6} /></button>
    </section>
  </div>, document.querySelector('.vendoria-interface'));
}
