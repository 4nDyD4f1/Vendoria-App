import './skeleton.css';

const lines = (...widths) => widths.map((width, index) => <span className="sk sk-line" key={index} style={{ width }} />);
const repeat = (count, render) => Array.from({ length: count }, (_, index) => render(index));

// Placeholder shown while something loads. `label` is not visible; screen readers announce it.
const shapes = {
  page: () => <>{lines('38%', '62%')}<span className="sk sk-hero" /><div className="sk-cards">{shapes.cards(3)}</div></>,
  cards: (count = 4) => repeat(count, index => <div className="sk-card" key={index}><span className="sk sk-photo" />{lines('40%', '85%', '60%')}</div>),
  list: (count = 4) => repeat(count, index => <div className="sk-row" key={index}><span className="sk sk-thumb" /><div>{lines('55%', '80%')}</div></div>),
  detail: () => <><span className="sk sk-hero" /><div>{lines('70%', '45%', '90%', '82%', '60%')}</div></>,
  text: () => lines('90%', '75%', '55%'),
  image: () => <span className="sk sk-image" />,
};

export default function Skeleton({ variant = 'list', label = 'Memuat…', count }) {
  if (variant === 'inline') return <span className="sk-inline" role="status"><span className="sk" /><span className="sk-label">{label}</span></span>;
  return <div className={`sk-wrap sk-${variant}`} role="status"><span className="sk-label">{label}</span>{shapes[variant](count)}</div>;
}
