import { Link } from 'react-router-dom'
import { SiteHeader, SiteFooter } from './SiteLayout'
import { T, cardStyle, GLOBAL_CSS, PAGE_MAX } from './theme'
import { BLOG_POSTS } from './blogData'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function Blog() {
  const sorted = [...BLOG_POSTS].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, color: T.text, minHeight: '100vh' }}>
      <style>{GLOBAL_CSS}</style>
      <SiteHeader />

      <section style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '64px 20px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          İşinizi <span style={{ color: T.primary }}>büyütecek içerikler</span>
        </h1>
        <p style={{ fontSize: 16, color: T.textSoft, maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
          Randevu yönetimi, müşteri takibi ve hatırlatma sistemleri hakkında pratik bilgiler.
        </p>
      </section>

      <section style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 72px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sorted.map(post => (
            <Link key={post.slug} to={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <article style={{ ...cardStyle, padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 56, height: 56, borderRadius: 12, background: T.primaryLight, fontSize: 24, flexShrink: 0
                }}>{post.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 11.5, color: T.textFaint, margin: '0 0 4px' }}>{formatDate(post.date)} · {post.readTime} okuma</p>
                  <h2 style={{ fontSize: 15.5, fontWeight: 700, margin: '0 0 6px', color: T.text, lineHeight: 1.35 }}>{post.title}</h2>
                  <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.55, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.excerpt}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
