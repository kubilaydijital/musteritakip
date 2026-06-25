import { useState } from 'react'
import { SiteHeader, SiteFooter } from './SiteLayout'
import { T, cardStyle, inputStyle, btnPrimary, GLOBAL_CSS, PAGE_MAX } from './theme'

const FORMSPREE_URL = 'https://formspree.io/f/mlgvyrld'
const WHATSAPP_NUMBER = '905336153445'
const WHATSAPP_MESSAGE = encodeURIComponent('Merhaba, Müşteri Takip sistemi hakkında bilgi almak istiyorum.')
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`

const CONTACT_INFO = [
  { icon: '✉️', label: 'info@musteritakip.net' },
  { icon: '📍', label: 'İzmir / Türkiye' },
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return
    setStatus('sending')
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: 'Müşteri Takip - İletişim Formu',
          name: form.name, email: form.email, phone: form.phone, message: form.message,
        }),
      })
      if (res.ok) {
        setStatus('sent')
        setForm({ name: '', email: '', phone: '', message: '' })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, color: T.text, minHeight: '100vh' }}>
      <style>{GLOBAL_CSS}</style>
      <SiteHeader />

      <section style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '64px 20px 56px' }}>
        <div className="mt-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 48 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              Sorularınız için <span style={{ color: T.primary }}>bize ulaşın</span>
            </h1>
            <p style={{ fontSize: 15.5, color: T.textSoft, lineHeight: 1.7, margin: '0 0 32px' }}>
              Sistemle ilgili her sorunuz için doğrudan yazabilirsiniz, mümkün olan en kısa sürede dönüş yaparız.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
              {CONTACT_INFO.map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 38, height: 38, borderRadius: 10, background: T.primaryLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0
                  }}>{c.icon}</span>
                  <span style={{ fontSize: 14.5, color: T.textSoft }}>{c.label}</span>
                </div>
              ))}
            </div>

            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
              ...btnPrimary, background: '#1D9E75', width: '100%', justifyContent: 'center'
            }}>WhatsApp'tan Yazın</a>
          </div>

          <div style={{ ...cardStyle, padding: 28 }}>
            <form onSubmit={submit}>
              <div className="mt-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <input placeholder="Ad Soyad" value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} required />
                <input type="email" placeholder="E-posta" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} required />
              </div>
              <input placeholder="Telefon (isteğe bağlı)" value={form.phone} onChange={e => set('phone', e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <textarea placeholder="Mesajınız" rows={5} value={form.message} onChange={e => set('message', e.target.value)} style={{ ...inputStyle, marginBottom: 16, resize: 'vertical' }} required />
              <button type="submit" disabled={status === 'sending'} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', opacity: status === 'sending' ? 0.7 : 1 }}>
                {status === 'sending' ? 'Gönderiliyor...' : 'Gönder'}
              </button>
              {status === 'sent' && <p style={{ fontSize: 13.5, color: T.green, margin: '12px 0 0', textAlign: 'center' }}>Mesajınız iletildi, en kısa sürede dönüş yapacağız.</p>}
              {status === 'error' && <p style={{ fontSize: 13.5, color: T.red, margin: '12px 0 0', textAlign: 'center' }}>Bir sorun oluştu, lütfen WhatsApp üzerinden yazın.</p>}
            </form>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
