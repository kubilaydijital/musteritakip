import { Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { blogPosts } from '../data/siteData.js'
import usePageMeta from '../usePageMeta.js'

export default function Blog() {
  usePageMeta('Blog', 'Randevu yönetimi, müşteri takibi ve kaçan müşterileri geri kazanma üzerine pratik yazılar ve rehberler.')
  return <Layout><main className="page"><section className="container page-hero"><span className="page-no">05</span><h1>İşinizi büyütecek içerikler</h1><p>Randevu yönetimi, müşteri takibi ve kaçan müşterileri geri kazanma üzerine pratik yazılar.</p></section><section className="container blog-grid">{blogPosts.map((post) => <article className="blog-card" key={post.slug}><div className="blog-icon">{post.image}</div><span>{post.date} • {post.read}</span><h3>{post.title}</h3><p>{post.excerpt}</p><Link to={`/blog/${post.slug}`}>Yazıyı oku →</Link></article>)}</section></main></Layout>
}
