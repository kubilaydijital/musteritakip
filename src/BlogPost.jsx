import { Link, useParams, Navigate } from 'react-router-dom'
import { SiteHeader, SiteFooter } from './SiteLayout'
import { T, cardStyle, btnPrimary, GLOBAL_CSS, PAGE_MAX } from './theme'
import { BLOG_POSTS, getPostBySlug } from './blogData'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function BlogPost() {
  const { slug } = useParams()
  const post = getPostBySlug(slug)

  if (!post) return <Navigate to="/blog" replace />

  const others = BLOG_POSTS.filter(p => p.slug !== slug).slice(0, 2)

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, color: T.text, minHeight: '100vh' }}>
      <style>{GLOBAL_CSS}</style>
      <SiteHeader />

      <article style={{ maxWidth: 760, margin: '0 auto', padding: '56px 20px 64px' }}>
        <Link to="/blog" style={{ fontSize: 13.5, color: T.textSoft, textDecoration: 'none' }}>← Tüm yazılar</Link>

        <p style={{ fontSize: 13, color: T.textFaint, margin: '20px 0 12px' }}>{formatDate(post.date)} · {post.readTime} okuma</p>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 900, margin: '0 0 28px', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
          {post.title}
        </h1>

        <div style={{ fontSize: 16, lineHeight: 1.8, color: T.textSoft }}>
          {post.content.map((block, i) => {
            if (block.type === 'h2') {
              return <h2 key={i} style={{ fontSize: 21, fontWeight: 800, color: T.text, margin: '32px 0 14px' }}>{block.text}</h2>
            }
            if (block.type === 'list') {
              return (
                <ul key={i} style={{ margin: '0 0 18px', paddingLeft: 22 }}>
                  {block.items.map((item, j) => (
                    <li key={j} style={{ marginBottom: 8 }}>{item}</li>
                  ))}
                </ul>
              )
            }
            return <p key={i} style={{ margin: '0 0 18px' }}>{block.text}</p>
          })}
        </div>

        <div style={{ ...cardStyle, padding: '28px 26px', textAlign: 'center', marginTop: 40 }}>
          <p style={{ fontSize: 17, fontWeight: 800, margin: '0 0 8px' }}>İşletmenizde de uygulamak ister misiniz?</p>
          <p style={{ fontSize: 14, color: T.textSoft, margin: '0 0 20px' }}>14 gün ücretsiz deneyin, kredi kartı gerekmez.</p>
          <Link to="/deneme" className="mt-btn-primary" style={btnPrimary}>Ücretsiz 14 Gün Dene →</Link>
        </div>

        {others.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px' }}>Diğer yazılar</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {others.map(o => (
                <Link key={o.slug} to={`/blog/${o.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{o.icon}</span>
                    <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>{o.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <SiteFooter />
    </div>
  )
}
