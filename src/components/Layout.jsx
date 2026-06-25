import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Mail, MapPin } from 'lucide-react'
import Logo from './Logo.jsx'
import { EMAIL, LOCATION, navItems } from '../data/siteData.js'

export function Header() {
  const [open, setOpen] = useState(false)
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <nav className="desktop-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{item.label}</NavLink>
          ))}
        </nav>
        <div className="header-actions desktop-actions">
          <Link className="btn btn-ghost" to="/giris">Giriş Yap</Link>
          <Link className="btn btn-primary" to="/deneme">Ücretsiz 14 Gün Dene</Link>
        </div>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Menüyü aç/kapat">☰</button>
      </div>
      {open && (
        <div className="mobile-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{item.label}</NavLink>
          ))}
          <Link className="btn btn-ghost" to="/giris" onClick={() => setOpen(false)}>Giriş Yap</Link>
          <Link className="btn btn-primary" to="/deneme" onClick={() => setOpen(false)}>Ücretsiz 14 Gün Dene</Link>
        </div>
      )}
    </header>
  )
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo small />
          <p className="footer-text">Hizmet sektöründeki işletmeler için akıllı müşteri takip, randevu ve hatırlatma sistemi.</p>
        </div>
        <div>
          <h4>Hızlı Linkler</h4>
          {navItems.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
        </div>
        <div>
          <h4>Özellikler</h4>
          <Link to="/ozellikler">Randevu Yönetimi</Link>
          <Link to="/ozellikler">Hatırlatma Uyarıları</Link>
          <Link to="/ozellikler">Müşteri Takibi</Link>
          <Link to="/ozellikler">Reklam Kaynak Takibi</Link>
        </div>
        <div>
          <h4>İletişim</h4>
          <a href={`mailto:${EMAIL}`}><Mail size={15} /> {EMAIL}</a>
          <span className="footer-contact"><MapPin size={15} /> {LOCATION}</span>
          <Link className="btn btn-primary footer-cta" to="/deneme">Ücretsiz 14 Gün Dene</Link>
        </div>
      </div>
      <div className="container footer-bottom">© 2026 Müşteri Takip. Tüm hakları saklıdır.</div>
    </footer>
  )
}

export default function Layout({ children }) {
  return <><Header />{children}<Footer /></>
}
