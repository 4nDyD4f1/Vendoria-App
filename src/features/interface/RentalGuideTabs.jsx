import { use, useContext, useState } from 'react';
import DesignNode from './DesignNode';
import { InterfaceContext } from './InterfaceContext';
import { descendants, layoutStyle, nodeClass } from './designTree';
import { screenByKey } from './screens';
import SlidingTabs from './SlidingTabs';
import './rental-guide-tabs.css';

const tabs = [
  { key: 'rental-guide', label: 'Cara Sewa' },
  { key: 'rental-faq', label: 'Pusat Bantuan & FAQ' },
  { key: 'rental-policy', label: 'Kebijakan Deposit & Proteksi' },
];

export default function RentalGuideTabs({ loadDesign, initialTab }) {
  const context = useContext(InterfaceContext);
  // Start all imports together, so switching tabs never replaces the page with a loader.
  const designs = tabs.map(tab => loadDesign(screenByKey[tab.key].nodeId));
  const pages = designs.map(promise => descendants(use(promise), node => node.name === 'Page')[0]);
  const [active, setActive] = useState(Math.max(0, tabs.findIndex(tab => tab.key === initialTab)));
  const [direction, setDirection] = useState(1);
  const activeTab = tabs[active];
  const page = pages[active];

  const select = index => {
    if (index === active) return;
    setDirection(index > active ? 1 : -1);
    setActive(index);
  };
  const panelContext = {
    ...context,
    screen: screenByKey[activeTab.key],
    action: args => {
      if (activeTab.key === 'rental-faq' && args.label.trim().endsWith('?')) {
        const initiallyOpen = args.ancestors.at(-1)?.children?.some(child => child.name === 'Paragraph');
        context.setFaqExpanded(current => ({ ...current, [args.node.id]: !(current[args.node.id] ?? initiallyOpen) }));
      } else context.action(args);
    },
  };

  return <div className={`${nodeClass(pages[0])} design-node rental-guide-page`} data-name="Page" style={layoutStyle(pages[0])}>
    {pages[0].children.slice(0, 2).map(node => <DesignNode key={node.id} node={node} ancestors={[pages[0]]} />)}
    <SlidingTabs tabs={tabs} active={active} onSelect={select} label="Panduan sewa" />
    <div className="rental-panel-viewport">
      <InterfaceContext.Provider value={panelContext}>
        {tabs.map((tab, index) => <section key={tab.key} id={`${tab.key}-panel`} role="tabpanel" aria-labelledby={`${tab.key}-tab`} tabIndex={0} hidden={active !== index} className="rental-tab-panel" style={{ '--rental-slide-direction': direction }}>
          {active === index && page.children.slice(3).map(node => <DesignNode key={node.id} node={node} ancestors={[page]} />)}
        </section>)}
      </InterfaceContext.Provider>
    </div>
  </div>;
}
