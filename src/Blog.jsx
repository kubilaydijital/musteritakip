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

      <section style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '40px 20px 72px' }}>
        <div className="mt-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
          {sorted.map(post => (
            <Link key={post.slug} to={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <article style={{ ...cardStyle, padding: '24px 22px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 44, height: 44, borderRadius: 12, background: T.primaryLight, fontSize: 21, marginBottom: 16
                }}>{post.icon}</span>
                <p style={{ fontSize: 12, color: T.textFaint, margin: '0 0 8px' }}>{formatDate(post.date)} · {post.readTime} okuma</p>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 10px', color: T.text, lineHeight: 1.35 }}>{post.title}</h2>
                <p style={{ fontSize: 13.5, color: T.textSoft, lineHeight: 1.6, margin: '0 0 14px', flex: 1 }}>{post.excerpt}</p>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: T.primary }}>Devamını oku →</span>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
