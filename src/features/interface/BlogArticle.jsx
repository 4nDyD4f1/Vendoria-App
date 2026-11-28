import { Link } from 'react-router-dom';
import { blogPosts } from '../../data/blogPosts';
import './home-pages.css';

export function ArticleCard({ post }) {
  return <article className="home-article">
    <img src={post.image} alt="" loading="lazy" />
    <div className="home-article-body">
      <p className="home-article-meta">{post.category} · 4 menit baca</p>
      {/* the title link is stretched over the whole card */}
      <h3><Link to={`/blog/${post.slug}`}>{post.title}</Link></h3>
      <p>{post.excerpt}</p>
    </div>
  </article>;
}

export default function BlogArticle({ slug }) {
  const post = blogPosts.find(item => item.slug === slug); // resolveScreen only routes known slugs here
  return <div className="page-wrap">
    <nav className="page-breadcrumb" aria-label="Breadcrumb"><Link to="/">Beranda</Link><span>›</span><span aria-current="page">{post.title}</span></nav>
    <article className="blog-article">
      <p className="home-article-meta">{post.category} · 4 menit baca</p>
      <h1>{post.title}</h1>
      <img src={post.image} alt="" />
      <p className="blog-intro">{post.intro}</p>
      {post.sections.map(section => <section key={section.heading}>
        <h2>{section.heading}</h2>
        <p>{section.text}</p>
        {section.list && <ul>{section.list.map(item => <li key={item}>{item}</li>)}</ul>}
      </section>)}
      <Link className="page-button" to="/catalog">Cari alat untuk acaramu</Link>
    </article>
    <h2 className="page-subtitle">Artikel lainnya</h2>
    <div className="home-articles">{blogPosts.filter(item => item !== post).map(item => <ArticleCard key={item.slug} post={item} />)}</div>
  </div>;
}
