import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Mail, MapPin, MessageCircle } from 'lucide-react'
import Logo from './Logo.jsx'
import { EMAIL, LOCATION, navItems } from '../data/siteData.js'

const WHATSAPP_URL = 'https://wa.me/905336153445?text=Merhaba%2C%20M%C3%BC%C5%9Fteri%20Takip%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.'

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
          <a className="btn btn-primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Ücretsiz Canlı Demo Planla</a>
        </div>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Menüyü aç/kapat">☰</button>
      </div>
      {open && (
        <div className="mobile-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{item.label}</NavLink>
          ))}
          <Link className="btn btn-ghost" to="/giris" onClick={() => setOpen(false)}>Giriş Yap</Link>
          <a className="btn btn-primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>Ücretsiz Canlı Demo Planla</a>
        </div>
      )}
    </header>
  )
}

export function Footer() {
  return (
    <footer className="site-footer site-footer-slim">
      <div className="container footer-grid-slim">
        <div className="footer-slim-brand">
          <Logo small />
          <span>Reklamdan satışa kadar tüm süreci tek panelden görün.</span>
        </div>
        <nav className="footer-slim-links">
          {navItems.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
          <Link to="/gizlilik-politikasi">Gizlilik</Link>
          <Link to="/kullanim-sartlari">Şartlar</Link>
        </nav>
        <a className="btn btn-primary footer-slim-cta" href={WHATSAPP_URL} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Demo Planla</a>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 Müşteri Takip. Tüm hakları saklıdır.</span>
        <span className="footer-bottom-contact"><Mail size={13}/> {EMAIL} · <MapPin size={13}/> {LOCATION}</span>
      </div>
    </footer>
  )
}

export default function Layout({ children }) {
  return <><Header />{children}<Footer /></>
}
