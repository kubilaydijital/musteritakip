import { Link, useParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { blogPosts } from '../data/siteData.js'
import usePageMeta from '../usePageMeta.js'

export default function BlogPost() {
  const { slug } = useParams()
  const post = blogPosts.find((p) => p.slug === slug)
  usePageMeta(post ? post.title : 'Yazı bulunamadı', post ? post.excerpt : undefined)
  if (!post) return <Layout><main className="page"><section className="container page-hero"><h1>Yazı bulunamadı</h1><Link to="/blog" className="btn btn-primary">Blog'a dön</Link></section></main></Layout>
  return <Layout><main className="page"><article className="container article"><Link to="/blog" className="back-link">← Blog'a dön</Link><span className="blog-icon">{post.image}</span><h1>{post.title}</h1><p className="article-meta">{post.date} • {post.read}</p>{post.content.map((text, i) => <p key={i}>{text}</p>)}</article></main></Layout>
}
