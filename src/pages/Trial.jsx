import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient.js'
import Layout from '../components/Layout.jsx'
import usePageMeta from '../usePageMeta.js'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }

const BUSINESS_TYPES = ['Güzellik salonu', 'Kuaför', 'Diş kliniği', 'Gayrimenkul', 'Hukuk bürosu', 'Diğer']
// +90 ile başlayıp ardından 5 ile başlayan 10 haneli Türkiye cep telefonu formatı.
const PHONE_RE = /^\+905\d{9}$/

export default function Trial() {
  usePageMeta('Ücretsiz 14 Gün Dene', 'Kredi kartı gerekmez. Hesabınızı hemen oluşturun, 14 gün boyunca Müşteri Takip sistemini ücretsiz deneyin.')
  const [form, setForm] = useState({ businessName: '', contactName: '', phone: '+90', email: '', password: '', businessType: '' })
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [phoneErr, setPhoneErr] = useState('')

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.businessName.trim() || !form.contactName.trim() || !form.email.trim() || !form.password.trim()) return
    if (!PHONE_RE.test(form.phone.trim())) {
      setPhoneErr('Telefon numarası +90 ile başlayıp 5 ile devam eden 10 haneli olmalı. Örnek: +905551234567')
      return
    }
    if (form.password.trim().length < 6) {
      setErrorMsg('Şifre en az 6 karakter olmalı.')
      return
    }
    setPhoneErr('')
    setStatus('submitting')
    setErrorMsg('')

    try {
      // 1) Supabase Auth'a kayıt ol. "Confirm email" kapalı olduğu için bu işlem
      // doğrudan bir oturum (session) döndürür - kullanıcı anında giriş yapmış olur.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
        options: { data: { full_name: form.contactName.trim() } },
      })
      if (authError) throw new Error(authError.message === 'User already registered' ? 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.' : authError.message)
      if (!authData.user) throw new Error('Hesap oluşturulamadı, lütfen tekrar deneyin.')

      const userId = authData.user.id
      const branchId = uid()

      // 2) Yeni şube oluştur
      const { error: branchErr } = await supabase.from('branches').insert({
        id: branchId, name: form.businessName.trim(), active: true,
      })
      if (branchErr) throw new Error('Şube oluşturulamadı: ' + branchErr.message)

      // 3) handle_new_user() trigger'ı otomatik olarak app_users'a bir satır ekledi
      // (role='admin', is_trial=true, trial_ends_at=+14gün). Bu satırı gerçek şube ve
      // izin şablonuyla güncelliyoruz.
      const { error: profileErr } = await supabase.from('app_users')
        .update({ branch_id: branchId, permission_template_id: 'tpl_admin', full_name: form.contactName.trim() })
        .eq('id', userId)
      if (profileErr) throw new Error('Profil güncellenemedi: ' + profileErr.message)

      // 4) Talep kaydı (geçmiş takibi için)
      await supabase.from('trial_requests').insert({
        id: uid(), business_name: form.businessName.trim(), contact_name: form.contactName.trim(),
        phone: form.phone.trim(), email: form.email.trim(), business_type: form.businessType || null,
        status: 'created', generated_branch_id: branchId,
      })

      // 5) Hoş geldin maili (Netlify Function üzerinden, Resend ile) - artık şifre içermiyor,
      // kullanıcı zaten kendi şifresini belirledi.
      try {
        await fetch('/.netlify/functions/send-trial-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email.trim(), contactName: form.contactName.trim(),
            businessName: form.businessName.trim(),
          }),
        })
      } catch {
        // Mail gönderimi başarısız olsa da hesap zaten oluştu, sorun değil.
      }

      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message || 'Bir şeyler ters gitti, lütfen tekrar deneyin.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <Layout>
        <main className="page">
          <section className="container trial-card">
            <span className="page-no">🎉 Hazır</span>
            <h1>Hesabınız oluşturuldu!</h1>
            <p>14 günlük deneme süreniz başladı. Az önce belirlediğiniz e-posta ve şifre ile doğrudan giriş yapabilirsiniz.</p>
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
            <input placeholder="Şifre (en az 6 karakter)" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required/>
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
