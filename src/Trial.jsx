import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { SiteHeader, SiteFooter } from './SiteLayout'
import { T, cardStyle, inputStyle, btnPrimary, GLOBAL_CSS, PAGE_MAX } from './theme'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }

// Basit, akılda kalıcı kullanıcı adı üretir: isletmeadi + 3 haneli rastgele sayı.
function generateUsername(businessName) {
  const base = businessName
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 14)
  const suffix = Math.floor(100 + Math.random() * 900)
  return `${base || 'isletme'}${suffix}`
}

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export default function Trial() {
  const [form, setForm] = useState({ businessName: '', contactName: '', phone: '+90', email: '' })
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [credentials, setCredentials] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.businessName.trim() || !form.contactName.trim() || !form.phone.trim()) return
    setStatus('submitting')
    setErrorMsg('')

    try {
      const branchId = uid()
      const username = generateUsername(form.businessName)
      const password = generatePassword()
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

      // 1) Yeni şube oluştur
      const { error: branchErr } = await supabase.from('branches').insert({
        id: branchId, name: form.businessName.trim(), active: true,
      })
      if (branchErr) throw new Error('Şube oluşturulamadı: ' + branchErr.message)

      // 2) Kendi şubesinde tam yetkili ama süper admin olmayan "Şube Sahibi" şablonuyla kullanıcı oluştur.
      // Bu şablon trial_migration.sql ile önceden oluşturulmuş olmalı (id: tpl_branch_admin).
      const { error: userErr } = await supabase.from('app_users').insert({
        username, password, branch_id: branchId, role: 'admin',
        permission_template_id: 'tpl_branch_admin',
        active: true, is_trial: true, trial_ends_at: trialEndsAt,
      })
      if (userErr) throw new Error('Kullanıcı oluşturulamadı: ' + userErr.message)

      // 3) Talep kaydı (geçmiş takibi için)
      await supabase.from('trial_requests').insert({
        id: uid(), business_name: form.businessName.trim(), contact_name: form.contactName.trim(),
        phone: form.phone.trim(), email: form.email.trim() || null,
        status: 'created', generated_username: username, generated_branch_id: branchId,
      })

      // 4) Bilgilendirme maili (Netlify Function üzerinden, Resend ile) - e-posta verilmişse
      if (form.email.trim()) {
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
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, color: T.text, minHeight: '100vh' }}>
        <style>{GLOBAL_CSS}</style>
        <SiteHeader />
        <section style={{ maxWidth: 560, margin: '0 auto', padding: '80px 20px' }}>
          <div style={{ ...cardStyle, padding: 36, textAlign: 'center' }}>
            <span style={{ fontSize: 44, display: 'block', marginBottom: 16 }}>🎉</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>Hesabınız hazır!</h1>
            <p style={{ fontSize: 14.5, color: T.textSoft, lineHeight: 1.6, margin: '0 0 28px' }}>
              14 günlük deneme süreniz başladı. Giriş bilgilerinizi not edin{form.email.trim() ? ' — ayrıca e-posta adresinize de gönderdik.' : '.'}
            </p>
            <div style={{ background: T.cardSoft, borderRadius: 12, padding: 20, marginBottom: 28, textAlign: 'left' }}>
              <p style={{ fontSize: 13, color: T.textFaint, margin: '0 0 4px' }}>Kullanıcı adı</p>
              <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 16px', color: T.text }}>{credentials.username}</p>
              <p style={{ fontSize: 13, color: T.textFaint, margin: '0 0 4px' }}>Şifre</p>
              <p style={{ fontSize: 17, fontWeight: 700, margin: 0, color: T.text }}>{credentials.password}</p>
            </div>
            <Link to="/giris" className="mt-btn-primary" style={{ ...btnPrimary, width: '100%', justifyContent: 'center' }}>
              Panele Giriş Yap →
            </Link>
          </div>
        </section>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, color: T.text, minHeight: '100vh' }}>
      <style>{GLOBAL_CSS}</style>
      <SiteHeader />

      <section style={{ maxWidth: 560, margin: '0 auto', padding: '64px 20px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 34px)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            14 gün ücretsiz deneyin
          </h1>
          <p style={{ fontSize: 15, color: T.textSoft, margin: 0 }}>
            Kredi kartı gerekmez. Hesabınız anında oluşturulur.
          </p>
        </div>

        <div style={{ ...cardStyle, padding: 28 }}>
          <form onSubmit={submit}>
            <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: 'block', marginBottom: 6 }}>İşletme adı</label>
            <input placeholder="örn. Arzu Beauty Kadıköy" value={form.businessName} onChange={e => set('businessName', e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} required />

            <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: 'block', marginBottom: 6 }}>Adınız soyadınız</label>
            <input placeholder="örn. Ayşe Yılmaz" value={form.contactName} onChange={e => set('contactName', e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} required />

            <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: 'block', marginBottom: 6 }}>Telefon</label>
            <input placeholder="+905551234567" value={form.phone} onChange={e => {
              let v = e.target.value
              if (!v.startsWith('+90')) v = '+90' + v.replace(/^\+?90?/, '')
              set('phone', v)
            }} style={{ ...inputStyle, marginBottom: 16 }} required />

            <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: 'block', marginBottom: 6 }}>E-posta (isteğe bağlı)</label>
            <input type="email" placeholder="ornek@mail.com" value={form.email} onChange={e => set('email', e.target.value)} style={{ ...inputStyle, marginBottom: 6 }} />
            <p style={{ fontSize: 12, color: T.textFaint, margin: '0 0 20px' }}>Girerseniz giriş bilgileriniz e-postanıza da gönderilir.</p>

            {status === 'error' && (
              <p style={{ fontSize: 13.5, color: T.red, background: T.redBg, padding: '10px 14px', borderRadius: 8, margin: '0 0 16px' }}>{errorMsg}</p>
            )}

            <button type="submit" disabled={status === 'submitting'} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', opacity: status === 'submitting' ? 0.7 : 1 }}>
              {status === 'submitting' ? 'Hesabınız oluşturuluyor...' : 'Ücretsiz Hesap Oluştur →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: T.textFaint, marginTop: 20 }}>
          14 gün sonunda otomatik ücretlendirme yapılmaz, devam etmek isterseniz sizinle iletişime geçeriz.
        </p>
      </section>

      <SiteFooter />
    </div>
  )
}
