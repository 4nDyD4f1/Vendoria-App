import { useLayoutEffect, useRef, useState } from 'react';
import './rental-guide-tabs.css';

// Bilah tab berpil yang meluncur (dipakai /cara-sewa dan /akun). Panel pasangannya dibuat pemanggil (id `${key}-panel`).
export default function SlidingTabs({ tabs, active, onSelect, label, className = '' }) {
  const [indicator, setIndicator] = useState({});
  const tabList = useRef(null);
  const tabButtons = useRef([]);

  useLayoutEffect(() => {
    const update = () => {
      const button = tabButtons.current[active];
      if (!button) return;
      setIndicator({ width: button.offsetWidth, transform: `translateX(${button.offsetLeft}px)` });
      const scroller = tabList.current.parentElement;
      const left = button.offsetLeft;
      if (left < scroller.scrollLeft || left + button.offsetWidth > scroller.scrollLeft + scroller.clientWidth) {
        scroller.scrollTo({ left: Math.max(0, left - (scroller.clientWidth - button.offsetWidth) / 2), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(tabList.current);
    tabButtons.current.forEach(button => observer.observe(button));
    return () => observer.disconnect();
  }, [active]);

  return <div className={`rental-tabs-wrap ${className}`}>
    <div className="rental-tabs-scroll">
      <div className="rental-tabs" role="tablist" aria-label={label} ref={tabList}>
        <span className="rental-tabs-indicator" aria-hidden="true" style={indicator} />
        {tabs.map((tab, index) => <button key={tab.key} type="button" role="tab" id={`${tab.key}-tab`} aria-selected={active === index} aria-controls={`${tab.key}-panel`} tabIndex={active === index ? 0 : -1} ref={button => { tabButtons.current[index] = button; }} onClick={() => onSelect(index)} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
          if (next === null) return;
          event.preventDefault();
          onSelect(next);
          tabButtons.current[next]?.focus();
        }}>{tab.label}</button>)}
      </div>
    </div>
  </div>;
}
