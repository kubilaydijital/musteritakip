import { useState } from 'react'
import { Mail, MapPin } from 'lucide-react'
import Layout from '../components/Layout.jsx'
import { EMAIL, LOCATION } from '../data/siteData.js'
import usePageMeta from '../usePageMeta.js'

const FORMSPREE_URL = 'https://formspree.io/f/mlgvyrld'

export default function Contact() {
  usePageMeta('İletişim', 'Sorularınız için bize ulaşın. Müşteri Takip ekibi size yardımcı olmaktan mutluluk duyar.')
  const [form, setForm] = useState({ name: '', email: '', business: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

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
          name: form.name, email: form.email, business: form.business, message: form.message,
        }),
      })
      if (res.ok) {
        setStatus('sent')
        setForm({ name: '', email: '', business: '', message: '' })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <Layout>
      <main className="page">
        <section className="container contact-grid">
          <div>
            <span className="page-no">06</span>
            <h1>Sorularınız için bize ulaşın.</h1>
            <p>Tüm sorularınız için formu doldurabilir veya doğrudan e-posta gönderebilirsiniz.</p>
            <div className="contact-list">
              <a href={`mailto:${EMAIL}`}><Mail/> {EMAIL}</a>
              <span><MapPin/> {LOCATION}</span>
            </div>
          </div>
          <form className="contact-form" onSubmit={submit}>
            <input placeholder="Ad Soyad" value={form.name} onChange={(e) => set('name', e.target.value)} required/>
            <input placeholder="E-posta" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required/>
            <input placeholder="İşletme adı" value={form.business} onChange={(e) => set('business', e.target.value)}/>
            <textarea placeholder="Mesajınız" rows="6" value={form.message} onChange={(e) => set('message', e.target.value)} required></textarea>
            <button className="btn btn-primary" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Gönderiliyor...' : 'Gönder'}
            </button>
            {status === 'sent' && <p style={{ color: 'var(--green)', fontSize: 14 }}>Mesajınız iletildi, en kısa sürede dönüş yapacağız.</p>}
            {status === 'error' && <p style={{ color: 'var(--red)', fontSize: 14 }}>Bir sorun oluştu, lütfen e-posta ile tekrar deneyin.</p>}
          </form>
        </section>
      </main>
    </Layout>
  )
}
