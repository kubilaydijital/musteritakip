import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { T, btnPrimary, btnSecondary, PAGE_MAX } from './theme'

const NAV_ITEMS = [
  { to: '/', label: 'Ana Sayfa' },
  { to: '/ozellikler', label: 'Özellikler' },
  { to: '/referanslar', label: 'Referanslar' },
  { to: '/hakkimizda', label: 'Hakkımızda' },
  { to: '/blog', label: 'Blog' },
  { to: '/iletisim', label: 'İletişim' },
]

function Logo() {
  return (
    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
      <span style={{
        width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${T.primary}, #A78BFA)`,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0
      }}>M</span>
      <span style={{ fontWeight: 800, fontSize: 16, color: T.text, letterSpacing: '-0.01em' }}>Müşteri Takip</span>
    </Link>
  )
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,13,24,0.92)',
      backdropFilter: 'blur(10px)', borderBottom: `1px solid ${T.border}`
    }}>
      <div style={{
        maxWidth: PAGE_MAX, margin: '0 auto', padding: '0 20px', height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <Logo />

        <nav className="mt-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.to
            return (
              <Link key={item.to} to={item.to} style={{
                fontSize: 14.5, fontWeight: 600, textDecoration: 'none',
                color: active ? T.text : T.textSoft
              }}>{item.label}</Link>
            )
          })}
        </nav>

        <div className="mt-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/giris" style={{ ...btnSecondary, padding: '9px 18px', fontSize: 14 }}>Giriş Yap</Link>
          <Link to="/deneme" className="mt-btn-primary" style={{ ...btnPrimary, padding: '9px 18px', fontSize: 14 }}>Ücretsiz 14 Gün Dene</Link>
        </div>

        <button
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menüyü aç/kapat"
          style={{
            display: 'none', background: 'transparent', border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '8px 10px', color: T.text, cursor: 'pointer'
          }}
          className="mt-mobile-menu-btn"
        >☰</button>
      </div>

      {menuOpen && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {NAV_ITEMS.map(item => (
            <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)} style={{ fontSize: 15, fontWeight: 600, color: T.text, textDecoration: 'none' }}>
              {item.label}
            </Link>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Link to="/giris" onClick={() => setMenuOpen(false)} style={{ ...btnSecondary, flex: 1, justifyContent: 'center', padding: '10px 16px', fontSize: 14 }}>Giriş Yap</Link>
            <Link to="/deneme" onClick={() => setMenuOpen(false)} style={{ ...btnPrimary, flex: 1, justifyContent: 'center', padding: '10px 16px', fontSize: 14 }}>14 Gün Dene</Link>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .mt-mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer style={{ borderTop: `1px solid ${T.border}`, background: T.card, marginTop: 80 }}>
      <div style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '52px 20px 28px' }}>
        <div className="mt-grid-4" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.2fr', gap: 32, marginBottom: 36 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{
                width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${T.primary}, #A78BFA)`,
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14
              }}>M</span>
              <span style={{ fontWeight: 800, fontSize: 15, color: T.text }}>Müşteri Takip</span>
            </div>
            <p style={{ fontSize: 13.5, color: T.textSoft, lineHeight: 1.6, margin: 0, maxWidth: 260 }}>
              Hizmet sektöründeki işletmeler için akıllı müşteri takip ve hatırlatma sistemi.
            </p>
          </div>

          <FooterCol title="Hızlı Linkler" links={[
            { to: '/', label: 'Ana Sayfa' },
            { to: '/ozellikler', label: 'Özellikler' },
            { to: '/hakkimizda', label: 'Hakkımızda' },
            { to: '/referanslar', label: 'Referanslar' },
            { to: '/blog', label: 'Blog' },
            { to: '/iletisim', label: 'İletişim' },
          ]} />

          <FooterCol title="Özellikler" links={[
            { to: '/ozellikler', label: 'Randevu Yönetimi' },
            { to: '/ozellikler', label: 'Hatırlatmalar' },
            { to: '/ozellikler', label: 'Müşteri Takibi' },
            { to: '/ozellikler', label: 'Raporlar & Analiz' },
            { to: '/ozellikler', label: 'Reklam Kaynağı Takibi' },
          ]} />

          <div>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>Hemen Başlayın</p>
            <p style={{ fontSize: 13.5, color: T.textSoft, margin: '0 0 16px', lineHeight: 1.6 }}>14 gün ücretsiz deneyin, kredi kartı gerekmez.</p>
            <Link to="/deneme" style={{ ...btnPrimary, padding: '10px 18px', fontSize: 13.5, width: '100%', justifyContent: 'center' }}>Ücretsiz 14 Gün Dene</Link>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 22, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <p style={{ fontSize: 12.5, color: T.textFaint, margin: 0 }}>© {new Date().getFullYear()} Müşteri Takip · Kubilay Dijital</p>
          <p style={{ fontSize: 12.5, color: T.textFaint, margin: 0 }}>Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }) {
  return (
    <div>
      <p style={{ fontSize: 12.5, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {links.map((l, i) => (
          <Link key={i} to={l.to} style={{ fontSize: 13.5, color: T.textSoft, textDecoration: 'none' }}>{l.label}</Link>
        ))}
      </div>
    </div>
  )
}
