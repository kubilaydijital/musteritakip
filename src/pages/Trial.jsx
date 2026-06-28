import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient.js'
import Layout from '../components/Layout.jsx'
import usePageMeta from '../usePageMeta.js'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }

// Basit, akılda kalıcı kullanıcı adı tabanı üretir: isletmeadi (rastgele sayı sonra eklenir).
function usernameBase(businessName) {
  return (businessName || 'isletme')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 14) || 'isletme'
}

// Veritabanında benzersiz olduğu doğrulanmış bir kullanıcı adı üretir.
// 10 denemede benzersiz bulunamazsa (pratikte olmaz), zaman damgası tabanlı garantili bir ad kullanılır.
async function generateUniqueUsername(businessName) {
  const base = usernameBase(businessName)
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.floor(100 + Math.random() * 900)
    const candidate = `${base}${suffix}`
    const { data } = await supabase.from('app_users').select('username').eq('username', candidate).maybeSingle()
    if (!data) return candidate
  }
  return `${base}${Date.now().toString(36).slice(-5)}`
}

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

const BUSINESS_TYPES = ['Güzellik salonu', 'Kuaför', 'Diş kliniği', 'Gayrimenkul', 'Hukuk bürosu', 'Diğer']

// E.164 formatına uygun Türkiye cep telefonu: +90 ardından 5 ile başlayan 9 hane.
// Bu format, Meta/Google Ads gibi platformlara müşteri listesi yüklerken eşleşme oranını maksimize eder.
const PHONE_RE = /^\+905\d{9}$/

export default function Trial() {
  usePageMeta('Ücretsiz 14 Gün Dene', 'Kredi kartı gerekmez. Hesabınızı hemen oluşturun, 14 gün boyunca Müşteri Takip sistemini ücretsiz deneyin.')
  const [form, setForm] = useState({ businessName: '', contactName: '', phone: '+90', email: '', businessType: '' })
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [phoneErr, setPhoneErr] = useState('')
  const [credentials, setCredentials] = useState(null)

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.businessName.trim() || !form.contactName.trim() || !form.email.trim()) return
    if (!PHONE_RE.test(form.phone.trim())) {
      setPhoneErr('Telefon numarası +90 ile başlayıp 5 ile devam eden, toplam 10 haneli olmalı. Örnek: +905551234567')
      return
    }
    setPhoneErr('')
    setStatus('submitting')
    setErrorMsg('')

    try {
      const branchId = uid()
      const username = await generateUniqueUsername(form.businessName)
      const password = generatePassword()
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

      // 1) Yeni şube oluştur
      const { error: branchErr } = await supabase.from('branches').insert({
        id: branchId, name: form.businessName.trim(), active: true,
      })
      if (branchErr) throw new Error('Şube oluşturulamadı: ' + branchErr.message)

      // 2) Kendi şubesinde tam yetkili ama süper admin olmayan "Şube Sahibi" şablonuyla kullanıcı oluştur.
      // Bu şablon panelde önceden mevcut olan "Şube Sahibi" şablonudur (id: tpl_admin).
      const { error: userErr } = await supabase.from('app_users').insert({
        username, password, branch_id: branchId, role: 'admin',
        permission_template_id: 'tpl_admin',
        active: true, is_trial: true, trial_ends_at: trialEndsAt,
      })
      if (userErr) throw new Error('Kullanıcı oluşturulamadı: ' + userErr.message)

      // 3) Talep kaydı (geçmiş takibi için)
      await supabase.from('trial_requests').insert({
        id: uid(), business_name: form.businessName.trim(), contact_name: form.contactName.trim(),
        phone: form.phone.trim(), email: form.email.trim(), business_type: form.businessType || null,
        status: 'created', generated_username: username, generated_branch_id: branchId,
      })

      // 4) Bilgilendirme maili (Netlify Function üzerinden, Resend ile)
      try {
        await fetch('/.netlify/functions/send-trial-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email.trim(), contactName: form.contactName.trim(),
            businessName: form.businessName.trim(), username, password,
          }),
        })
      } catch {
        // Mail gönderimi başarısız olsa da hesap zaten oluştu, kullanıcıya bilgileri ekranda göstereceğiz.
      }

      setCredentials({ username, password })
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message || 'Bir şeyler ters gitti, lütfen tekrar deneyin.')
      setStatus('error')
    }
  }

  if (status === 'done' && credentials) {
    return (
      <Layout>
        <main className="page">
          <section className="container trial-card">
            <span className="page-no">🎉 Hazır</span>
            <h1>Hesabınız oluşturuldu!</h1>
            <p>14 günlük deneme süreniz başladı. Giriş bilgilerinizi not edin — ayrıca e-posta adresinize de gönderdik.</p>
            <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '20px 22px', margin: '8px 0 24px' }}>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 4px' }}>Kullanıcı adı</p>
              <p style={{ fontSize: 18, fontWeight: 800, margin: '0 0 14px', color: '#fff' }}>{credentials.username}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 4px' }}>Şifre</p>
              <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#fff' }}>{credentials.password}</p>
            </div>
            <Link to="/giris" className="btn btn-primary big">Panele Giriş Yap</Link>
          </section>
        </main>
      </Layout>
    )
  }

  return (
    <Layout>
      <main className="page">
        <section className="container trial-card">
          <span className="page-no">Ücretsiz Deneme</span>
          <h1>14 gün boyunca sistemi deneyin.</h1>
          <p>Kredi kartı gerekmez. Bilgilerinizi girin, hesabınız anında oluşturulsun.</p>
          <form onSubmit={submit}>
            <input placeholder="İşletme adı" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} required/>
            <input placeholder="Ad Soyad" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} required/>
            <input placeholder="E-posta" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required/>
            <input placeholder="Telefon" value={form.phone} onChange={(e) => {
              let v = e.target.value
              if (!v.startsWith('+90')) v = '+90' + v.replace(/^\+?90?/, '')
              set('phone', v)
              if (phoneErr) setPhoneErr('')
            }}/>
            {phoneErr && <p style={{ color: 'var(--red)', fontSize: 13, margin: '-6px 0 0' }}>{phoneErr}</p>}
            <select value={form.businessType} onChange={(e) => set('businessType', e.target.value)}>
              <option value="" disabled>İşletme türü</option>
              {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {status === 'error' && <p style={{ color: 'var(--red)', fontSize: 14 }}>{errorMsg}</p>}
            <button className="btn btn-primary" type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Hesabınız oluşturuluyor...' : 'Ücretsiz Deneme Talebi Gönder'}
            </button>
          </form>
        </section>
      </main>
    </Layout>
  )
}
