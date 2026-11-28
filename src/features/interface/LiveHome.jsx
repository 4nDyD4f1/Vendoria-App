import { use, useContext, useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { api } from '../../api';
import { blogPosts } from '../../data/blogPosts';
import { InterfaceContext } from './InterfaceContext';
import DesignNode from './DesignNode';
import CatalogCard from './CatalogCard';
import { ArticleCard } from './BlogArticle';
import './live-catalog.css';
import './home-pages.css';
import Skeleton from '../../components/Skeleton';

// The homepage is the Figma design, with "Katalog pilihan" from the database and the article cards linking to real posts.
export default function LiveHome({ loadDesign }) {
  const parent = useContext(InterfaceContext);
  const tree = use(loadDesign('84:3400'));
  const [category, setCategory] = useState('');
  const [retry, setRetry] = useState(0);
  const [response, setResponse] = useState({ items: [], categories: [], key: null, error: '' });
  const requestKey = `${category}:${retry}`;
  const loading = response.key !== requestKey;

  useEffect(() => {
    let active = true;
    api(`/api/catalog?${new URLSearchParams({ category, sort: 'popular', size: '4' })}`)
      .then(data => { if (active) setResponse({ items: data.items, categories: data.categories, key: requestKey, error: '' }); })
      .catch(failure => { if (active) setResponse(previous => ({ ...previous, items: [], key: requestKey, error: failure.message })); });
    return () => { active = false; };
  }, [category, requestKey]);

  const chips = [{ id: '', name: 'Semua' }, ...response.categories.filter(item => Number(item.count) > 0)];
  const renderNode = node => {
    if (node.id === '84:3784') return <div key={node.id} className="home-chips" role="group" aria-label="Filter kategori">
      {chips.map(item => <button type="button" key={item.id} aria-pressed={category === String(item.id)} onClick={() => setCategory(String(item.id))}>{item.name}</button>)}
    </div>;
    if (node.id === '84:3596') return <div key={node.id} className="home-products" aria-busy={loading}>
      {loading ? <Skeleton variant="cards" label="Memuat katalog…" />
        : response.error ? <div className="live-catalog-status" role="alert"><p>{response.error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Coba lagi</button></div>
          : !response.items.length ? <div className="live-catalog-status" role="status"><Package size={30} aria-hidden="true" /><p>Belum ada alat siap sewa.</p></div>
            : response.items.map(item => <CatalogCard key={item.id} item={item} />)}
    </div>;
    if (node.id === '84:3932') return <div key={node.id} className="home-articles">{blogPosts.map(post => <ArticleCard key={post.slug} post={post} />)}</div>;
    return undefined;
  };
  return <InterfaceContext.Provider value={{ ...parent, renderNode }}><DesignNode node={tree} /></InterfaceContext.Provider>;
}
