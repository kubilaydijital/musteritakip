import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabaseClient'
import { authenticatedNetlifyFetch } from './lib/netlify'
import { T } from './panel/theme'
import { ExportButtons } from './panel/ExportButtons'
import { leadsToExportRows } from './panel/exportRows'
import {
  Chart, BarController, BarElement, DoughnutController, ArcElement,
  LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip
} from 'chart.js'
import {
  MessageCircle, CalendarDays, UserRound, ShoppingCart, TrendingUp, Wallet,
  Home, Headphones, Users, ClipboardList, BarChart3, Megaphone, Building2,
  ShieldCheck, Settings, Plus, ChevronDown, LogOut, Flame, Search, X
} from 'lucide-react'

Chart.register(BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip)

const CHANNELS = ['Instagram', 'WhatsApp', 'Telefon', 'Google Ads', 'Facebook Ads', 'TikTok', 'Online Randevu', 'Organik', 'Kağıt Not']
const RESULTS = ['Randevu aldı', 'Randevuya gelmedi', 'Satın almadı', 'Cevap yazıldı, müşteriden dönüş gelmedi', 'Müşteri oldu']
const OPEN_RESULTS = []
const RESULT_COLOR = { 'Randevu aldı': '#0F6E56', 'Randevuya gelmedi': '#A32D2D', 'Satın almadı': '#854F0B', 'Cevap yazıldı, müşteriden dönüş gelmedi': '#6B6B6B', 'Müşteri oldu': '#3B6D11' }
const RESULT_HEX = { 'Randevu aldı': '#1D9E75', 'Randevuya gelmedi': '#E24B4A', 'Satın almadı': '#EF9F27', 'Cevap yazıldı, müşteriden dönüş gelmedi': '#9CA3AF', 'Müşteri oldu': '#639922' }
const CHANNEL_HEX = { 'Instagram': '#D4537E', 'WhatsApp': '#1D9E75', 'Telefon': '#3B82F6', 'Google Ads': '#EF9F27', 'Facebook Ads': '#4267B2', 'TikTok': '#25F4EE', 'Online Randevu': '#9B59B6', 'Organik': '#7F77DD' }
const SERVICE_COLOR_PALETTE = ['#D4537E', '#378ADD', '#1D9E75', '#EF9F27', '#7F77DD', '#E24B4A', '#639922', '#854F0B']
// E.164 formatına uygun Türkiye cep telefonu: +90 ardından 5 ile başlayan 9 hane (toplam +90 + 10 hane).
// Bu format, Meta/Google Ads gibi platformlara müşteri listesi yüklerken eşleşme oranını maksimize eder
// (boşluksuz, tire/parantez yok, ülke kodu dahil, sabit 12 karakter).
const PHONE_RE = /^\+905\d{9}$/
// Her sonuç kategorisi için varsayılan (şubeye özel kural bulunamazsa kullanılan) eşikler.
const DEFAULT_REMINDER_SCHEDULE = {
  'Randevu aldı': [1, 1, 1],
  'Randevuya gelmedi': [1, 4, 10],
  'Cevap yazıldı, müşteriden dönüş gelmedi': [1, 3, 7],
  'Satın almadı': [2, 7, 18],
}
const DEFAULT_COLD_AFTER = {
  'Randevu aldı': 1, 'Randevuya gelmedi': 30, 'Cevap yazıldı, müşteriden dönüş gelmedi': 20, 'Satın almadı': 35,
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function daysSince(dateStr) { return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000) }
function lastTouch(lead) { return lead.last_note_at || lead.edited_at || lead.date }

// rule: { day_1, day_2, day_3, cold_after } — o şubeye ve sonuç kategorisine özel,
// reminder_rules tablosundan gelir. Bulunamazsa DEFAULT_* değerlerine düşer.
// noteCount: leadin MEVCUT sonuç kategorisinde, kayıt oluşturma notu HARİÇ, şu ana kadar
// eklenmiş TAKİP notu sayısı (bkz. PanelApp'teki noteCountByLeadId — ilk not sayılmaz).
// Süre, "Randevu aldı" için randevu tarihinden, diğerleri için kayıt/son temas tarihinden işler.
function staleness(lead, noteCount = 0, rule = null) {
  const schedule = rule ? [rule.day_1, rule.day_2, rule.day_3] : DEFAULT_REMINDER_SCHEDULE[lead.result]
  const coldAfter = rule ? rule.cold_after : DEFAULT_COLD_AFTER[lead.result]
  if (!schedule || lead.result === 'Müşteri oldu') return null // Müşteri oldu -> takip yok

  let anchorDate
  if (lead.result === 'Randevu aldı') {
    if (!lead.appointment_at) return null
    anchorDate = lead.appointment_at
  } else {
    // last_note_at, kayıt oluşturulduğunda zaten kayıt tarihiyle başlatılıyor ve her
    // yeni notta güncelleniyor - bu yüzden doğrudan kullanmak yeterli ve doğrudur.
    // (Önceki "noteCount === 0 ? lead.date : lastTouch(lead)" kontrolü gereksizdi ve
    // sonuç kategorisi değiştiğinde yanlışlıkla eski kayıt tarihine dönmesine sebep oluyordu.)
    anchorDate = lastTouch(lead)
  }

  const d = daysSince(anchorDate)
  if (d < 0) return null // randevu henüz geçmedi

  if (coldAfter != null && d >= coldAfter) return { level: 'cold', days: d }
  if (noteCount >= schedule.length) return { level: 'cold', days: d }

  const threshold = schedule[noteCount]
  if (d < threshold) return null

  const level = noteCount === schedule.length - 1 ? 'critical' : 'warning'
  return { level, days: d, reminderNumber: noteCount + 1, totalReminders: schedule.length }
}
function fmtTL(n) { return Number(n || 0).toLocaleString('tr-TR') + ' TL' }

const inputStyle = { padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, boxSizing: 'border-box', fontSize: 14, fontFamily: 'inherit', background: '#fff', color: T.text, colorScheme: 'light' }
const cardStyle = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 15, boxShadow: '0 12px 28px rgba(20,32,57,0.045)' }
const quickBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 9,
  border: '1px solid rgba(237,242,250,0.12)', background: 'rgba(255,255,255,0.045)', color: T.sidebarMuted, fontSize: 12.5, cursor: 'pointer', textAlign: 'left'
}
function getPageWrapStyle(isMobile) {
  return {
    flex: 1,
    padding: isMobile ? '16px 14px 84px' : '32px 38px',
    width: '100%',
    maxWidth: 'none',
    overflowX: 'hidden',
    background: T.bg,
  }
}

const sectionGridStyle = {
  display: 'grid',
  gap: 16,
  marginBottom: 16
}
const MOBILE_BREAKPOINT = 768

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  )
  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < MOBILE_BREAKPOINT) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

const SUSPICIOUS_IP_THRESHOLD = 3
const SUSPICIOUS_WINDOW_MS = 60 * 60 * 1000 // 1 saat

async function getClientIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const json = await res.json()
    return json.ip || null
  } catch (e) {
    return null
  }
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // login | forgot | sent
  const [resetEmail, setResetEmail] = useState('')
  const [resetErr, setResetErr] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)

    // Supabase Auth ile giriş
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    })

    if (authError || !authData.user) {
      setLoading(false)
      setErr('E-posta veya şifre hatalı.')
      return
    }

    // app_users'dan profil ve izinleri çek
    const { data: profile } = await supabase
      .from('app_users')
      .select('*, permission_templates(*)')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (!profile) {
      await supabase.auth.signOut()
      setLoading(false)
      setErr('Hesap profili bulunamadı. Yöneticinizle görüşün.')
      return
    }

    if (profile.active === false) {
      await supabase.auth.signOut()
      setLoading(false)
      setErr('Bu hesabın erişimi askıya alınmış. Yöneticinizle görüşün.')
      return
    }

    setLoading(false)
    onLogin({ ...profile, permissions: profile.permission_templates })
  }

  async function submitForgot(e) {
    e.preventDefault()
    setResetErr('')
    if (!resetEmail.trim()) return
    setResetLoading(true)
    try {
      // Supabase Auth'un kendi şifre sıfırlama sistemi
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: 'https://musteritakip.net/giris',
      })
      if (error) {
        setResetErr('Bir sorun oluştu, lütfen daha sonra tekrar deneyin.')
      } else {
        setMode('sent')
      }
    } catch {
      setResetErr('Bir sorun oluştu, lütfen daha sonra tekrar deneyin.')
    }
    setResetLoading(false)
  }

  if (mode === 'forgot') {
    return (
      <div style={{ maxWidth: 360, margin: '4rem auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Şifremi unuttum</p>
        <p style={{ fontSize: 13, color: T.textSoft, marginBottom: 20 }}>E-posta adresinizi girin, şifre sıfırlama linki gönderelim.</p>
        <form onSubmit={submitForgot}>
          <input type="email" placeholder="E-posta adresiniz" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
            style={{ width: '100%', marginBottom: 10, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, boxSizing: 'border-box' }} />
          {resetErr && <p style={{ fontSize: 13, color: '#c0392b', marginBottom: 10 }}>{resetErr}</p>}
          <button type="submit" disabled={resetLoading}
            style={{ width: '100%', padding: 10, borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            {resetLoading ? 'Gönderiliyor...' : 'Şifre sıfırlama linki gönder'}
          </button>
        </form>
        <button onClick={() => setMode('login')} style={{ marginTop: 14, fontSize: 13, color: T.textSoft, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          ← Giriş ekranına dön
        </button>
      </div>
    )
  }

  if (mode === 'sent') {
    return (
      <div style={{ maxWidth: 360, margin: '4rem auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>E-postanızı kontrol edin</p>
        <p style={{ fontSize: 13.5, color: T.textSoft, marginBottom: 20, lineHeight: 1.6 }}>
          Eğer bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama linki gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin.
        </p>
        <button onClick={() => setMode('login')} style={{ fontSize: 13, color: T.primary, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          ← Giriş ekranına dön
        </button>
      </div>
    )
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://musteritakip.net/giris' },
    })
  }

  return (
    <div style={{ maxWidth: 360, margin: '4rem auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Müşteri takip sistemi</p>
      <p style={{ fontSize: 13, color: T.textSoft, marginBottom: 20 }}>Giriş yapın</p>

      <button onClick={signInWithGoogle} type="button" style={{
        width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff',
        color: '#1f1f1f', cursor: 'pointer', fontWeight: 500, fontSize: 14, marginBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.81 2.73v2.27h2.92c1.71-1.57 2.69-3.88 2.69-6.64z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z"/><path fill="#FBBC05" d="M3.97 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.97H.96A8.996 8.996 0 0 0 0 9c0 1.45.35 2.83.96 4.03l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.97l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
        Google ile giriş yap
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: T.border }} />
        <span style={{ fontSize: 12, color: T.textFaint }}>veya</span>
        <div style={{ flex: 1, height: 1, background: T.border }} />
      </div>

      <form onSubmit={submit}>
        <input type="email" placeholder="E-posta adresiniz" value={email} onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', marginBottom: 10, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, boxSizing: 'border-box' }} />
        <input type="password" placeholder="Şifre" value={pass} onChange={e => setPass(e.target.value)}
          style={{ width: '100%', marginBottom: 10, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, boxSizing: 'border-box' }} />
        {err && <p style={{ fontSize: 13, color: '#c0392b', marginBottom: 10 }}>{err}</p>}
        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: 10, borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>
      <button onClick={() => setMode('forgot')} style={{ marginTop: 14, fontSize: 13, color: T.textSoft, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
        Şifremi unuttum
      </button>
      <p style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}`, fontSize: 13.5, color: T.textSoft, textAlign: 'center' }}>
        Hesabınız yok mu?{' '}
        <a href="/deneme" style={{ color: T.primary, fontWeight: 600, textDecoration: 'underline' }}>
          Ücretsiz 7 gün deneyin
        </a>
      </p>
    </div>
  )
}

const TRIAL_CONTACT_EMAIL = 'info@musteritakip.net'
const TRIAL_CONTACT_WHATSAPP = '905336153445'
const TRIAL_PRICE_TEXT = '3.500 TL + KDV / ay'

function TrialExpired({ onLogout, trialEndsAt, businessName }) {
  const endedDate = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : null
  const waMessage = `Merhaba, ${businessName ? businessName + ' için ' : ''}Müşteri Takip ödemesini yapmak istiyorum.`
  const waUrl = `https://wa.me/${TRIAL_CONTACT_WHATSAPP}?text=${encodeURIComponent(waMessage)}`

  return (
    <div style={{ maxWidth: 440, margin: '3rem auto', padding: '2rem', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <p style={{ fontSize: 40, margin: '0 0 12px' }}>⏰</p>
      <p style={{ fontSize: 19, fontWeight: 700, margin: '0 0 10px', color: T.text }}>7 günlük deneme süreniz doldu</p>
      <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.6, margin: '0 0 4px' }}>
        {endedDate ? `Deneme süreniz ${endedDate} tarihinde sona erdi.` : 'Deneme süreniz sona erdi.'}
      </p>
      <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.6, margin: '0 0 22px' }}>
        Verileriniz güvende — kullanmaya devam etmek için bizimle WhatsApp'tan iletişime geçin, size fatura ve ödeme bilgilerini ileteceğiz.
      </p>

      <div style={{ background: '#F3F0FF', border: `1px solid ${T.primary}`, borderRadius: 12, padding: '16px', marginBottom: 18 }}>
        <p style={{ fontSize: 12.5, color: T.textSoft, margin: '0 0 4px' }}>Aylık ücret</p>
        <p style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>{TRIAL_PRICE_TEXT}</p>
      </div>

      <a href={waUrl} target="_blank" rel="noreferrer" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px',
        borderRadius: 10, background: '#1FAA6D', color: '#fff', fontWeight: 700, fontSize: 14.5,
        textDecoration: 'none', marginBottom: 12, boxSizing: 'border-box',
      }}>
        💬 WhatsApp'tan İletişime Geç
      </a>

      <a href={`mailto:${TRIAL_CONTACT_EMAIL}?subject=${encodeURIComponent('Deneme Süresi Doldu - Devam Etmek İstiyorum')}`} style={{
        display: 'block', width: '100%', padding: '12px', borderRadius: 10, background: '#fff', border: `1px solid ${T.border}`,
        color: T.text, fontWeight: 600, fontSize: 13.5, textDecoration: 'none', marginBottom: 18, boxSizing: 'border-box'
      }}>ya da e-posta gönderin</a>

      <button onClick={onLogout} style={{
        background: 'none', border: 'none', color: T.textFaint, fontSize: 13, cursor: 'pointer', textDecoration: 'underline'
      }}>Çıkış yap</button>
    </div>
  )
}

const emptyForm = { name: '', phone: '+90', channel: 'Instagram', service: '', note: '', newNote: '', result: 'Randevu aldı', saleAmount: '', appointmentDate: '', appointmentTime: '' }

function toLocalDateValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function toLocalTimeValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function NoteHistory({ notes }) {
  if (!notes || notes.length === 0) {
    return <p style={{ fontSize: 12.5, color: T.textFaint, margin: '0 0 12px' }}>Henüz not eklenmemiş.</p>
  }
  const sorted = [...notes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 12.5, fontWeight: 600, color: T.textSoft, margin: '0 0 8px' }}>Not geçmişi ({sorted.length})</p>
      <div style={{ maxHeight: 180, overflowY: 'auto', border: `1px solid ${T.border}`, borderRadius: 10 }}>
        {sorted.map((n, i) => (
          <div key={n.id} style={{ padding: '9px 11px', borderBottom: i < sorted.length - 1 ? `1px solid ${T.border}` : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 11, color: T.textFaint }}>{n.created_by || '—'}</span>
              <span style={{ fontSize: 11, color: T.textFaint, flexShrink: 0 }}>{new Date(n.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })} · {new Date(n.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p style={{ fontSize: 13, color: T.text, margin: 0 }}>{n.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function LeadForm({ onAdd, onUpdate, onDelete, canDelete, currentUser, editing, onCancelEdit, onSaved, services, targetBranchId, targetBranchName, isSuperAdmin, isMobile, notesForLead, existingLeads = [], onFoundExisting }) {
  const [form, setForm] = useState(editing ? { ...editing, newNote: '', saleAmount: editing.sale_amount != null ? Number(editing.sale_amount).toLocaleString('tr-TR') : '', appointmentDate: toLocalDateValue(editing.appointment_at), appointmentTime: toLocalTimeValue(editing.appointment_at) } : emptyForm)
  const [saved, setSaved] = useState(false)
  const [phoneErr, setPhoneErr] = useState('')
  const [noteErr, setNoteErr] = useState('')
  const [appointmentErr, setAppointmentErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiErr, setAiErr] = useState('')
  const [duplicateNotice, setDuplicateNotice] = useState('')
  const suppressNoticeReset = useRef(false)

  useEffect(() => {
    setForm(editing ? { ...editing, newNote: '', saleAmount: editing.sale_amount != null ? Number(editing.sale_amount).toLocaleString('tr-TR') : '', appointmentDate: toLocalDateValue(editing.appointment_at), appointmentTime: toLocalTimeValue(editing.appointment_at) } : emptyForm)
    setPhoneErr(''); setNoteErr(''); setAppointmentErr(''); setConfirmingDelete(false)
    setAiTip(''); setAiErr('')
    if (suppressNoticeReset.current) {
      // Bu geçiş bir çift-kayıt tespiti sonucu oldu (onFoundExisting) — uyarıyı silme.
      suppressNoticeReset.current = false
    } else {
      setDuplicateNotice('')
    }
  }, [editing])

  useEffect(() => {
    if (!editing && !form.service && services && services.length > 0) {
      set('service', services[0].name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function getAiTip(noteText) {
    if (!noteText || !noteText.trim()) return
    setAiLoading(true)
    setAiErr('')
    setAiTip('')
    try {
      const res = await authenticatedNetlifyFetch('/.netlify/functions/lead-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText, result: form.result, service: form.service }),
      })
      const data = await res.json()
      if (res.ok && data.tip) {
        setAiTip(data.tip)
      } else {
        setAiErr('İpucu alınamadı, lütfen tekrar deneyin.')
      }
    } catch {
      setAiErr('İpucu alınamadı, lütfen tekrar deneyin.')
    }
    setAiLoading(false)
  }

  async function handleDelete() {
    if (!confirmingDelete) { setConfirmingDelete(true); return }
    await onDelete(editing.id)
  }

  async function submit(e) {
    e.preventDefault()
    let ok = true
    // Instagram gibi kanallardan gelen ve henüz cevap alınamayan kişilerin telefon
    // numarası çoğu zaman bilinmez - bu durumda telefon zorunlu tutulmaz, ama
    // girilmişse formatı yine de doğrulanır.
    const phoneOptional = form.result === 'Cevap yazıldı, müşteriden dönüş gelmedi'
    const phoneTrimmed = form.phone.trim()
    const phoneIsEffectivelyEmpty = !phoneTrimmed || phoneTrimmed === '+90'
    if (phoneOptional && phoneIsEffectivelyEmpty) {
      setPhoneErr('')
    } else if (!PHONE_RE.test(phoneTrimmed)) {
      setPhoneErr('Geçerli bir cep telefonu girin: +90 ile başlayıp, 5 ile devam edip, toplam 10 hane olmalı. Örnek: +905551234567')
      ok = false
    } else {
      setPhoneErr('')
    }
    if (!editing && !form.note.trim()) { setNoteErr('Görüşme notu olmadan kayıt eklenemez.'); ok = false }
    else setNoteErr('')
    if (form.result === 'Randevu aldı' && !(form.appointmentDate && form.appointmentTime)) { setAppointmentErr('Randevu aldı seçildiğinde tarih ve saat girilmesi zorunludur.'); ok = false }
    else setAppointmentErr('')
    if (!form.name.trim()) ok = false
    if (!ok) return

    const cleanPhone = phoneIsEffectivelyEmpty ? '' : phoneTrimmed

    // Aynı şubede, ismi VE telefonu birebir aynı olan bir kayıt varsa
    // yeni kayıt açmak yerine mevcut danışanı bulup ekrana getiriyoruz.
    if (!editing && cleanPhone) {
      const normalizedName = form.name.trim().toLocaleLowerCase('tr')
      const duplicate = existingLeads.find(l =>
        l.branch_id === targetBranchId &&
        (l.phone || '').trim() === cleanPhone &&
        (l.name || '').trim().toLocaleLowerCase('tr') === normalizedName
      )
      if (duplicate) {
        suppressNoticeReset.current = true
        setDuplicateNotice(`"${duplicate.name}" bu isim ve telefon numarasıyla zaten kayıtlı. Yeni kayıt açmak yerine mevcut danışan açıldı, yeni görüşmeyi oraya not olarak ekleyebilirsiniz.`)
        onFoundExisting && onFoundExisting(duplicate)
        return
      }
    }
    setDuplicateNotice('')

    setSubmitting(true)
    const saleAmount = form.result === 'Müşteri oldu' && form.saleAmount.trim() !== '' ? Number(form.saleAmount.replace(/\./g, '')) : null
    const appointmentAt = (form.appointmentDate && form.appointmentTime) ? new Date(`${form.appointmentDate}T${form.appointmentTime}`).toISOString() : null

    // Kaydın gerçek tarihi otomatik belirlenir: Randevu/Görüşme Tarihi geçmişte
    // bir tarihse (örn. eski defterden aktarılan 2023 kaydı), kayıt o gerçek
    // tarihle damgalanır - böylece "bu ay" raporları bugünün tarihine göre değil,
    // olayın gerçekte olduğu tarihe göre hesaplanır. Randevu tarihi bugün/gelecekteyse
    // (yeni, canlı bir kayıtsa) normal şekilde "şu an" kullanılır.
    const isHistorical = appointmentAt && new Date(appointmentAt) < new Date()

    if (editing) {
      const correctedDate = isHistorical ? appointmentAt : editing.date
      await onUpdate({
        id: editing.id, name: form.name, phone: cleanPhone, channel: form.channel,
        service: form.service, note: form.newNote, result: form.result, sale_amount: saleAmount,
        appointment_at: appointmentAt, edited_at: new Date().toISOString(), date: correctedDate
      }, currentUser.full_name || currentUser.email)
    } else {
      const entryDate = isHistorical ? appointmentAt : new Date().toISOString()
      await onAdd({
        id: uid(), branch_id: targetBranchId, name: form.name, phone: cleanPhone,
        channel: form.channel, service: form.service, note: form.note, result: form.result,
        sale_amount: saleAmount, appointment_at: appointmentAt, entered_by: currentUser.full_name || currentUser.email, date: entryDate
      })
    }
    setSubmitting(false)
    setForm(emptyForm)
    setSaved(true)
    onSaved?.()
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={submit} style={{ background: T.card, border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>{editing ? 'Kaydı düzenle' : 'Yeni görüşme kaydı'}</p>
        {editing && <button type="button" onClick={onCancelEdit} style={{ fontSize: 12 }}>Vazgeç</button>}
      </div>
      {isSuperAdmin && !editing && (
        <p style={{ fontSize: 12, color: '#1a6b3a', background: '#eaf3ec', padding: '6px 10px', borderRadius: 6, margin: '0 0 12px' }}>
          Bu kayıt <strong>{targetBranchName || 'seçili şube'}</strong> şubesine eklenecek. Farklı bir şubeye eklemek için yukarıdaki şube seçiciden değiştirin.
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <input placeholder="İsim soyisim" value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
        <div>
          <input placeholder={form.result === 'Cevap yazıldı, müşteriden dönüş gelmedi' ? '+905551234567 (isteğe bağlı)' : '+905551234567'} value={form.phone} onChange={e => {
            let v = e.target.value
            if (!v.startsWith('+90')) v = '+90' + v.replace(/^\+?90?/, '')
            set('phone', v)
          }} style={inputStyle} />
          {phoneErr && <p style={{ fontSize: 12, color: '#c0392b', margin: '4px 0 0' }}>{phoneErr}</p>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <select value={form.channel} onChange={e => set('channel', e.target.value)} style={inputStyle}>
          {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={form.result} onChange={e => set('result', e.target.value)} style={inputStyle}>
          {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <select value={form.service} onChange={e => set('service', e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: 10 }}>
        {(!services || services.length === 0) && <option value="">Hizmet listesi tanımlanmamış</option>}
        {(services || []).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
      </select>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input type="date" value={form.appointmentDate} onChange={e => {
            const val = e.target.value
            set('appointmentDate', val)
            if (val && form.appointmentTime) setAppointmentErr('')
          }} style={inputStyle} />
          <input type="time" value={form.appointmentTime} onChange={e => {
            const val = e.target.value
            set('appointmentTime', val)
            if (form.appointmentDate && val) setAppointmentErr('')
          }} style={inputStyle} />
        </div>
        <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
          {form.result === 'Randevu aldı'
            ? 'Randevu tarihi ve saati zorunludur.'
            : 'Randevu/görüşme tarihi — varsa girin, takvimde görünür. Boş bırakılabilir. Geçmiş bir tarih girerseniz (örn. eski defterden aktarım), kayıt otomatik olarak o tarihe damgalanır, raporları bugünün tarihiyle etkilemez.'}
        </p>
        {appointmentErr && <p style={{ fontSize: 12, color: '#c0392b', margin: '4px 0 0' }}>{appointmentErr}</p>}
      </div>
      {form.result === 'Müşteri oldu' && (
        <div style={{ marginBottom: 10 }}>
          <input placeholder="Satış tutarı (TL) — isteğe bağlı" value={form.saleAmount} onChange={e => {
            const digits = e.target.value.replace(/\D/g, '')
            const formatted = digits ? Number(digits).toLocaleString('tr-TR') : ''
            set('saleAmount', formatted)
          }} type="text" inputMode="numeric" style={{ ...inputStyle, width: '100%' }} />
          <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Bu alan zorunlu değildir, doldurmak istemezseniz boş bırakabilirsiniz.</p>
        </div>
      )}
      {editing ? (
        <>
          <NoteHistory notes={notesForLead} />
          <textarea placeholder="Yeni not ekle (isteğe bağlı)" value={form.newNote} onChange={e => set('newNote', e.target.value)} rows={2}
            style={{ width: '100%', marginBottom: 4, fontFamily: 'inherit', fontSize: 14, padding: 10, border: `1px solid ${T.border}`, borderRadius: 8, boxSizing: 'border-box', background: T.cardSoft, color: T.text, colorScheme: 'light' }} />
          <p style={{ fontSize: 11, color: '#888', margin: '4px 0 10px' }}>Not eklemek, bu kaydın "takip bekliyor" sayacını sıfırlar.</p>
          {(() => {
            // Yeni not yazılmadıysa, geçmişteki en son notu kullan - kullanıcı zaten girdiği
            // ilk notla ipucu isteyebilsin, tekrar yazmasına gerek kalmasın.
            const lastOldNote = notesForLead && notesForLead.length > 0
              ? [...notesForLead].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].note
              : ''
            const noteToUse = form.newNote.trim() || lastOldNote
            return (
              <button type="button" disabled={aiLoading || !noteToUse.trim()} onClick={() => getAiTip(noteToUse)} style={{
                fontSize: 12, padding: '5px 12px', borderRadius: 8, border: `1px solid ${T.primary}`, background: 'transparent',
                color: T.primary, cursor: noteToUse.trim() ? 'pointer' : 'not-allowed', fontWeight: 500, marginBottom: 10, opacity: noteToUse.trim() ? 1 : 0.5
              }}>
                {aiLoading ? '💡 Düşünüyor...' : '💡 İpucu Al'}
              </button>
            )
          })()}
        </>
      ) : (
        <>
          <textarea placeholder="Görüşme notu (zorunlu)" value={form.note} onChange={e => set('note', e.target.value)} rows={2}
            style={{ width: '100%', marginBottom: 4, fontFamily: 'inherit', fontSize: 14, padding: 10, border: `1px solid ${T.border}`, borderRadius: 8, boxSizing: 'border-box', background: T.cardSoft, color: T.text, colorScheme: 'light' }} />
          {noteErr && <p style={{ fontSize: 12, color: '#c0392b', margin: '0 0 10px' }}>{noteErr}</p>}
          <button type="button" disabled={aiLoading || !form.note.trim()} onClick={() => getAiTip(form.note)} style={{
            fontSize: 12, padding: '5px 12px', borderRadius: 8, border: `1px solid ${T.primary}`, background: 'transparent',
            color: T.primary, cursor: form.note.trim() ? 'pointer' : 'not-allowed', fontWeight: 500, marginBottom: 10, opacity: form.note.trim() ? 1 : 0.5
          }}>
            {aiLoading ? '💡 Düşünüyor...' : '💡 İpucu Al'}
          </button>
        </>
      )}
      {aiTip && (
        <div style={{ background: T.primaryLight || 'rgba(124,92,255,.1)', border: `1px solid ${T.primary}`, borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 13, color: T.text, lineHeight: 1.5 }}>
          <strong style={{ color: T.primary }}>💡 İpucu:</strong> {aiTip}
        </div>
      )}
      {aiErr && <p style={{ fontSize: 12, color: '#c0392b', margin: '0 0 10px' }}>{aiErr}</p>}
      {duplicateNotice && (
        <div style={{ background: '#fff7e6', border: '1px solid #e6a817', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 13, color: '#7a5400', lineHeight: 1.5 }}>
          ⚠️ {duplicateNotice}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <button type="submit" disabled={submitting} style={{ padding: '8px 16px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          {submitting ? 'Kaydediliyor...' : (editing ? 'Güncelle' : 'Kaydet')}
        </button>
        {editing && canDelete && (
          <button type="button" onClick={handleDelete} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #c0392b',
            background: confirmingDelete ? '#c0392b' : '#fff', color: confirmingDelete ? '#fff' : '#c0392b',
            cursor: 'pointer', fontWeight: 500
          }}>
            {confirmingDelete ? 'Emin misin? Tekrar tıkla' : 'Kaydı sil'}
          </button>
        )}
        {saved && <span style={{ fontSize: 13, color: '#2e7d32' }}>{editing ? 'Güncellendi' : 'Kaydedildi'}</span>}
      </div>
    </form>
  )
}

const STAT_COLOR_MAP = {
  violet: { solid: T.primary, soft: T.primaryLight },
  blue: { solid: T.blue, soft: T.blueBg },
  green: { solid: T.green, soft: T.greenBg },
  amber: { solid: T.orange, soft: T.orangeBg },
  purple: { solid: '#9333EA', soft: 'rgba(147,51,234,0.1)' },
}

function StatCard({ icon, label, value, color = 'violet', trend, trendLabel, subtitle }) {
  const c = STAT_COLOR_MAP[color] || STAT_COLOR_MAP.violet
  return (
    <div style={{ ...cardStyle, padding: '18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          width: 44, height: 44, borderRadius: '50%', background: c.solid, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12.5, color: T.textSoft, margin: '0 0 2px', fontWeight: 500 }}>{label}</p>
          <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: T.text, lineHeight: 1.15 }}>{value}</p>
          {subtitle && (
            <p style={{ fontSize: 11, margin: '3px 0 0', color: T.textFaint }}>{subtitle}</p>
          )}
          {trend != null && (
            <p style={{ fontSize: 11.5, margin: '3px 0 0', color: T.green, fontWeight: 600 }}>
              ↗ {trend}{trendLabel ? <span style={{ color: T.textFaint, fontWeight: 500 }}> · {trendLabel}</span> : null}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const WEEKDAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function dateKey(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Randevu kaydındaki mevcut sonuç alanından, takvimde okunması kolay bir durum üretir.
// Yeni bir veritabanı alanı gerektirmez; gelecek randevular ve sonuç bekleyen geçmiş
// randevular otomatik ayrışır.
const APPOINTMENT_STATUS = {
  upcoming: { label: 'Yaklaşan', shortLabel: 'Yaklaşan', color: '#6F61D9', bg: '#EEECFF' },
  needs_result: { label: 'Sonuç girilmeli', shortLabel: 'Sonuç bekliyor', color: '#A87412', bg: '#FCF3DE' },
  customer: { label: 'Müşteri oldu', shortLabel: 'Müşteri oldu', color: '#147561', bg: '#E8F4EF' },
  no_show: { label: 'Randevuya gelmedi', shortLabel: 'Gelmedi', color: '#BF4B4B', bg: '#FBEAEA' },
  not_bought: { label: 'Satın almadı', shortLabel: 'Satın almadı', color: '#A87412', bg: '#FCF3DE' },
  awaiting_reply: { label: 'Dönüş bekliyor', shortLabel: 'Dönüş bekliyor', color: '#64748B', bg: '#EEF1F5' },
}

function getAppointmentStatus(lead) {
  if (lead.result === 'Müşteri oldu') return 'customer'
  if (lead.result === 'Randevuya gelmedi') return 'no_show'
  if (lead.result === 'Satın almadı') return 'not_bought'
  if (lead.result === 'Cevap yazıldı, müşteriden dönüş gelmedi') return 'awaiting_reply'

  const appointmentTime = new Date(lead.appointment_at).getTime()
  if (Number.isFinite(appointmentTime) && appointmentTime > Date.now()) return 'upcoming'
  return 'needs_result'
}

function AppointmentStatusBadge({ status, compact = false }) {
  const item = APPOINTMENT_STATUS[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', borderRadius: 99,
      padding: compact ? '3px 7px' : '4px 9px', background: item.bg, color: item.color,
      fontSize: compact ? 10.5 : 11.5, fontWeight: 700,
    }}>
      {compact ? item.shortLabel : item.label}
    </span>
  )
}

function AppointmentCalendar({ leads, canSeePhone, currentUserName, isStaff, showBranch, branchNameFn, isMobile }) {
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const scopedLeads = useMemo(() =>
    leads.filter(l => l.appointment_at),
    [leads, currentUserName, isStaff])

  const leadsByDay = useMemo(() => {
    const map = {}
    scopedLeads.forEach(l => {
      const key = dateKey(new Date(l.appointment_at))
      if (!map[key]) map[key] = []
      map[key].push(l)
    })
    Object.values(map).forEach(arr => arr.sort((a, b) => new Date(a.appointment_at) - new Date(b.appointment_at)))
    return map
  }, [scopedLeads])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = (firstOfMonth.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = dateKey(new Date())

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function changeMonth(delta) {
    setViewDate(new Date(year, month + delta, 1))
    setSelectedDay(null)
  }
  function jumpToYear(y) {
    setViewDate(new Date(Number(y), month, 1))
    setSelectedDay(null)
  }
  function jumpToMonth(m) {
    setViewDate(new Date(year, Number(m), 1))
    setSelectedDay(null)
  }

  const yearOptions = []
  for (let y = 2010; y <= new Date().getFullYear() + 10; y++) yearOptions.push(y)

  const selectedKey = selectedDay ? dateKey(new Date(year, month, selectedDay)) : null
  const selectedLeads = selectedKey ? (leadsByDay[selectedKey] || []) : []
  const selectedStatusCounts = selectedLeads.reduce((counts, lead) => {
    const status = getAppointmentStatus(lead)
    counts[status] = (counts[status] || 0) + 1
    return counts
  }, {})
  const filteredSelectedLeads = statusFilter === 'all'
    ? selectedLeads
    : selectedLeads.filter(lead => getAppointmentStatus(lead) === statusFilter)
  const statusFilters = [
    ['all', 'Tümü'],
    ['needs_result', 'Sonuç bekliyor'],
    ['upcoming', 'Yaklaşan'],
    ['customer', 'Müşteri oldu'],
    ['no_show', 'Gelmedi'],
  ]

  return (
    <div style={{ background: T.card, border: '1px solid #e2e2e2', borderRadius: 12, padding: isMobile ? '1rem 0.75rem' : '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 }}>
        <button type="button" onClick={() => changeMonth(-1)} style={{ padding: '4px 10px', borderRadius: 8 }}>‹</button>
        <div style={{ display: 'flex', gap: isMobile ? 5 : 8 }}>
          <select value={month} onChange={e => jumpToMonth(e.target.value)} style={{ padding: isMobile ? '6px 4px' : '6px 8px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: isMobile ? 12.5 : 14, fontWeight: 600, minWidth: 0 }}>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => jumpToYear(e.target.value)} style={{ padding: isMobile ? '6px 4px' : '6px 8px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: isMobile ? 12.5 : 14, fontWeight: 600, minWidth: 0 }}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => changeMonth(1)} style={{ padding: '4px 10px', borderRadius: 8 }}>›</button>
      </div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
        {statusFilters.map(([value, label]) => {
          const active = statusFilter === value
          const config = value === 'all' ? null : APPOINTMENT_STATUS[value]
          return (
            <button key={value} type="button" onClick={() => setStatusFilter(value)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 99, padding: isMobile ? '5px 8px' : '6px 10px',
              border: active ? `1px solid ${config?.color || T.primary}` : `1px solid ${T.border}`,
              background: active ? (config?.bg || T.primaryLight) : '#fff', color: active ? (config?.color || T.primary) : T.textSoft,
              fontSize: isMobile ? 10.5 : 11.5, fontWeight: 700, cursor: 'pointer',
            }}>
              {config && <span style={{ width: 6, height: 6, borderRadius: '50%', background: config.color }} />}
              {label}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 3 : 4, marginBottom: 6 }}>
        {WEEKDAY_NAMES.map(w => <div key={w} style={{ textAlign: 'center', fontSize: isMobile ? 10 : 11, color: '#888', fontWeight: 600 }}>{w}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 3 : 4 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={'e' + i} />
          const key = dateKey(new Date(year, month, d))
          const dayLeads = leadsByDay[key] || []
          const dayStatusCounts = dayLeads.reduce((counts, lead) => {
            const status = getAppointmentStatus(lead)
            counts[status] = (counts[status] || 0) + 1
            return counts
          }, {})
          const isToday = key === todayKey
          const isSelected = key === selectedKey
          return (
            <button key={d} type="button" onClick={() => setSelectedDay(d)}
              style={{
                position: 'relative', padding: isMobile ? '5px 2px' : '8px 4px', minHeight: isMobile ? 36 : 44, borderRadius: 8, textAlign: 'left',
                background: isSelected ? T.primary : (isToday ? T.primaryLight : '#fff'),
                color: isSelected ? '#fff' : '#222',
                border: isToday && !isSelected ? `1px solid ${T.primary}` : `1px solid ${T.border}`,
                cursor: 'pointer', fontSize: isMobile ? 12 : 13
              }}>
              <span>{d}</span>
              {dayLeads.length > 0 && (
                <>
                  <span style={{
                    display: 'block', marginTop: 4, fontSize: isMobile ? 9 : 10, fontWeight: 700,
                    color: isSelected ? '#fff' : T.primary
                  }}>
                    {isMobile ? dayLeads.length : `${dayLeads.length} randevu`}
                  </span>
                  <span style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                    {Object.entries(dayStatusCounts).slice(0, 4).map(([status, count]) => (
                      <i key={status} title={`${APPOINTMENT_STATUS[status].label}: ${count}`} style={{
                        display: 'block', width: isMobile ? 4 : 5, height: isMobile ? 4 : 5, borderRadius: '50%',
                        background: isSelected ? 'rgba(255,255,255,0.9)' : APPOINTMENT_STATUS[status].color,
                      }} />
                    ))}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>

      {selectedDay && (
        <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 10px', color: T.text }}>
            {selectedDay} {MONTH_NAMES[month]} {year} — {selectedLeads.length} randevu
          </p>
          {selectedLeads.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {Object.entries(selectedStatusCounts).map(([status, count]) => (
                <span key={status} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 99, background: APPOINTMENT_STATUS[status].bg, color: APPOINTMENT_STATUS[status].color, fontSize: 11, fontWeight: 700 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: APPOINTMENT_STATUS[status].color }} />
                  {count} {APPOINTMENT_STATUS[status].shortLabel.toLocaleLowerCase('tr-TR')}
                </span>
              ))}
            </div>
          )}
          {selectedLeads.length === 0 ? (
            <p style={{ fontSize: 13, color: '#888' }}>Bu günde randevu yok.</p>
          ) : filteredSelectedLeads.length === 0 ? (
            <p style={{ fontSize: 13, color: T.textSoft }}>Bu filtreye uygun randevu yok.</p>
          ) : filteredSelectedLeads.map(lead => (
            isMobile ? (
              <div key={lead.id} style={{ padding: '9px 0', fontSize: 13, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 600 }}>{lead.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#6C5CE7', flexShrink: 0 }}>
                    {new Date(lead.appointment_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: T.textSoft }}>
                  {canSeePhone ? lead.phone : '••• gizli'}{showBranch && ` · ${branchNameFn(lead.branch_id)}`} · {lead.service}
                </p>
                <div style={{ marginTop: 6 }}><AppointmentStatusBadge status={getAppointmentStatus(lead)} compact /></div>
                {lead.note && <p style={{ margin: '2px 0 0', fontSize: 12, color: T.textFaint }}>{lead.note.slice(0, 40)}</p>}
              </div>
            ) : (
              <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: 13, borderBottom: '1px solid #f0f0f0' }}>
                <span>
                  <span style={{ fontWeight: 600 }}>{lead.name}</span>
                  <span style={{ color: T.textSoft, marginLeft: 8 }}>{canSeePhone ? lead.phone : '••• gizli'}</span>
                  {showBranch && <span style={{ color: T.textSoft, marginLeft: 8, fontSize: 12 }}>· {branchNameFn(lead.branch_id)}</span>}
                  <span style={{ color: T.textSoft, marginLeft: 8, fontSize: 12 }}>· {lead.service}</span>
                  {lead.note && <span style={{ color: T.textFaint, marginLeft: 8, fontSize: 12 }}>· {lead.note.slice(0, 40)}</span>}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12 }}>
                  <AppointmentStatusBadge status={getAppointmentStatus(lead)} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.primary }}>
                    {new Date(lead.appointment_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}

function StaleAlerts({ leads, canSeePhone, currentUserName, isStaff, noteCountMap, ruleMap }) {
  const stale = useMemo(() =>
    leads
      .map(l => ({ lead: l, s: staleness(l, noteCountMap[l.id] || 0, ruleMap ? ruleMap[`${l.branch_id}__${l.result}`] : null) }))
      .filter(x => x.s && x.s.level !== 'cold')
      .sort((a, b) => b.s.days - a.s.days),
    [leads, currentUserName, isStaff, noteCountMap, ruleMap])

  if (stale.length === 0) return null

  return (
    <div style={{ background: '#fdecea', border: '1px solid #f3c4c0', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <p style={{ fontWeight: 600, fontSize: 15, margin: 0, color: '#c0392b' }}>🔔 {stale.length} lead takip bekliyor</p>
      </div>
      {stale.slice(0, 8).map(({ lead, s }) => (
        <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13, borderTop: '1px solid #f3c4c0' }}>
          <span>
            <span style={{ fontWeight: 600 }}>{lead.name}</span>
            <span style={{ color: T.textSoft, marginLeft: 8 }}>{canSeePhone ? lead.phone : '••• gizli'}</span>
            <span style={{ color: T.textSoft, marginLeft: 8, fontSize: 12 }}>· {lead.result}</span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: s.level === 'critical' ? '#c0392b' : '#b8860b' }}>{s.days} gün önce — {s.reminderNumber}. hatırlatma</span>
        </div>
      ))}
      {stale.length > 8 && <p style={{ fontSize: 12, color: T.textSoft, margin: '8px 0 0' }}>+ {stale.length - 8} kayıt daha</p>}
    </div>
  )
}

const REMINDER_RULE_LABELS = {
  'Randevuya gelmedi': { title: 'Randevuya Gelmedi', color: '#E24B4A' },
  'Cevap yazıldı, müşteriden dönüş gelmedi': { title: 'Cevap Yazıldı, Dönüş Gelmedi', color: '#9CA3AF' },
  'Satın almadı': { title: 'Satın Almadı', color: '#EF9F27' },
  'Randevu aldı': { title: 'Randevu Aldı (hatırlatma)', color: '#1D9E75' },
}
const REMINDER_RULE_ORDER = ['Randevuya gelmedi', 'Cevap yazıldı, müşteriden dönüş gelmedi', 'Satın almadı', 'Randevu aldı']

function OpportunitiesTab({ leads, noteCountMap, rules, ruleMap, canEditRules, isSuperAdmin, filterBranch, activeBranches, branchName, onSaveRule, canSeePhone, onOpenLead }) {
  const [ruleBranchId, setRuleBranchId] = useState(
    isSuperAdmin ? (filterBranch !== 'all' ? filterBranch : (activeBranches[0]?.id || '')) : null
  )
  const [editValues, setEditValues] = useState({})
  const [savingKey, setSavingKey] = useState(null)

  const opportunities = useMemo(() =>
    leads
      .map(l => ({ lead: l, s: staleness(l, noteCountMap[l.id] || 0, ruleMap[`${l.branch_id}__${l.result}`] || null) }))
      .filter(x => x.s && x.s.level !== 'cold')
      .sort((a, b) => {
        if (a.s.level !== b.s.level) return a.s.level === 'critical' ? -1 : 1
        return b.s.days - a.s.days
      }),
    [leads, noteCountMap, ruleMap])

  const targetBranchId = isSuperAdmin ? ruleBranchId : (leads[0]?.branch_id || null)
  const branchRules = rules.filter(r => r.branch_id === targetBranchId)

  function fieldKey(ruleId, field) { return `${ruleId}__${field}` }
  function getValue(rule, field) {
    const k = fieldKey(rule.id, field)
    return editValues[k] !== undefined ? editValues[k] : rule[field]
  }
  function setValue(rule, field, value) {
    setEditValues(prev => ({ ...prev, [fieldKey(rule.id, field)]: value }))
  }
  async function saveRule(rule) {
    setSavingKey(rule.id)
    await onSaveRule({
      id: rule.id,
      day_1: Number(getValue(rule, 'day_1')) || 1,
      day_2: Number(getValue(rule, 'day_2')) || 1,
      day_3: Number(getValue(rule, 'day_3')) || 1,
      cold_after: Number(getValue(rule, 'cold_after')) || 1,
    })
    setSavingKey(null)
  }

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Fırsatlar</h1>
      <p style={{ fontSize: 13.5, color: T.textSoft, margin: '0 0 20px' }}>Takip bekleyen danışanlar ve hatırlatma kuralları</p>

      {/* AKSİYON LİSTESİ */}
      <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 14, padding: '1.25rem', marginBottom: 24 }}>
        <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 14px' }}>
          🔥 {opportunities.length} danışan sizi bekliyor
        </p>
        {opportunities.length === 0 && (
          <p style={{ fontSize: 13.5, color: T.textSoft }}>Şu anda takip bekleyen bir danışan yok, harika iş!</p>
        )}
        {opportunities.map(({ lead, s }) => {
          const waUrl = buildWhatsappUrl(lead)
          return (
            <div key={lead.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
              padding: '12px 0', borderTop: `1px solid ${T.border}`,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{lead.name}</div>
                <div style={{ fontSize: 12.5, color: T.textSoft, marginTop: 2 }}>
                  {canSeePhone ? lead.phone : '••• gizli'} · {lead.result}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  background: s.level === 'critical' ? '#FCEAEA' : '#FCF3E1',
                  color: s.level === 'critical' ? '#E5615F' : '#E5A536',
                }}>
                  {s.days} gün önce · {s.reminderNumber}. temas
                </span>
                {waUrl && (
                  <a href={waUrl} target="_blank" rel="noreferrer" style={{
                    fontSize: 12.5, fontWeight: 600, color: '#1FAA6D', textDecoration: 'none',
                    border: '1px solid #1FAA6D', borderRadius: 8, padding: '6px 10px',
                  }}>WhatsApp</a>
                )}
                <button onClick={() => onOpenLead(lead)} style={{
                  fontSize: 12.5, fontWeight: 600, color: '#fff', background: '#7C5CFC', border: 'none',
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                }}>Not Ekle</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* HATIRLATMA KURALLARI */}
      <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 14, padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>⚙️ Hatırlatma Kuralları</p>
          {isSuperAdmin && (
            <select value={ruleBranchId || ''} onChange={e => setRuleBranchId(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13 }}>
              {activeBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>

        {!canEditRules && <p style={{ fontSize: 12.5, color: T.textSoft, marginBottom: 10 }}>Bu kuralları sadece şube yöneticisi değiştirebilir.</p>}

        {REMINDER_RULE_ORDER.map(resultKey => {
          const rule = branchRules.find(r => r.result === resultKey)
          if (!rule) return null
          const meta = REMINDER_RULE_LABELS[resultKey]
          return (
            <div key={rule.id} style={{ padding: '12px 0', borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{meta.title}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {['day_1', 'day_2', 'day_3', 'cold_after'].map((field, i) => (
                  <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <label style={{ fontSize: 10.5, color: T.textSoft }}>
                      {i < 3 ? `${i + 1}. temas (gün)` : 'Soğuma (gün)'}
                    </label>
                    <input type="number" min={1} disabled={!canEditRules}
                      value={getValue(rule, field)}
                      onChange={e => setValue(rule, field, e.target.value)}
                      style={{ width: 70, padding: '6px 8px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13 }} />
                  </div>
                ))}
                {canEditRules && (
                  <button onClick={() => saveRule(rule)} disabled={savingKey === rule.id} style={{
                    alignSelf: 'flex-end', padding: '7px 14px', borderRadius: 8, border: 'none',
                    background: '#7C5CFC', color: '#fff', fontWeight: 600, fontSize: 12.5,
                    cursor: 'pointer', marginBottom: 1,
                  }}>
                    {savingKey === rule.id ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// "Müşteri oldu" durumu kasıtlı olarak yok - zaten takip gerektirmeyen, sonuçlanmış bir durum.
const WHATSAPP_TEMPLATES = {
  'Randevu aldı': (name, service) =>
    `Merhaba ${name}! 🌟 ${service ? `${service} için ` : ''}randevunuza çok az kaldı, sizi ağırlamak için sabırsızlanıyoruz. Yol tarifine ihtiyacınız var mı?`,
  'Randevuya gelmedi': (name) =>
    `Merhaba ${name}, sizi randevuda göremedik, umarım her şey yolundadır 🙏 Hemen size en uygun yeni bir gün ayarlayalım, hangi gün size iyi gelir?`,
  'Satın almadı': (name, service) =>
    `Merhaba ${name}! ${service ? `${service} ` : ''}konusunda hâlâ kararsızsanız, size özel bir seçenek sunabiliriz. 2 dakikalık bir görüşmeyle netleştirelim mi?`,
  'Cevap yazıldı, müşteriden dönüş gelmedi': (name) =>
    `Merhaba ${name}, sizi bekliyoruz! ✨ Aklınıza gelen soruları şimdi sorabilirsiniz, hemen yanıtlayalım. Şimdi uygun musunuz?`,
}

function buildWhatsappUrl(lead) {
  const template = WHATSAPP_TEMPLATES[lead.result]
  if (!template) return null
  const digits = (lead.phone || '').replace(/[^\d]/g, '') // wa.me formatı: sadece rakamlar, + işareti olmadan
  if (!digits || digits === '90') return null // telefon numarası girilmemiş (Instagram gibi kanallardan sıkça olur)
  const message = template(lead.name, lead.service)
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

function LeadRow({ lead, canSeePhone, canEdit, onEdit, showBranch, branchName, isMobile, noteCount = 0, rule = null }) {
  const followUp = staleness(lead, noteCount, rule)
  const status = getAppointmentStatus(lead)
  const appointment = lead.appointment_at ? new Date(lead.appointment_at) : null
  const hasAppointment = appointment && !Number.isNaN(appointment.getTime())
  const whatsappUrl = canSeePhone ? buildWhatsappUrl(lead) : null

  let nextStep = 'Kayıt bekliyor'
  let nextStepColor = T.textSoft
  if (status === 'needs_result') {
    nextStep = hasAppointment ? `Sonucu güncelle · ${appointment.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}` : 'Sonucu güncelle'
    nextStepColor = T.orange
  } else if (status === 'upcoming') {
    nextStep = `Randevu · ${appointment.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} ${appointment.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
    nextStepColor = T.primary
  } else if (followUp?.level === 'cold') {
    nextStep = 'Takip soğuk'
  } else if (followUp) {
    nextStep = `${followUp.days} gün önce takip zamanı geldi`
    nextStepColor = followUp.level === 'critical' ? T.red : T.orange
  } else if (hasAppointment) {
    nextStep = appointment.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const detailButton = canEdit ? (
    <button onClick={() => onEdit(lead)} style={{
      border: `1px solid ${T.border}`, background: '#fff', color: T.text, borderRadius: 8,
      padding: isMobile ? '6px 9px' : '7px 10px', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
    }}>Detay</button>
  ) : null

  if (isMobile) {
    return (
      <div style={{ padding: '13px 0', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14.5, margin: 0, color: T.text }}>{lead.name}</p>
            <p style={{ fontSize: 12, color: T.textSoft, margin: '3px 0 0' }}>{lead.service || 'Hizmet belirtilmedi'} · {lead.channel}{showBranch && ` · ${branchName}`}</p>
          </div>
          {detailButton}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
          <AppointmentStatusBadge status={status} compact />
          {lead.sale_amount != null && <span style={{ fontSize: 11, fontWeight: 700, color: T.green, background: T.greenBg, padding: '3px 8px', borderRadius: 99 }}>{fmtTL(lead.sale_amount)}</span>}
          {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ color: T.green, fontSize: 12, textDecoration: 'none', fontWeight: 700 }}>WhatsApp</a>}
        </div>
        <p style={{ margin: '8px 0 0', color: nextStepColor, fontSize: 12.5, fontWeight: 600 }}>{nextStep}</p>
      </div>
    )
  }

  const columns = showBranch ? '0.82fr 1.35fr 1.05fr 1.05fr 1.15fr .7fr .46fr' : '1.4fr 1.1fr 1.1fr 1.15fr .72fr .48fr'
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: columns, gap: 12, padding: '13px 0', borderBottom: `1px solid ${T.border}`,
      fontSize: 13, alignItems: 'center', minWidth: 790,
    }}>
      {showBranch && <span style={{ fontSize: 12, color: T.textSoft }}>{branchName}</span>}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontWeight: 700, margin: 0, color: T.text, fontSize: 13.5 }}>{lead.name}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, minWidth: 0 }}>
          <span style={{ color: T.textSoft, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{canSeePhone ? (lead.phone || 'Telefon yok') : '••• gizli'}</span>
          {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" title="WhatsApp'tan yaz" style={{ color: T.green, textDecoration: 'none', fontSize: 12 }}>◉</a>}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ color: T.text, margin: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.service || 'Hizmet belirtilmedi'}</p>
        <p style={{ color: T.textSoft, margin: '3px 0 0', fontSize: 11.5 }}>{lead.channel}</p>
      </div>
      <span><AppointmentStatusBadge status={status} compact /></span>
      <span style={{ color: nextStepColor, fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>{nextStep}</span>
      <span style={{ color: lead.sale_amount != null ? T.green : T.textFaint, fontSize: 12.5, fontWeight: lead.sale_amount != null ? 700 : 500 }}>{lead.sale_amount != null ? fmtTL(lead.sale_amount) : '—'}</span>
      <span>{detailButton}</span>
    </div>
  )
}

const META_APP_ID_PUBLIC = '2419489471794373' // Public App ID, gizli değil - OAuth URL'inde kullanılır
const META_REDIRECT_URI = 'https://musteritakip.net/.netlify/functions/meta-oauth-callback'

function MetaConnectionPanel({ branchId, branchName }) {
  const [connection, setConnection] = useState(null) // null: yükleniyor, false: bağlı değil, obje: bağlı
  const [accounts, setAccounts] = useState(null)
  const [selecting, setSelecting] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!branchId) return
    loadConnection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId])

  async function loadConnection() {
    setConnection(null)
    const { data } = await supabase.from('meta_connections').select('branch_id, ad_account_id, ad_account_name, token_expires_at').eq('branch_id', branchId).maybeSingle()
    setConnection(data || false)
  }

  function connectMeta() {
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID_PUBLIC}&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&scope=ads_read&state=${branchId}`
    window.location.href = authUrl
  }

  async function loadAccounts() {
    setSelecting(true)
    setMsg('')
    try {
      const res = await fetch(`/.netlify/functions/meta-list-accounts?branch_id=${branchId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAccounts(data.accounts || [])
    } catch (err) {
      setMsg('Hesaplar alınamadı: ' + err.message)
    }
  }

  async function selectAccount(acc) {
    setMsg('')
    try {
      const res = await fetch('/.netlify/functions/meta-select-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id: branchId, ad_account_id: acc.id, ad_account_name: acc.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSelecting(false)
      setAccounts(null)
      loadConnection()
    } catch (err) {
      setMsg('Hesap kaydedilemedi: ' + err.message)
    }
  }

  async function fetchInsights() {
    setFetching(true)
    setMsg('')
    try {
      const res = await fetch('/.netlify/functions/fetch-meta-insights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id: branchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg(`✅ ${data.inserted || 0} günlük veri çekildi.`)
    } catch (err) {
      setMsg('Veri çekilemedi: ' + err.message)
    }
    setFetching(false)
  }

  async function disconnectMeta() {
    if (!window.confirm('Meta bağlantısını kesmek istediğinize emin misiniz? Yeniden bağlanmanız gerekecek.')) return
    setMsg('')
    try {
      await supabase.from('meta_connections').delete().eq('branch_id', branchId)
      loadConnection()
    } catch (err) {
      setMsg('Bağlantı kesilemedi: ' + err.message)
    }
  }

  if (connection === null) {
    return <div style={{ background: T.card, border: '1px solid #e2e2e2', borderRadius: 12, padding: '1rem', marginBottom: 16 }}>
      <p style={{ fontSize: 13, color: T.textSoft }}>Meta bağlantı durumu kontrol ediliyor...</p>
    </div>
  }

  return (
    <div style={{ background: T.card, border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.1rem', marginBottom: 16 }}>
      <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>📊 Meta Reklam Hesabı — {branchName}</p>

      {!connection && (
        <>
          <p style={{ fontSize: 13, color: T.textSoft, margin: '0 0 12px' }}>Meta (Facebook/Instagram) reklam hesabınızı bağlayın, harcama ve mesaj verileri otomatik çekilsin.</p>
          <button onClick={connectMeta} style={{ padding: '9px 16px', borderRadius: 8, background: '#1877F2', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>
            Meta ile Bağlan
          </button>
        </>
      )}

      {connection && !connection.ad_account_id && !selecting && (
        <>
          <p style={{ fontSize: 13, color: T.textSoft, margin: '0 0 12px' }}>Bağlantı kuruldu, şimdi hangi reklam hesabını kullanacağınızı seçin.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={loadAccounts} style={{ padding: '9px 16px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>
              Reklam Hesabı Seç
            </button>
            <button onClick={disconnectMeta} style={{ padding: '9px 16px', borderRadius: 8, background: 'transparent', color: '#c0392b', border: '1px solid #c0392b', cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>
              Bağlantıyı Kes
            </button>
          </div>
        </>
      )}

      {selecting && accounts && (
        <div>
          <p style={{ fontSize: 13, color: T.textSoft, margin: '0 0 10px' }}>Bir reklam hesabı seçin:</p>
          {accounts.length === 0 && <p style={{ fontSize: 13, color: '#c0392b' }}>Erişilebilir reklam hesabı bulunamadı.</p>}
          {accounts.map(acc => (
            <button key={acc.id} onClick={() => selectAccount(acc)} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8,
              border: `1px solid ${T.border}`, background: 'transparent', color: T.text, cursor: 'pointer', marginBottom: 6, fontSize: 13.5,
            }}>
              {acc.name} <span style={{ color: T.textSoft, fontSize: 12 }}>({acc.id})</span>
            </button>
          ))}
        </div>
      )}

      {connection && connection.ad_account_id && (
        <>
          <p style={{ fontSize: 13, color: '#2e7d32', margin: '0 0 4px' }}>✅ Bağlı: {connection.ad_account_name}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <button onClick={fetchInsights} disabled={fetching} style={{ padding: '9px 16px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>
              {fetching ? 'Veriler çekiliyor...' : 'Meta Verilerini Çek (Son 7 Gün)'}
            </button>
            <button onClick={disconnectMeta} style={{ padding: '9px 16px', borderRadius: 8, background: 'transparent', color: '#c0392b', border: '1px solid #c0392b', cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>
              Bağlantıyı Kes
            </button>
          </div>
        </>
      )}

      {msg && <p style={{ fontSize: 12.5, color: msg.startsWith('✅') ? '#2e7d32' : '#c0392b', marginTop: 10 }}>{msg}</p>}
    </div>
  )
}

function AdsBranchSelector({ branches, selectedBranch, onSelectBranch, isMobile }) {
  return (
    <div style={{ background: T.card, border: '1px solid #e2e2e2', borderRadius: 12, padding: isMobile ? '1rem' : '1.25rem', marginBottom: 16 }}>
      <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 10px' }}>Şube seçin</p>
      <select value={selectedBranch} onChange={e => onSelectBranch(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
    </div>
  )
}

const WEEKDAYS = [
  { key: 'mon', label: 'Pazartesi' },
  { key: 'tue', label: 'Salı' },
  { key: 'wed', label: 'Çarşamba' },
  { key: 'thu', label: 'Perşembe' },
  { key: 'fri', label: 'Cuma' },
  { key: 'sat', label: 'Cumartesi' },
  { key: 'sun', label: 'Pazar' },
]

function WorkingHoursEditor({ branch, onSave }) {
  const initial = branch.working_hours || {}
  const [hours, setHours] = useState(() => {
    const h = {}
    WEEKDAYS.forEach(d => { h[d.key] = initial[d.key] || null })
    return h
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggleDay(key) {
    setHours(h => ({ ...h, [key]: h[key] ? null : { open: '09:30', close: '19:30' } }))
    setSaved(false)
  }
  function setTime(key, field, value) {
    setHours(h => ({ ...h, [key]: { ...h[key], [field]: value } }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    await onSave(branch.id, hours)
    setSaving(false)
    setSaved(true)
  }

  return (
    <div style={{ background: T.cardSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px', marginTop: 8 }}>
      <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>Çalışma saatleri — {branch.name}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {WEEKDAYS.map(d => (
          <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, width: 100, flexShrink: 0, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!hours[d.key]} onChange={() => toggleDay(d.key)} />
              {d.label}
            </label>
            {hours[d.key] ? (
              <>
                <input type="time" value={hours[d.key].open} onChange={e => setTime(d.key, 'open', e.target.value)}
                  style={{ ...inputStyle, width: 110, padding: 6, fontSize: 13 }} />
                <span style={{ fontSize: 12, color: T.textFaint }}>—</span>
                <input type="time" value={hours[d.key].close} onChange={e => setTime(d.key, 'close', e.target.value)}
                  style={{ ...inputStyle, width: 110, padding: 6, fontSize: 13 }} />
              </>
            ) : (
              <span style={{ fontSize: 12, color: T.textFaint }}>Kapalı</span>
            )}
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} style={{
        marginTop: 14, padding: '7px 16px', borderRadius: 8, background: T.primary, color: '#fff',
        border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500
      }}>
        {saving ? 'Kaydediliyor...' : saved ? 'Kaydedildi ✓' : 'Saatleri Kaydet'}
      </button>
    </div>
  )
}

// İşletme sahibinin kendi online randevu sayfası linkini görüp kopyalayabileceği/paylaşabileceği kart.
function OnlineBookingLinkCard({ branchId, branchName }) {
  const [copied, setCopied] = useState(false)
  const link = `https://musteritakip.net/randevu/${branchId}`

  function copyLink() {
    navigator.clipboard?.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(`${branchName} için online randevu sayfamız: ${link}`)}`

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '1.25rem', marginBottom: 16 }}>
      <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>🔗 Online Randevu Sayfanız</p>
      <p style={{ fontSize: 12.5, color: T.textSoft, margin: '0 0 14px' }}>
        Bu linki müşterilerinize (Instagram bio, WhatsApp durumu, kartvizit vb. üzerinden) paylaşın — sizi aramadan 7/24 randevu alabilirler.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          flex: '1 1 260px', padding: '9px 12px', borderRadius: 9, border: `1px solid ${T.border}`,
          background: T.bg, fontSize: 13, fontFamily: 'monospace', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{link}</div>
        <button onClick={copyLink} style={{
          padding: '9px 14px', borderRadius: 9, border: 'none', background: T.primary, color: '#fff',
          fontWeight: 600, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>{copied ? 'Kopyalandı ✓' : 'Linki Kopyala'}</button>
        <a href={waShareUrl} target="_blank" rel="noreferrer" style={{
          padding: '9px 14px', borderRadius: 9, border: `1px solid #1FAA6D`, color: '#1FAA6D',
          fontWeight: 600, fontSize: 12.5, textDecoration: 'none', whiteSpace: 'nowrap',
        }}>WhatsApp'ta Paylaş</a>
        <a href={link} target="_blank" rel="noreferrer" style={{
          padding: '9px 14px', borderRadius: 9, border: `1px solid ${T.border}`, color: T.textSoft,
          fontWeight: 600, fontSize: 12.5, textDecoration: 'none', whiteSpace: 'nowrap',
        }}>Sayfayı Gör</a>
      </div>
    </div>
  )
}

function BranchManagement({ branches, onAdd, onToggleActive, onDelete, onSaveWorkingHours }) {
  const [name, setName] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)
  const [editingHoursFor, setEditingHoursFor] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    await onAdd({ id: uid(), name: name.trim() })
    setName('')
  }

  async function handleDelete(id) {
    if (confirmingDeleteId !== id) { setConfirmingDeleteId(id); return }
    await onDelete(id)
    setConfirmingDeleteId(null)
  }

  return (
    <div style={{ background: T.card, border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem', marginTop: '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>Şube ekle</p>
      <p style={{ fontSize: 13, color: T.textSoft, margin: '0 0 12px' }}>Bir şubeyi pasif yaparsan panelde görünmez ama tüm verisi (kayıtlar, kullanıcılar) korunur, istediğin zaman tekrar aktif edebilirsin. Silersen veri arşive taşınır ve şube panelden tamamen kalkar.</p>
      <form onSubmit={submit} style={{ display: 'flex', gap: 10 }}>
        <input placeholder="Şube adı (örn. Aris Kadıköy)" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer' }}>Ekle</button>
      </form>
      <div style={{ marginTop: 12 }}>
        {branches.map(b => (
          <div key={b.id} style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 13, margin: 0, color: b.active === false ? '#bbb' : '#666' }}>🏪 {b.name}{b.active === false ? ' (pasif)' : ''}</p>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                <button onClick={() => setEditingHoursFor(editingHoursFor === b.id ? null : b.id)} style={{
                  fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${T.primary}`, background: 'transparent', color: T.primary
                }}>
                  🕐 Çalışma Saatleri
                </button>
                <button onClick={() => onToggleActive(b.id, b.active)} style={{
                  fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                  border: b.active === false ? '1px solid #2e7d32' : '1px solid #c0392b',
                  background: b.active === false ? '#2e7d32' : '#c0392b',
                  color: '#fff'
                }}>
                  {b.active === false ? 'Aktif et' : 'Pasif yap'}
                </button>
                <button onClick={() => handleDelete(b.id)} style={{
                  fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                  border: confirmingDeleteId === b.id ? '1px solid #c0392b' : '1px solid #ddd',
                  background: confirmingDeleteId === b.id ? '#c0392b' : 'transparent',
                  color: confirmingDeleteId === b.id ? '#fff' : '#999'
                }}>
                  {confirmingDeleteId === b.id ? 'Emin misin?' : 'Sil'}
                </button>
              </div>
            </div>
            {editingHoursFor === b.id && <WorkingHoursEditor branch={b} onSave={onSaveWorkingHours} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function BranchServiceManager({ services, branchId, branchName, onAdd, onDelete }) {
  const [name, setName] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    await onAdd({ id: uid(), branch_id: branchId, name: name.trim() })
    setName('')
  }

  async function handleDelete(svc) {
    if (confirmingId !== svc.id) { setConfirmingId(svc.id); return }
    await onDelete(svc.id)
    setConfirmingId(null)
  }

  return (
    <div style={{ background: T.card, border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem', marginTop: '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>Hizmet listesi {branchName ? `· ${branchName}` : ''}</p>
      <p style={{ fontSize: 13, color: T.textSoft, margin: '0 0 12px' }}>Bu şubenin görüşme formunda görünecek hizmetleri buradan yönetebilirsin.</p>
      <form onSubmit={submit} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <input placeholder="Hizmet adı (örn. Saç boyama)" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer' }}>Ekle</button>
      </form>
      {services.length === 0 ? (
        <p style={{ fontSize: 13, color: '#888' }}>Henüz hizmet eklenmedi.</p>
      ) : services.map(s => (
        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <p style={{ fontSize: 13, margin: 0, color: '#444' }}>{s.name}</p>
          <button onClick={() => handleDelete(s)} style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
            border: confirmingId === s.id ? '1px solid #c0392b' : '1px solid #ddd',
            background: confirmingId === s.id ? '#c0392b' : '#fff',
            color: confirmingId === s.id ? '#fff' : '#999'
          }}>
            {confirmingId === s.id ? 'Emin misin?' : 'Sil'}
          </button>
        </div>
      ))}
    </div>
  )
}
// Süper admin için: hangi işletmenin denemesinin ne zaman dolacağını/dolduğunu gösterir,
// ödeme onaylandığında tek tıkla 7 veya 30 gün uzatma imkanı sunar.
function SubscriptionManager({ users, branches, onExtend, onGrantUnlimited }) {
  const [busyId, setBusyId] = useState(null)
  function branchNameFor(id) { return (branches.find(b => b.id === id) || {}).name || '—' }

  // Hesap oluşturulurken seçilen izin şablonuna göre rol "staff" da olabildiği için
  // burada rol filtresi kullanmıyoruz. Böylece deneme süresi biten hiçbir müşteri
  // abonelik ekranından kaybolmaz; sistem sahibinin hesabı ise listelenmez.
  const billable = users.filter(u => u.role !== 'super_admin')
    .sort((a, b) => {
      const aEnd = a.trial_ends_at ? new Date(a.trial_ends_at).getTime() : Infinity
      const bEnd = b.trial_ends_at ? new Date(b.trial_ends_at).getTime() : Infinity
      return aEnd - bEnd
    })

  return (
    <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 14, padding: '1.25rem', marginBottom: 20 }}>
      <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>💳 Abonelik Yönetimi</p>
      <p style={{ fontSize: 12.5, color: T.textSoft, margin: '0 0 14px' }}>Ödeme bildirimi geldiğinde ilgili işletmenin süresini uzat.</p>
      {billable.length === 0 && <p style={{ fontSize: 13, color: T.textSoft }}>Henüz faturalandırılan bir hesap yok.</p>}
      {billable.map(u => {
        const isExpired = u.is_trial && u.trial_ends_at && new Date(u.trial_ends_at) < new Date()
        const isUnlimited = !u.is_trial
        return (
          <div key={u.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
            padding: '11px 0', borderTop: `1px solid ${T.border}`,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{branchNameFor(u.branch_id)}</div>
              <div style={{ fontSize: 12, color: T.textSoft, marginTop: 2 }}>
                {u.full_name || u.email}
                {isUnlimited && <span style={{ marginLeft: 8, color: '#1FAA6D', fontWeight: 600 }}>· Sınırsız erişim</span>}
                {!isUnlimited && u.trial_ends_at && (
                  <span style={{ marginLeft: 8, color: isExpired ? '#E5615F' : T.textSoft, fontWeight: isExpired ? 700 : 400 }}>
                    · {isExpired ? 'Süresi doldu: ' : 'Bitiş: '}{new Date(u.trial_ends_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
            {!isUnlimited && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => { setBusyId(u.id); await onExtend(u.id, 7); setBusyId(null) }}
                  disabled={busyId === u.id} style={{
                    fontSize: 12.5, fontWeight: 700, color: '#7C5CFC', background: '#fff', border: `1px solid ${T.primary}`,
                    borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
                  }}>
                  {busyId === u.id ? '...' : '+7 Gün Uzat'}
                </button>
                <button onClick={async () => { setBusyId(u.id); await onExtend(u.id, 30); setBusyId(null) }}
                  disabled={busyId === u.id} style={{
                    fontSize: 12.5, fontWeight: 700, color: '#fff', background: '#7C5CFC', border: 'none',
                    borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
                  }}>
                  {busyId === u.id ? '...' : '+30 Gün Uzat'}
                </button>
                <button onClick={async () => { setBusyId(u.id); await onGrantUnlimited(u.id); setBusyId(null) }}
                  disabled={busyId === u.id} style={{
                    fontSize: 12.5, fontWeight: 600, color: T.textSoft, background: '#fff', border: `1px solid ${T.border}`,
                    borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
                  }}>Sınırsız Yap</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}


function UserManagement({ users, onToggle, onAdd, onDelete, onChangePassword, onChangeName, onChangeEmail, branches, templates, isMobile, currentUserId, isSuperAdmin }) {
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newBranchId, setNewBranchId] = useState(branches[0]?.id || '')
  const [newTemplateId, setNewTemplateId] = useState('')
  const [newTrialDays, setNewTrialDays] = useState(7)
  const [addErr, setAddErr] = useState('')
  const [editingPwFor, setEditingPwFor] = useState(null)
  const [editingNameFor, setEditingNameFor] = useState(null)
  const [nameValue, setNameValue] = useState('')
  const [editingEmailFor, setEditingEmailFor] = useState(null)
  const [emailValue, setEmailValue] = useState('')
  const [confirmingDeleteFor, setConfirmingDeleteFor] = useState(null)

  const nonSuperAdminTemplates = (templates || []).filter(t => t.id !== 'tpl_super_admin')

  async function submitAdd(e) {
    e.preventDefault()
    setAddErr('')
    if (!newEmail.trim() || !newPassword.trim() || !newBranchId || !newTemplateId) {
      setAddErr('Tüm alanları doldurun.')
      return
    }
    if (users.some(u => u.email?.toLowerCase() === newEmail.trim().toLowerCase())) {
      setAddErr('Bu e-posta zaten kullanılıyor.')
      return
    }
    try {
      await onAdd({ email: newEmail.trim(), password: newPassword.trim(), full_name: newFullName.trim() || null, branch_id: newBranchId, permission_template_id: newTemplateId, active: true, trial_days: newTrialDays })
      setNewEmail(''); setNewPassword(''); setNewFullName('')
    } catch (err) {
      setAddErr(err.message || 'Kullanıcı oluşturulamadı, lütfen tekrar deneyin.')
    }
  }

  async function submitPasswordChange(userId) {
    await onChangePassword(userId)
    setEditingPwFor(null)
  }

  async function submitNameChange(userId) {
    const trimmed = nameValue.trim()
    if (!trimmed) return
    await onChangeName(userId, trimmed)
    setEditingNameFor(null); setNameValue('')
  }

  async function submitEmailChange(userId) {
    const trimmed = emailValue.trim()
    await onChangeEmail(userId, trimmed)
    setEditingEmailFor(null); setEmailValue('')
  }

  async function handleDelete(userId) {
    if (confirmingDeleteFor !== userId) { setConfirmingDeleteFor(userId); return }
    await onDelete(userId)
    setConfirmingDeleteFor(null)
  }

  return (
    <div style={{ background: T.card, border: '1px solid #e2e2e2', borderRadius: 12, padding: isMobile ? '1rem' : '1.25rem', marginTop: isMobile ? '1rem' : '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>Erişim yönetimi</p>
      <p style={{ fontSize: 13, color: T.textSoft, margin: '0 0 12px' }}>Ödeme alınmazsa ilgili şubenin erişimini buradan askıya alabilirsin.</p>

      {users.map(u => {
        const branch = branches.find(b => b.id === u.branch_id)
        const tplName = (templates || []).find(t => t.id === u.permission_template_id)?.name || u.role
        const isSelf = u.id === currentUserId
        return (
          <div key={u.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 8 : 0 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{u.full_name || u.email}{isSelf && <span style={{ color: T.primary, fontWeight: 500 }}> (sen)</span>}</p>
                <p style={{ margin: 0, fontSize: 12, color: T.textSoft }}>{tplName} · {branch ? branch.name : '—'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: T.textFaint }}>{u.email}</p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                <button onClick={() => { setEditingPwFor(editingPwFor === u.id ? null : u.id); setEditingNameFor(null); setEditingEmailFor(null) }}
                  style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: '#6C5CE7', cursor: 'pointer', fontWeight: 500 }}>
                  Şifre sıfırla
                </button>
                <button onClick={() => { setEditingNameFor(editingNameFor === u.id ? null : u.id); setNameValue(u.full_name || ''); setEditingPwFor(null); setEditingEmailFor(null) }}
                  style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: '#6C5CE7', cursor: 'pointer', fontWeight: 500 }}>
                  Ad değiştir
                </button>
                <button onClick={() => { setEditingEmailFor(editingEmailFor === u.id ? null : u.id); setEmailValue(u.email || ''); setEditingPwFor(null); setEditingNameFor(null) }}
                  style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: '#6C5CE7', cursor: 'pointer', fontWeight: 500 }}>
                  E-posta düzenle
                </button>
                {!isSelf && (
                  <>
                    <button onClick={() => onToggle(u.id, u.active)} style={{
                      fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                      border: u.active === false ? '1px solid #2e7d32' : '1px solid #c0392b',
                      background: u.active === false ? '#2e7d32' : '#c0392b',
                      color: '#fff'
                    }}>
                      {u.active === false ? 'Erişimi aç' : 'Erişimi askıya al'}
                    </button>
                    <button onClick={() => handleDelete(u.id)} style={{
                      fontSize: 12, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                      border: confirmingDeleteFor === u.id ? '1px solid #c0392b' : '1px solid #ddd',
                      background: confirmingDeleteFor === u.id ? '#c0392b' : '#fff',
                      color: confirmingDeleteFor === u.id ? '#fff' : '#999'
                    }}>
                      {confirmingDeleteFor === u.id ? 'Emin misin?' : 'Sil'}
                    </button>
                  </>
                )}
              </div>
            </div>
            {editingPwFor === u.id && (
              <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: T.cardSoft, fontSize: 13, color: T.textSoft }}>
                Kullanıcıya şifre sıfırlama e-postası gönderilsin mi?
                <button onClick={() => submitPasswordChange(u.id)} style={{ marginLeft: 10, padding: '5px 12px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 }}>Mail gönder</button>
              </div>
            )}
            {editingEmailFor === u.id && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input type="email" placeholder="ornek@mail.com" value={emailValue} onChange={e => setEmailValue(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => submitEmailChange(u.id)} style={{ padding: '8px 14px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Kaydet</button>
              </div>
            )}
            {editingNameFor === u.id && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input type="text" placeholder="Ad Soyad" value={nameValue} onChange={e => setNameValue(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => submitNameChange(u.id)} style={{ padding: '8px 14px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Kaydet</button>
              </div>
            )}
          </div>
        )
      })}

      {isSuperAdmin && (
      <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #eee' }}>
        <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 10px' }}>Yeni kullanıcı ekle</p>
        <form onSubmit={submitAdd}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input type="email" placeholder="E-posta (zorunlu)" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={inputStyle} />
            <input placeholder="Geçici şifre" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
          </div>
          <input type="text" placeholder="Ad Soyad (isteğe bağlı)" value={newFullName} onChange={e => setNewFullName(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: 10 }} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <select value={newBranchId} onChange={e => setNewBranchId(e.target.value)} style={inputStyle}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={newTemplateId} onChange={e => setNewTemplateId(e.target.value)} style={inputStyle}>
              <option value="">İzin şablonu seç...</option>
              {nonSuperAdminTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {isSuperAdmin && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: T.textSoft, fontWeight: 600, display: 'block', marginBottom: 4 }}>Deneme Süresi</label>
              <select value={newTrialDays} onChange={e => setNewTrialDays(Number(e.target.value))} style={{ ...inputStyle, maxWidth: 220 }}>
                <option value={7}>7 gün (varsayılan)</option>
                <option value={14}>14 gün</option>
                <option value={30}>30 gün</option>
              </select>
            </div>
          )}
          {addErr && <p style={{ fontSize: 12, color: '#c0392b', margin: '0 0 10px' }}>{addErr}</p>}
          <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer' }}>Kullanıcı ekle</button>
        </form>
      </div>
      )}
      {!isSuperAdmin && (
        <p style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #eee', fontSize: 12.5, color: T.textSoft }}>
          Yeni personel eklemek için lütfen bizimle WhatsApp üzerinden iletişime geçin.
        </p>
      )}
    </div>
  )
}

function ChartLegend({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8, fontSize: 12, color: T.textSoft }}>
      {items.map(it => (
        <span key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: it.color }} />{it.label}
        </span>
      ))}
    </div>
  )
}

function ResultBarChart({ leads }) {
  const ref = useRef(null)
  const chartRef = useRef(null)
  const counts = useMemo(() => { const c = {}; RESULTS.forEach(r => c[r] = 0); leads.forEach(l => { if (c[l.result] !== undefined) c[l.result]++ }); return c }, [leads])
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: { labels: RESULTS, datasets: [{ label: 'Lead sayısı', data: RESULTS.map(r => counts[r]), backgroundColor: RESULTS.map(r => RESULT_HEX[r]) }] },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { ticks: { font: { size: 12 } } } }
      }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [counts])
  return <div style={{ position: 'relative', width: '100%', height: 240 }}><canvas ref={ref} /></div>
}

function ChannelPieChart({ leads }) {
  const ref = useRef(null)
  const chartRef = useRef(null)
  const counts = useMemo(() => { const c = {}; CHANNELS.forEach(ch => c[ch] = 0); leads.forEach(l => { if (c[l.channel] !== undefined) c[l.channel]++ }); return c }, [leads])
  const total = CHANNELS.reduce((s, c) => s + counts[c], 0)
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'doughnut',
      data: { labels: CHANNELS, datasets: [{ data: CHANNELS.map(c => counts[c]), backgroundColor: CHANNELS.map(c => CHANNEL_HEX[c]) }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [counts])
  const legendItems = CHANNELS.map(c => ({ label: `${c} ${total ? Math.round((counts[c] / total) * 100) : 0}%`, color: CHANNEL_HEX[c] }))
  return (
    <div>
      <ChartLegend items={legendItems} />
      <div style={{ position: 'relative', width: '100%', height: 220 }}><canvas ref={ref} /></div>
    </div>
  )
}

function RevenueByServiceChart({ leads, services }) {
  const ref = useRef(null)
  const chartRef = useRef(null)
  const serviceNames = useMemo(() => {
    const configured = (services || []).map(service => service.name)
    const usedInPeriod = leads.map(lead => lead.service).filter(Boolean)
    return [...new Set([...configured, ...usedInPeriod])]
  }, [services, leads])
  const sums = useMemo(() => {
    const s = {}; serviceNames.forEach(sv => s[sv] = 0)
    leads.forEach(l => { if (l.result === 'Müşteri oldu' && l.sale_amount != null && s[l.service] !== undefined) s[l.service] += Number(l.sale_amount) })
    return s
  }, [leads, serviceNames])
  useEffect(() => {
    if (serviceNames.length === 0) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: { labels: serviceNames, datasets: [{ label: 'Ciro (TL)', data: serviceNames.map(s => sums[s]), backgroundColor: serviceNames.map((_, i) => SERVICE_COLOR_PALETTE[i % SERVICE_COLOR_PALETTE.length]) }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [sums, serviceNames])
  if (serviceNames.length === 0) return <p style={{ fontSize: 13, color: T.textSoft }}>Bu dönem için hizmet bazında ciro verisi yok.</p>
  return <div style={{ position: 'relative', width: '100%', height: 200 }}><canvas ref={ref} /></div>
}

function calendarDayKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function buildMessageMatch(adsData, leads) {
  const messagesByDay = new Map()
  const recordsByDay = new Map()

  adsData.forEach(ad => {
    const day = calendarDayKey(ad.date)
    if (!day) return
    const current = messagesByDay.get(day) || { messages: 0, manualAdjustment: 0 }
    current.messages += Number(ad.messages) || 0
    current.manualAdjustment += Number(ad.manual_adjustment) || 0
    messagesByDay.set(day, current)
  })

  leads.forEach(lead => {
    const day = calendarDayKey(lead.date)
    if (!day) return
    recordsByDay.set(day, (recordsByDay.get(day) || 0) + 1)
  })

  const rows = [...messagesByDay.entries()].map(([day, meta]) => {
    const records = recordsByDay.get(day) || 0
    const adjustedRecords = records + meta.manualAdjustment
    const matched = Math.min(meta.messages, adjustedRecords)
    const missing = Math.max(0, meta.messages - adjustedRecords)
    const coverage = meta.messages > 0 ? Math.min(100, Math.round((adjustedRecords / meta.messages) * 100)) : 100
    return { day, messages: meta.messages, records, manualAdjustment: meta.manualAdjustment, matched, missing, coverage }
  }).sort((a, b) => b.day.localeCompare(a.day))

  const messages = rows.reduce((sum, row) => sum + row.messages, 0)
  const records = rows.reduce((sum, row) => sum + row.records + row.manualAdjustment, 0)
  const matched = rows.reduce((sum, row) => sum + row.matched, 0)
  const missing = rows.reduce((sum, row) => sum + row.missing, 0)
  const coverage = messages > 0 ? Math.round((matched / messages) * 100) : 100
  return { rows, messages, records, matched, missing, coverage, issues: rows.filter(row => row.missing > 0) }
}

function MessageMatchReport({ audit }) {
  if (!audit || audit.rows.length === 0) return null
  const coverageColor = audit.coverage >= 90 ? T.green : audit.coverage >= 70 ? T.orange : '#E5615F'

  return (
    <div style={{ ...cardStyle, padding: '1.25rem', marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <p style={{ fontWeight: 750, fontSize: 16, color: T.text, margin: '0 0 4px' }}>Kayıt kontrolü</p>
          <p style={{ fontSize: 12.5, color: T.textSoft, margin: 0 }}>Meta mesajları ile aynı gün sisteme girilen danışan kayıtları karşılaştırılır.</p>
        </div>
        <span style={{ padding: '6px 10px', borderRadius: 999, background: audit.missing > 0 ? '#FFF1F0' : '#EAF8F0', color: audit.missing > 0 ? '#C2413B' : T.green, fontSize: 12, fontWeight: 750 }}>
          {audit.missing > 0 ? `${audit.missing} kayıt kontrol bekliyor` : 'Kayıtlar uyumlu'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: audit.issues.length ? 16 : 0 }}>
        {[
          ['Meta mesaj', audit.messages, T.primary],
          ['Sisteme girilen', audit.records, T.text],
          ['Eksik kayıt', audit.missing, audit.missing > 0 ? '#E5615F' : T.green],
          ['Kayıt oranı', `%${audit.coverage}`, coverageColor],
        ].map(([label, value, color]) => (
          <div key={label} style={{ border: `1px solid ${T.border}`, background: '#FCFCFD', borderRadius: 11, padding: '11px 12px' }}>
            <div style={{ fontSize: 11, color: T.textSoft, fontWeight: 700 }}>{label}</div>
            <div style={{ color, fontWeight: 800, fontSize: 22, marginTop: 3 }}>{value}</div>
          </div>
        ))}
      </div>

      {audit.issues.length > 0 && (
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
          <p style={{ fontSize: 12, color: T.textSoft, fontWeight: 700, margin: '8px 0 4px' }}>KONTROL GEREKTİREN GÜNLER</p>
          {audit.issues.slice(0, 5).map(row => (
            <div key={row.day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
              <span style={{ color: T.text, fontWeight: 700 }}>{new Date(`${row.day}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</span>
              <span style={{ color: T.textSoft, textAlign: 'right' }}>Meta: {row.messages} · Kayıt: {row.records}{row.manualAdjustment ? ` (+${row.manualAdjustment} manuel)` : ''}</span>
              <span style={{ color: '#D64545', fontWeight: 750, whiteSpace: 'nowrap' }}>{row.missing} eksik</span>
            </div>
          ))}
          {audit.issues.length > 5 && <p style={{ fontSize: 12, color: T.textSoft, margin: '10px 0 0' }}>Ayrıca {audit.issues.length - 5} gün daha kontrol gerektiriyor.</p>}
        </div>
      )}
    </div>
  )
}

function dateInputValue(date) {
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function ReportMetricCard({ icon, label, value, detail, color }) {
  return (
    <div style={{ ...cardStyle, padding: '14px 15px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, color: T.textSoft, fontWeight: 750 }}>{label}</span>
        <span style={{ width: 29, height: 29, display: 'grid', placeItems: 'center', borderRadius: 9, background: `${color}16`, color }}>{icon}</span>
      </div>
      <div style={{ color: T.text, fontWeight: 800, fontSize: 22, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      <div style={{ color: T.textFaint, fontSize: 11.5, marginTop: 5, minHeight: 15 }}>{detail}</div>
    </div>
  )
}

function ReportFunnel({ metrics }) {
  const stages = [
    { label: 'Meta mesaj', value: metrics.messages, color: '#7C5CFC' },
    { label: 'Sistem kaydı', value: metrics.records, color: '#4D8CE3' },
    { label: 'Randevu', value: metrics.appointments, color: '#E5A536' },
    { label: 'Müşteri oldu', value: metrics.sales, color: T.green },
  ]
  const maxValue = Math.max(...stages.map(stage => stage.value), 1)

  return (
    <div>
      <p style={{ fontSize: 14, color: T.text, margin: '0 0 4px', fontWeight: 750 }}>Satış hunisi</p>
      <p style={{ fontSize: 12, color: T.textSoft, margin: '0 0 16px' }}>Mesajdan satışa kadar seçili dönem görünümü.</p>
      <div style={{ display: 'grid', gap: 13 }}>
        {stages.map(stage => (
          <div key={stage.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, marginBottom: 6 }}>
              <span style={{ color: T.textSoft, fontWeight: 650 }}>{stage.label}</span>
              <span style={{ color: T.text, fontWeight: 800 }}>{stage.value}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: '#EEF0F5', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(4, (stage.value / maxValue) * 100)}%`, borderRadius: 'inherit', background: stage.color, transition: 'width .25s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReportsDashboard({ leads, adsData, services, isMobile, canExport, branchName, showBranch }) {
  const now = new Date()
  const [range, setRange] = useState('this_month')
  const [customStart, setCustomStart] = useState(() => dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [customEnd, setCustomEnd] = useState(() => dateInputValue(now))

  const period = useMemo(() => {
    const today = new Date()
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastThirtyStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)
    const formatted = (start, end) => {
      const lastIncludedDay = new Date(end.getTime() - 1)
      const sameMonth = start.getFullYear() === lastIncludedDay.getFullYear() && start.getMonth() === lastIncludedDay.getMonth()
      if (sameMonth) return `${start.getDate()}–${lastIncludedDay.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`
      return `${start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – ${lastIncludedDay.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
    if (range === 'last_month') return { start: previousMonthStart, end: previousMonthEnd, label: previousMonthStart.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) }
    if (range === 'last_30') return { start: lastThirtyStart, end: endOfToday, label: 'Son 30 gün' }
    if (range === 'custom') {
      const start = customStart ? new Date(`${customStart}T00:00:00`) : monthStart
      const end = customEnd ? new Date(`${customEnd}T00:00:00`) : endOfToday
      const safeEnd = end >= start ? new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1) : endOfToday
      return { start, end: safeEnd, label: formatted(start, safeEnd) }
    }
    return { start: monthStart, end: endOfToday, label: today.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) }
  }, [range, customStart, customEnd])

  const isInPeriod = (value) => {
    const date = new Date(value)
    return !Number.isNaN(date.getTime()) && date >= period.start && date < period.end
  }
  const periodLeads = useMemo(() => leads.filter(lead => isInPeriod(lead.date)), [leads, period])
  const periodAds = useMemo(() => adsData.filter(ad => isInPeriod(ad.date)), [adsData, period])
  const messageAudit = useMemo(() => buildMessageMatch(periodAds, periodLeads), [periodAds, periodLeads])

  const metrics = useMemo(() => {
    const spend = periodAds.reduce((sum, ad) => sum + (Number(ad.spend) || 0), 0)
    const messages = periodAds.reduce((sum, ad) => sum + (Number(ad.messages) || 0), 0)
    const appointments = periodLeads.filter(lead => lead.appointment_at || lead.result === 'Randevu aldı').length
    const sales = periodLeads.filter(lead => lead.result === 'Müşteri oldu')
    const revenue = sales.reduce((sum, lead) => sum + (Number(lead.sale_amount) || 0), 0)
    return { spend, messages, records: periodLeads.length, appointments, sales: sales.length, revenue, roas: spend > 0 ? (revenue / spend).toFixed(1) : '—' }
  }, [periodAds, periodLeads])

  const insights = useMemo(() => {
    const servicesByRevenue = {}
    periodLeads.filter(lead => lead.result === 'Müşteri oldu').forEach(lead => {
      const service = lead.service || 'Belirtilmemiş'
      servicesByRevenue[service] = (servicesByRevenue[service] || 0) + (Number(lead.sale_amount) || 0)
    })
    const [topService, topRevenue] = Object.entries(servicesByRevenue).sort((a, b) => b[1] - a[1])[0] || []
    const channelsByMessages = {}
    periodAds.forEach(ad => { channelsByMessages[ad.channel || 'Meta'] = (channelsByMessages[ad.channel || 'Meta'] || 0) + (Number(ad.messages) || 0) })
    const [topChannel, topMessages] = Object.entries(channelsByMessages).sort((a, b) => b[1] - a[1])[0] || []
    return { topService, topRevenue, topChannel, topMessages }
  }, [periodLeads, periodAds])

  const optionStyle = (active) => ({
    border: `1px solid ${active ? T.primary : T.border}`, background: active ? T.primaryLight : '#fff', color: active ? T.primary : T.textSoft,
    borderRadius: 9, padding: '8px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
  })
  const visibleServices = useMemo(() => {
    const configured = (services || []).map(service => service.name)
    const used = periodLeads.map(lead => lead.service).filter(Boolean)
    return [...new Set([...configured, ...used])].map(name => ({ name }))
  }, [services, periodLeads])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, color: T.text, margin: '0 0 5px' }}>Raporlar</h1>
          <p style={{ margin: 0, color: T.textSoft, fontSize: 13.5 }}>Reklam, randevu ve satış sonuçlarının tek ekrandaki özeti.</p>
        </div>
        {canExport && <ExportButtons rows={leadsToExportRows(periodLeads, branchName, showBranch)} baseFilename={`rapor-${dateInputValue(new Date())}`} sheetName="Rapor" />}
      </div>

      <div style={{ ...cardStyle, padding: '12px', marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        {[
          ['this_month', 'Bu ay'], ['last_month', 'Geçen ay'], ['last_30', 'Son 30 gün'], ['custom', 'Özel tarih'],
        ].map(([key, label]) => <button type="button" key={key} onClick={() => setRange(key)} style={optionStyle(range === key)}>{label}</button>)}
        {range === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginLeft: 2 }}>
            <input aria-label="Başlangıç tarihi" type="date" value={customStart} onChange={event => setCustomStart(event.target.value)} style={{ ...inputStyle, padding: '7px 9px', fontSize: 12 }} />
            <span style={{ color: T.textFaint, fontSize: 12 }}>—</span>
            <input aria-label="Bitiş tarihi" type="date" value={customEnd} onChange={event => setCustomEnd(event.target.value)} style={{ ...inputStyle, padding: '7px 9px', fontSize: 12 }} />
          </div>
        )}
        <span style={{ marginLeft: 'auto', color: T.textFaint, fontSize: 12, fontWeight: 650 }}>{period.label}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(6, minmax(0, 1fr))', gap: 11, marginBottom: 16 }}>
        <ReportMetricCard icon={<Wallet size={15} />} label="Reklam harcaması" value={fmtTL(metrics.spend)} detail="Seçilen dönem" color={T.primary} />
        <ReportMetricCard icon={<MessageCircle size={15} />} label="Meta mesaj" value={metrics.messages} detail="Reklam kaynaklı" color="#8B5CF6" />
        <ReportMetricCard icon={<CalendarDays size={15} />} label="Randevu" value={metrics.appointments} detail={`${metrics.records} sistem kaydı`} color="#E5A536" />
        <ReportMetricCard icon={<ShoppingCart size={15} />} label="Satış" value={metrics.sales} detail="Müşteri oldu" color={T.green} />
        <ReportMetricCard icon={<TrendingUp size={15} />} label="Ciro" value={fmtTL(metrics.revenue)} detail="Gerçekleşen satış" color="#2F7FD1" />
        <ReportMetricCard icon={<Megaphone size={15} />} label="ROAS" value={metrics.roas === '—' ? '—' : `${metrics.roas}x`} detail="Ciro / reklam harcaması" color="#A66B17" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '0.9fr 1.1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ ...cardStyle, padding: '1.15rem' }}><ReportFunnel metrics={metrics} /></div>
        <div style={{ ...cardStyle, padding: '1.15rem' }}>
          <p style={{ fontSize: 14, color: T.text, margin: '0 0 4px', fontWeight: 750 }}>Dönem özeti</p>
          <p style={{ fontSize: 12, color: T.textSoft, margin: '0 0 16px' }}>Öne çıkan performans ve takip edilmesi gereken konu.</p>
          <div style={{ display: 'grid', gap: 13 }}>
            <div><div style={{ color: T.textFaint, fontSize: 11, fontWeight: 700 }}>EN ÇOK CİRO GETİREN HİZMET</div><div style={{ color: T.text, fontWeight: 750, fontSize: 14, marginTop: 3 }}>{insights.topService ? `${insights.topService} · ${fmtTL(insights.topRevenue)}` : 'Bu dönemde satış kaydı yok'}</div></div>
            <div><div style={{ color: T.textFaint, fontSize: 11, fontWeight: 700 }}>EN ÇOK MESAJ GETİREN KANAL</div><div style={{ color: T.text, fontWeight: 750, fontSize: 14, marginTop: 3 }}>{insights.topChannel ? `${insights.topChannel} · ${insights.topMessages} mesaj` : 'Bu dönemde reklam mesajı yok'}</div></div>
            <div style={{ padding: '10px 11px', borderRadius: 10, background: messageAudit.missing > 0 ? '#FFF5F3' : '#F0FAF5', color: messageAudit.missing > 0 ? '#BD3D37' : T.green, fontSize: 12.5, fontWeight: 700 }}>
              {messageAudit.missing > 0 ? `${messageAudit.missing} Meta mesajının sistem kaydı kontrol edilmeli.` : 'Meta mesajları ile sistem kayıtları bu dönemde uyumlu.'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: (periodAds.length > 0 && !isMobile) ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div style={{ ...cardStyle, padding: '1.15rem' }}>
          <p style={{ fontSize: 14, color: T.text, margin: '0 0 4px', fontWeight: 750 }}>Hizmete göre ciro</p>
          <p style={{ fontSize: 12, color: T.textSoft, margin: '0 0 12px' }}>Satışa dönüşen hizmetlerin gelir karşılaştırması.</p>
          <RevenueByServiceChart leads={periodLeads} services={visibleServices} />
        </div>
        {periodAds.length > 0 && (
          <div style={{ ...cardStyle, padding: '1.15rem' }}>
            <p style={{ fontSize: 14, color: T.text, margin: '0 0 4px', fontWeight: 750 }}>Günlük reklam harcaması</p>
            <p style={{ fontSize: 12, color: T.textSoft, margin: '0 0 12px' }}>{period.label} içindeki harcama seyri.</p>
            <MonthlySpendChart adsData={periodAds} />
          </div>
        )}
      </div>

      <MessageMatchReport audit={messageAudit} />
    </div>
  )
}

function MonthlySpendChart({ adsData }) {
  const ref = useRef(null)
  const chartRef = useRef(null)
  // Aynı güne ait birden fazla kanal/kayıt varsa grafikte tek günlük tutar olarak göster.
  const sorted = useMemo(() => {
    const byDay = new Map()
    adsData.forEach(ad => {
      const day = calendarDayKey(ad.date)
      if (!day) return
      byDay.set(day, (byDay.get(day) || 0) + (Number(ad.spend) || 0))
    })
    return [...byDay.entries()].map(([day, spend]) => ({ day, spend })).sort((a, b) => a.day.localeCompare(b.day))
  }, [adsData])
  useEffect(() => {
    if (sorted.length === 0) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: {
        labels: sorted.map(w => new Date(`${w.day}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })),
        datasets: [{ label: 'Harcama (TL)', data: sorted.map(w => w.spend), borderColor: '#378ADD', backgroundColor: 'rgba(55,138,221,0.15)', fill: true, tension: 0.3 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [sorted])
  if (sorted.length === 0) return null
  return <div style={{ position: 'relative', width: '100%', height: 220 }}><canvas ref={ref} /></div>
}

function SecurityNotice({ isAdmin }) {
  if (!isAdmin) return null
  return (
    <div style={{ background: '#FAFAFC', borderRadius: 12, padding: '1rem 1.25rem', marginTop: '1.5rem', fontSize: 12, color: T.textSoft }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#222' }}>🔒 Veri koruma durumu</p>
      <p style={{ margin: '2px 0' }}>✓ Toplu dışa aktarma (CSV/Excel indirme) kapalı — sadece görüntüleme</p>
      <p style={{ margin: '2px 0' }}>✓ Telefon numaraları personelden gizli, sadece admin/yönetici görür</p>
      <p style={{ margin: '2px 0' }}>✓ Her şube verisi izole — diğer şubeler birbirini göremez</p>
      <p style={{ margin: '2px 0' }}>✓ Erişim, ödeme durumuna göre anında askıya alınabilir</p>
    </div>
  )
}

const PERMISSION_LABELS = {
  can_see_phone: 'Telefon numarasını görebilir',
  can_see_revenue: 'Ciro / satış tutarını görebilir',
  can_see_all_branches: 'Tüm şubeleri görebilir',
  can_add_lead: 'Lead / görüşme kaydı ekleyebilir',
  can_edit_any_lead: 'Herkesin kaydını düzenleyebilir',
  can_delete_lead: 'Kayıt silebilir',
  can_manage_users: 'Kullanıcı ekleyip çıkarabilir',
  can_manage_branches: 'Şube ekleyip çıkarabilir',
  can_enter_ads_data: 'Haftalık reklam verisi girebilir',
  can_see_calendar: 'Randevu takvimini görebilir',
  can_export_data: 'Müşteri listesini dışa aktarabilir (CSV/Excel)'
}

function PermissionTemplateManager({ isMobile }) {
  const [templates, setTemplates] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [err, setErr] = useState('')
  const [editingNameFor, setEditingNameFor] = useState(null)
  const [nameValue, setNameValue] = useState('')
  const [newTplName, setNewTplName] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('permission_templates').select('*').order('name')
    setTemplates(data || [])
    setLoaded(true)
  }

  async function toggle(tpl, key) {
    setErr('')
    const newValue = !tpl[key]
    setSavingId(tpl.id)
    const { data, error, status } = await supabase.from('permission_templates').update({ [key]: newValue }).eq('id', tpl.id).select()
    if (error) {
      setErr(`Kaydedilemedi (hata): ${error.message} [kod: ${error.code || '-'}]`)
    } else if (data && data.length > 0) {
      setTemplates(prev => prev.map(t => t.id === tpl.id ? data[0] : t))
    } else {
      setErr(`Kaydedilemedi: 0 satır güncellendi (status: ${status}).`)
    }
    setSavingId(null)
  }

  async function submitNameChange(tpl) {
    const trimmed = nameValue.trim()
    if (!trimmed) return
    const { data } = await supabase.from('permission_templates').update({ name: trimmed }).eq('id', tpl.id).select()
    if (data && data.length > 0) setTemplates(prev => prev.map(t => t.id === tpl.id ? data[0] : t))
    setEditingNameFor(null); setNameValue('')
  }

  async function createTemplate(e) {
    e.preventDefault()
    setErr('')
    const trimmed = newTplName.trim()
    if (!trimmed) return
    setCreating(true)
    const newId = 'tpl_' + uid()
    // Yeni şablon, en kısıtlı (hiçbir özel yetki olmayan) haliyle başlar - admin sonra checkbox'larla açar
    const { data, error } = await supabase.from('permission_templates').insert({
      id: newId, name: trimmed,
      can_see_phone: false, can_see_revenue: false, can_see_all_branches: false,
      can_add_lead: true, can_edit_any_lead: false, can_delete_lead: false,
      can_manage_users: false, can_manage_branches: false, can_enter_ads_data: false,
      can_see_calendar: true
    }).select()
    if (error) {
      setErr(`Şablon oluşturulamadı: ${error.message}`)
    } else if (data && data.length > 0) {
      setTemplates(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
      setNewTplName('')
    }
    setCreating(false)
  }

  async function deleteTemplate(tpl) {
    if (confirmingDeleteId !== tpl.id) { setConfirmingDeleteId(tpl.id); return }
    setErr('')
    const { error } = await supabase.from('permission_templates').delete().eq('id', tpl.id)
    if (error) {
      setErr(`Silinemedi: ${error.message}. Bu şablona bağlı kullanıcılar olabilir, önce onları başka bir şablona taşıyın.`)
    } else {
      setTemplates(prev => prev.filter(t => t.id !== tpl.id))
    }
    setConfirmingDeleteId(null)
  }

  if (!loaded) return null

  return (
    <div style={{ background: T.card, border: '1px solid #e2e2e2', borderRadius: 12, padding: isMobile ? '1rem' : '1.25rem', marginTop: isMobile ? '1rem' : '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>İzin şablonları (Süper Admin)</p>
      <p style={{ fontSize: 13, color: T.textSoft, margin: '0 0 14px' }}>Her şablonun hangi yetkilere sahip olduğunu buradan açıp kapatabilirsin. Değişiklik anında tüm o şablona bağlı kullanıcılara uygulanır.</p>
      {err && <p style={{ fontSize: 13, color: '#c0392b', margin: '0 0 14px', fontWeight: 600 }}>{err}</p>}
      {templates.map(tpl => (
        <div key={tpl.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{tpl.name}{savingId === tpl.id ? ' · kaydediliyor...' : ''}</p>
            <button onClick={() => { setEditingNameFor(editingNameFor === tpl.id ? null : tpl.id); setNameValue(tpl.name) }}
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: '#6C5CE7', cursor: 'pointer' }}>
              Adı değiştir
            </button>
            {tpl.id !== 'tpl_super_admin' && (
              <button onClick={() => deleteTemplate(tpl)} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                border: confirmingDeleteId === tpl.id ? '1px solid #c0392b' : '1px solid #ddd',
                background: confirmingDeleteId === tpl.id ? '#c0392b' : '#fff',
                color: confirmingDeleteId === tpl.id ? '#fff' : '#999'
              }}>
                {confirmingDeleteId === tpl.id ? 'Emin misin?' : 'Şablonu sil'}
              </button>
            )}
          </div>
          {editingNameFor === tpl.id && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input type="text" placeholder="Şablon adı" value={nameValue} onChange={e => setNameValue(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => submitNameChange(tpl)} style={{ padding: '8px 14px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Kaydet</button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
            {Object.keys(PERMISSION_LABELS).map(key => (
              <label key={key} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, cursor: 'pointer',
                padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,.02)', border: '1px solid #eee', lineHeight: 1.35
              }}>
                <input type="checkbox" checked={!!tpl[key]} onChange={() => toggle(tpl, key)} style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16 }} />
                <span>{PERMISSION_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 8 }}>
        <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 10px' }}>Yeni izin şablonu oluştur</p>
        <form onSubmit={createTemplate} style={{ display: 'flex', gap: 10 }}>
          <input type="text" placeholder="Şablon adı (örn. Muhasebe, Şube Yöneticisi)" value={newTplName} onChange={e => setNewTplName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <button type="submit" disabled={creating} style={{ padding: '8px 16px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer' }}>
            {creating ? 'Oluşturuluyor...' : 'Oluştur'}
          </button>
        </form>
        <p style={{ fontSize: 11, color: '#888', margin: '6px 0 0' }}>Yeni şablon, en kısıtlı haliyle (yalnızca kayıt ekleme ve takvim görme açık) oluşur. Oluşturduktan sonra yukarıdaki checkbox'larla yetkilerini ayarlayabilirsin.</p>
      </div>
    </div>
  )
}

const NAV_ITEMS = [
  { key: 'overview', label: 'Genel Bakış', icon: <Home size={18} />, show: () => true },
  { key: 'opportunities', label: 'Fırsatlar', icon: <Flame size={18} />, show: () => true },
  { key: 'clients', label: 'Danışanlar', icon: <Users size={18} />, show: () => true },
  { key: 'appointments', label: 'Randevular', icon: <CalendarDays size={18} />, show: perms => perms.can_see_calendar },
  { key: 'reports', label: 'Raporlar', icon: <BarChart3 size={18} />, show: perms => perms.can_see_revenue },
  { key: 'ads', label: 'Reklam Kaynakları', icon: <Megaphone size={18} />, show: perms => perms.can_enter_ads_data },
  { key: 'settings', label: 'Ayarlar', icon: <Settings size={18} />, show: (perms, isSuperAdmin, canSeeOwnDataOnly) => perms.can_manage_users || perms.can_manage_branches || (!isSuperAdmin && !canSeeOwnDataOnly) },
  { key: 'admin', label: 'Yönetim', icon: <ShieldCheck size={18} />, show: (perms, isSuperAdmin) => isSuperAdmin },
]

function SidebarNav({ items, activeTab, onSelect, currentUser, isSuperAdmin, canSeeOwnDataOnly, branchLabel, onLogout, onQuickAction, trialDaysLeft }) {
  return (
    <div style={{
      width: 258, flexShrink: 0, background: T.sidebar, borderRight: 'none',
      minHeight: '100vh', padding: '24px 16px 18px', display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 18px', marginBottom: 14 }}>
        <span style={{
          width: 37, height: 37, borderRadius: 11, background: '#fff',
          color: T.sidebar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17
        }}>M</span>
        <div>
          <p style={{ fontWeight: 800, fontSize: 13, margin: 0, color: T.sidebarText, lineHeight: 1.2, letterSpacing: '0.1em' }}>MÜŞTERİ<br />TAKİP</p>
        </div>
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.075)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 11px', marginBottom: trialDaysLeft != null ? 8 : 16,
        fontSize: 12, color: T.sidebarMuted, fontWeight: 600
      }}>{currentUser.full_name || currentUser.email} · {branchLabel}</div>
      {trialDaysLeft != null && (
        <div style={{
          borderRadius: 10, padding: '8px 11px', marginBottom: 16, fontSize: 11.5, fontWeight: 700,
          background: trialDaysLeft <= 2 ? '#FCEAEA' : '#FCF3E1', color: trialDaysLeft <= 2 ? '#E5615F' : '#E5A536',
        }}>
          {trialDaysLeft > 0 ? `⏰ Deneme süresi: ${trialDaysLeft} gün kaldı` : '⏰ Deneme süresi bugün doluyor'}
        </div>
      )}

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {items.map(item => {
          const active = activeTab === item.key
          return (
            <button key={item.key} onClick={() => onSelect(item.key)} style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10,
              border: active ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent', background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: active ? '#fff' : T.sidebarMuted,
              fontWeight: active ? 600 : 500, fontSize: 14, cursor: 'pointer',
              textAlign: 'left', width: '100%', transition: 'background 0.15s ease'
            }}>
              <span style={{ display: 'flex', opacity: active ? 1 : 0.8 }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {onQuickAction && (
        <div style={{ marginTop: 22 }}>
          <p style={{ fontSize: 10.5, color: '#8190A8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px', fontWeight: 700 }}>Hızlı İşlemler</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <button onClick={() => onQuickAction('clients')} style={quickBtnStyle}><Plus size={14} /> Yeni Görüşme</button>
            <button onClick={() => onQuickAction('appointments')} style={quickBtnStyle}><Plus size={14} /> Randevu Oluştur</button>
            <button onClick={() => onQuickAction('ads')} style={quickBtnStyle}><Plus size={14} /> Reklam Verisi Gir</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 18 }}>
        <button onClick={onLogout} style={{
          width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(237,242,250,0.12)',
          background: 'transparent', color: T.sidebarMuted, fontWeight: 500, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}><LogOut size={14} /> Çıkış yap</button>
        <p style={{ fontSize: 10.5, color: '#8190A8', margin: '14px 0 0', textAlign: 'center' }}>Müşteri Takip v2.0.0</p>
      </div>
    </div>
  )
}

// Mobilde gösterilecek en fazla 4 ana sekme + "Diğer" — toplam 5 slotu aşmaz
const MOBILE_PRIMARY_KEYS = ['overview', 'clients', 'appointments', 'reports']

function BottomTabBar({ items, activeTab, onSelect, onMoreClick, isMoreActive }) {
  const primary = items.filter(i => MOBILE_PRIMARY_KEYS.includes(i.key))
  const overflow = items.filter(i => !MOBILE_PRIMARY_KEYS.includes(i.key))
  const showMore = overflow.length > 0

  const tabBtnStyle = (active) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 3, flex: 1, padding: '7px 2px 9px', border: 'none', background: 'transparent',
    color: active ? T.primary : T.textFaint, fontSize: 10.5, fontWeight: active ? 700 : 500,
    cursor: 'pointer', WebkitTapHighlightColor: 'transparent'
  })

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', background: T.card, borderTop: `1px solid ${T.border}`,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)'
    }}>
      {primary.map(item => {
        const active = activeTab === item.key && !isMoreActive
        return (
          <button key={item.key} onClick={() => onSelect(item.key)} style={tabBtnStyle(active)}>
            <span style={{ display: 'flex', opacity: active ? 1 : 0.85 }}>{item.icon}</span>
            {item.label}
          </button>
        )
      })}
      {showMore && (
        <button onClick={onMoreClick} style={tabBtnStyle(isMoreActive)}>
          <span style={{ display: 'flex', opacity: isMoreActive ? 1 : 0.85 }}><Settings size={18} /></span>
          Diğer
        </button>
      )}
    </nav>
  )
}

function MobileTopBar({ currentUser, branchLabel, onLogout, trialDaysLeft }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 40, display: 'flex', flexDirection: 'column',
      padding: '10px 14px', background: T.card,
      borderBottom: `1px solid ${T.border}`, width: '100%', boxSizing: 'border-box'
    }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${T.primary}, #A78BFA)`,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0
        }}>M</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 13, margin: 0, color: T.text, lineHeight: 1.2 }}>Müşteri Takip</p>
          <p style={{ fontSize: 11, margin: 0, color: T.textSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.full_name || currentUser.email} · {branchLabel}</p>
        </div>
      </div>
      <button onClick={onLogout} style={{
        flexShrink: 0, padding: '7px 9px', borderRadius: 9, border: `1px solid ${T.border}`,
        background: 'transparent', color: T.textSoft, cursor: 'pointer', display: 'flex', alignItems: 'center'
      }}><LogOut size={15} /></button>
    </div>
    {trialDaysLeft != null && (
      <div style={{
        borderRadius: 8, padding: '5px 10px', marginTop: 8, fontSize: 11, fontWeight: 700, display: 'inline-block',
        background: trialDaysLeft <= 2 ? '#FCEAEA' : '#FCF3E1', color: trialDaysLeft <= 2 ? '#E5615F' : '#E5A536',
      }}>
        {trialDaysLeft > 0 ? `⏰ Deneme: ${trialDaysLeft} gün kaldı` : '⏰ Deneme bugün doluyor'}
      </div>
    )}
    </div>
  )
}

function MobileMoreSheet({ items, onSelect, onLogout }) {
  const overflow = items.filter(i => !MOBILE_PRIMARY_KEYS.includes(i.key))
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: '0 0 18px' }}>Diğer</h1>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
        {overflow.map((item, i) => (
          <button key={item.key} onClick={() => onSelect(item.key)} style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px',
            border: 'none', borderBottom: i < overflow.length - 1 ? `1px solid ${T.border}` : 'none',
            background: 'transparent', color: T.text, fontSize: 14.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left'
          }}>
            <span style={{ display: 'flex', color: T.textSoft }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
        <button onClick={onLogout} style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px',
          border: 'none', borderTop: `1px solid ${T.border}`,
          background: 'transparent', color: T.red, fontSize: 14.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left'
        }}>
          <span style={{ display: 'flex' }}><LogOut size={18} /></span>
          Çıkış yap
        </button>
      </div>
      <p style={{ fontSize: 11, color: T.textFaint, margin: '16px 0 0', textAlign: 'center' }}>Müşteri Takip v2.0.0</p>
    </div>
  )
}

function FunnelSection({ stats, isMobile, metaMessages }) {
  const hasMeta = metaMessages != null && metaMessages > 0
  const stages = [
    ...(hasMeta ? [{
      label: 'Meta Mesaj (reklam)',
      value: metaMessages,
      icon: <Megaphone size={20} />,
      color: '#9333EA',
      bg: 'linear-gradient(135deg, rgba(147,51,234,0.34), rgba(147,51,234,0.08))'
    }] : []),
    {
      label: hasMeta ? 'Panele İşlendi' : '1. Mesaj Geldi',
      value: stats.total,
      icon: <MessageCircle size={20} />,
      color: T.primary,
      bg: 'linear-gradient(135deg, rgba(124,92,252,0.38), rgba(124,92,252,0.08))'
    },
    {
      label: '2. Randevu Verildi',
      value: stats.appointed,
      icon: <CalendarDays size={20} />,
      color: T.blue,
      bg: 'linear-gradient(135deg, rgba(59,130,246,0.36), rgba(59,130,246,0.08))'
    },
    {
      label: '3. Geldi',
      value: stats.arrived,
      icon: <UserRound size={20} />,
      color: T.green,
      bg: 'linear-gradient(135deg, rgba(34,197,94,0.32), rgba(34,197,94,0.08))'
    },
    {
      label: '4. Satış Oldu',
      value: stats.customers,
      icon: <ShoppingCart size={20} />,
      color: T.orange,
      bg: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(245,158,11,0.08))'
    },
  ]

  const pctLoggedFromMeta = hasMeta ? (metaMessages ? Math.round((stats.total / metaMessages) * 100) : 0) : null
  const rates = [
    ...(hasMeta ? [pctLoggedFromMeta] : []),
    stats.pctAppointed, stats.pctArrived, stats.pctSold
  ]

  return (
    <div style={{ ...cardStyle, padding: isMobile ? 14 : 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 0, marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: T.text }}>
            Satış Hunisi
          </h2>
          <p style={{ fontSize: 12.5, color: T.textSoft, margin: '4px 0 0' }}>
            Mesajdan satışa kadar müşteri kaybını takip edin.
          </p>
        </div>

        <span style={{
          background: T.greenBg,
          color: T.green,
          border: '1px solid rgba(34,197,94,0.25)',
          padding: '7px 10px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700
        }}>
          Toplam dönüşüm %{stats.rate}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : `repeat(${stages.length}, minmax(0, 1fr))`,
        gap: 12,
        alignItems: 'stretch'
      }}>
        {stages.map((s, i) => (
          <div key={s.label} style={{ position: 'relative' }}>
            <div style={{
              minHeight: isMobile ? 120 : 150,
              borderRadius: 18,
              padding: isMobile ? 14 : 18,
              background: s.bg,
              border: `1px solid ${T.border}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflow: 'hidden'
            }}>
              <div>
                <p style={{
                  fontSize: 12,
                  color: T.textSoft,
                  margin: 0,
                  fontWeight: 700,
                  lineHeight: 1.35
                }}>
                  {s.label}
                </p>

                <p style={{
                  fontSize: isMobile ? 26 : 34,
                  fontWeight: 900,
                  margin: '10px 0 0',
                  color: T.text,
                  letterSpacing: '-0.03em'
                }}>
                  {s.value}
                </p>
              </div>

              <div style={{
                width: isMobile ? 32 : 38,
                height: isMobile ? 32 : 38,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                color: s.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {s.icon}
              </div>
            </div>

            {!isMobile && i < stages.length - 1 && (
              <div style={{
                position: 'absolute',
                right: -22,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 5,
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#08111F',
                border: `1px solid ${T.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.textSoft,
                fontSize: 12,
                fontWeight: 800
              }}>
                %{rates[i]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function LossAnalysis({ stats }) {
  const items = [
    { text: 'Randevu verildi, gelmedi', count: stats.noShowCount, rate: stats.pctNoShow },
    { text: 'Geldi, satın almadı', count: stats.notBoughtCount, rate: stats.pctNotBought },
    { text: 'Cevap alınamadı', count: stats.noResponseCount, rate: stats.pctNoResponse },
  ]
  return (
    <div style={{ ...cardStyle, padding: '1.25rem' }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 16px', color: T.text }}>Kayıp Analizi</h2>
      {items.map((it, i) => (
        <div key={it.text} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0',
          borderBottom: i < items.length - 1 ? `1px solid ${T.border}` : 'none', fontSize: 13.5
        }}>
          <span style={{ color: T.text }}>{it.text}</span>
          <span style={{ color: T.textSoft }}>{it.count} kişi</span>
          <span style={{ color: T.red, fontWeight: 700 }}>%{it.rate}</span>
        </div>
      ))}
    </div>
  )
}

function ChannelDonut({ leads }) {
  const ref = useRef(null)
  const chartRef = useRef(null)
  const data = useMemo(() => {
    const counts = {}
    CHANNELS.forEach(c => counts[c] = 0)
    leads.forEach(l => { if (counts[l.channel] !== undefined) counts[l.channel]++ })
    const total = leads.length || 1
    return CHANNELS.map(c => ({ label: c, count: counts[c], pct: Math.round((counts[c] / total) * 100) }))
  }, [leads])
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'doughnut',
      data: { labels: data.map(d => d.label), datasets: [{ data: data.map(d => d.count), backgroundColor: data.map(d => CHANNEL_HEX[d.label]), borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '68%' }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [data])
  return (
    <div>
      <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}><canvas ref={ref} /></div>
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map(d => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.textSoft }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: CHANNEL_HEX[d.label], flexShrink: 0 }} />
            {d.label} <span style={{ color: T.text, fontWeight: 600 }}>%{d.pct} ({d.count})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthlyTrendChart({ leads }) {
  const ref = useRef(null)
  const chartRef = useRef(null)
  const data = useMemo(() => {
    const byDay = {}
    leads.forEach(l => {
      const day = new Date(l.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
      byDay[day] = (byDay[day] || 0) + 1
    })
    const sortedDays = Object.keys(byDay).sort((a, b) => {
      const [da, ma] = a.split('.'); const [db, mb] = b.split('.')
      return new Date(2026, ma - 1, da) - new Date(2026, mb - 1, db)
    })
    return { labels: sortedDays, values: sortedDays.map(d => byDay[d]) }
  }, [leads])
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    if (data.labels.length === 0) return
    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: { labels: data.labels, datasets: [{ data: data.values, borderColor: T.primary, backgroundColor: 'rgba(124,92,252,0.15)', fill: true, tension: 0.35, pointRadius: 0 }] },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: T.textFaint, maxTicksLimit: 6 }, grid: { display: false } },
          y: { ticks: { color: T.textFaint, precision: 0 }, grid: { color: T.border } }
        }
      }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [data])
  if (data.labels.length === 0) return <p style={{ fontSize: 13, color: T.textSoft }}>Henüz veri yok.</p>
  return <div style={{ position: 'relative', width: '100%', height: 176 }}><canvas ref={ref} /></div>
}

function AdsPerformanceTable({ adsData, leads, isMobile }) {
  const rows = useMemo(() => {
    // Kartın başlığındaki “Bu Ay” ifadesi gerçek bir takvim ayını anlatır.
    // Geçmiş reklam ve danışan kayıtlarını silmeden, yalnızca bu hesaptan hariç tutuyoruz.
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const isThisMonth = (value) => {
      const date = new Date(value)
      return !Number.isNaN(date.getTime()) && date >= monthStart && date < nextMonthStart
    }
    const thisMonthAds = adsData.filter(ad => isThisMonth(ad.date))
    const thisMonthLeads = leads.filter(lead => isThisMonth(lead.date))
    const byChannel = {}
    thisMonthAds.forEach(w => {
      const ch = w.channel || 'Instagram'
      if (!byChannel[ch]) byChannel[ch] = { spend: 0, messages: 0 }
      byChannel[ch].spend += Number(w.spend) || 0
      byChannel[ch].messages += Number(w.messages) || 0
    })
    return Object.keys(byChannel).map(ch => {
      const sales = thisMonthLeads.filter(l => l.channel === ch && l.result === 'Müşteri oldu').length
      const spend = byChannel[ch].spend
      const revenue = thisMonthLeads.filter(l => l.channel === ch && l.result === 'Müşteri oldu').reduce((s, l) => s + (Number(l.sale_amount) || 0), 0)
      const roas = spend > 0 ? (revenue / spend).toFixed(1) : '—'
      return { channel: ch, spend, messages: byChannel[ch].messages, sales, roas }
    }).sort((a, b) => b.spend - a.spend)
  }, [adsData, leads])

  if (rows.length === 0) return <p style={{ fontSize: 13, color: T.textSoft }}>Bu ay için henüz reklam verisi yok.</p>

  if (isMobile) {
    return (
      <div>
        {rows.map(r => (
          <div key={r.channel} style={{ padding: '11px 0', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{r.channel}</span>
              <span style={{ color: r.roas !== '—' && Number(r.roas) >= 2 ? T.green : T.orange, fontWeight: 700, fontSize: 14 }}>{r.roas}{r.roas !== '—' ? 'x ROAS' : ''}</span>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 12, color: T.textSoft }}>
              <span>Harcanan: {fmtTL(r.spend)}</span>
              <span>Mesaj: {r.messages}</span>
              <span>Satış: {r.sales}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.7fr 0.7fr 0.7fr', gap: 6, fontSize: 11.5, color: T.textFaint, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
        <span>KANAL</span><span>HARCANAN</span><span>MESAJ</span><span>SATIŞ</span><span>ROAS</span>
      </div>
      {rows.map(r => (
        <div key={r.channel} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.7fr 0.7fr 0.7fr', gap: 6, padding: '11px 0', borderBottom: `1px solid ${T.border}`, fontSize: 13, alignItems: 'center' }}>
          <span style={{ color: T.text, fontWeight: 600 }}>{r.channel}</span>
          <span style={{ color: T.textSoft }}>{fmtTL(r.spend)}</span>
          <span style={{ color: T.textSoft }}>{r.messages}</span>
          <span style={{ color: T.textSoft }}>{r.sales}</span>
          <span style={{ color: r.roas !== '—' && Number(r.roas) >= 2 ? T.green : T.orange, fontWeight: 700 }}>{r.roas}{r.roas !== '—' ? 'x' : ''}</span>
        </div>
      ))}
    </div>
  )
}

function BranchesOverview({ branches, leads }) {
  const rows = useMemo(() => branches.filter(b => b.active !== false).map(b => {
    const branchLeads = leads.filter(l => l.branch_id === b.id)
    const arrived = branchLeads.filter(l => ['Satın almadı', 'Müşteri oldu'].includes(l.result)).length
    const revenue = branchLeads.filter(l => l.result === 'Müşteri oldu').reduce((s, l) => s + (Number(l.sale_amount) || 0), 0)
    return { name: b.name, arrived, revenue }
  }).sort((a, b) => b.revenue - a.revenue), [branches, leads])

  if (rows.length === 0) return <p style={{ fontSize: 13, color: T.textSoft }}>Henüz şube yok.</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11.5, color: T.textFaint, paddingBottom: 8, borderBottom: `1px solid ${T.border}`, gap: 24 }}>
        <span style={{ width: 70, textAlign: 'right' }}>GELEN</span>
        <span style={{ width: 80, textAlign: 'right' }}>CİRO</span>
      </div>
      {rows.map(r => (
        <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${T.border}`, fontSize: 13.5 }}>
          <span style={{ color: T.text }}>{r.name}</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <span style={{ color: T.textSoft, width: 70, textAlign: 'right' }}>{r.arrived}</span>
            <span style={{ color: T.textSoft, width: 80, textAlign: 'right' }}>{fmtTL(r.revenue)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function RecentLeadsTable({ leads, canSeePhone, showBranch, branchNameFn, isMobile }) {
  const recent = useMemo(() => [...leads].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6), [leads])
  if (recent.length === 0) return <p style={{ fontSize: 13, color: T.textSoft }}>Henüz kayıt yok.</p>

  if (isMobile) {
    return (
      <div>
        {recent.map(l => (
          <div key={l.id} style={{ padding: '11px 0', borderBottom: `1px solid ${T.border}`, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ color: T.text, fontWeight: 600, fontSize: 13.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
              <span style={{ color: T.textFaint, fontSize: 11.5, flexShrink: 0 }}>{new Date(l.date).toLocaleDateString('tr-TR')}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <span style={{ background: T.primaryLight, color: T.primary, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{l.result}</span>
              <span style={{ color: T.textSoft, fontSize: 11.5 }}>{l.channel}{showBranch && ` · ${branchNameFn(l.branch_id)}`}</span>
            </div>
            {l.note && <p style={{ color: T.textSoft, fontSize: 12, margin: '6px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{l.note}</p>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: showBranch ? '1.1fr 0.8fr 1fr 1.4fr 0.8fr 0.9fr' : '1.1fr 0.8fr 1fr 1.6fr 0.8fr', gap: 8, fontSize: 11.5, color: T.textFaint, paddingBottom: 8, borderBottom: `1px solid ${T.border}`, minWidth: 600 }}>
        <span>AD SOYAD</span><span>KAYNAK</span><span>DURUM</span><span>SON NOT</span><span>TARİH</span>{showBranch && <span>ŞUBE</span>}
      </div>
      {recent.map(l => (
        <div key={l.id} style={{ display: 'grid', gridTemplateColumns: showBranch ? '1.1fr 0.8fr 1fr 1.4fr 0.8fr 0.9fr' : '1.1fr 0.8fr 1fr 1.6fr 0.8fr', gap: 8, padding: '12px 0', borderBottom: `1px solid ${T.border}`, fontSize: 13, alignItems: 'center', minWidth: 600 }}>
          <span style={{ color: T.text, fontWeight: 600 }}>{l.name}</span>
          <span style={{ color: T.textSoft }}>{l.channel}</span>
          <span><span style={{ background: T.primaryLight, color: T.primary, padding: '3px 9px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{l.result}</span></span>
          <span style={{ color: T.textSoft, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.note}</span>
          <span style={{ color: T.textFaint, fontSize: 12 }}>{new Date(l.date).toLocaleDateString('tr-TR')}</span>
          {showBranch && <span style={{ color: T.textFaint, fontSize: 12 }}>{branchNameFn(l.branch_id)}</span>}
        </div>
      ))}
    </div>
  )
}

export function PanelApp() {
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])
  const [leads, setLeads] = useState([])
  const [reminderRules, setReminderRules] = useState([])
  const [leadNotes, setLeadNotes] = useState([])
  const [adsData, setAdsData] = useState([])
  const [templates, setTemplates] = useState([])
  const [branchServices, setBranchServices] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientStatusFilter, setClientStatusFilter] = useState('all')
  const [clientSort, setClientSort] = useState('priority')
  const [adsSelectedBranch, setAdsSelectedBranch] = useState('')
  const [filterBranch, setFilterBranchState] = useState(() => {
    try { return localStorage.getItem('mt_filterBranch') || 'all' } catch { return 'all' }
  })
  const setFilterBranch = (val) => {
    setFilterBranchState(val)
    try { localStorage.setItem('mt_filterBranch', val) } catch {}
  }
  const [activeTab, setActiveTab] = useState('overview')
  const isMobile = useIsMobile()
  const [showMobileMore, setShowMobileMore] = useState(false)

  // Her lead için, MEVCUT sonuç kategorisinde kaç not eklendiğini sayar.
  // Sonuç değiştiğinde (örn. Satın almadı -> Randevu aldı), eski kategorideki notlar sayılmaz,
  // sayaç o yeni kategoride sıfırdan başlar - bu yüzden lead_notes.result_at_time ile eşleştiriyoruz.
  // NOT: Bu hook, aşağıdaki early-return'lerden (if !currentUser, if !loaded) ÖNCE tanımlı olmak
  // ZORUNDA - aksi halde render'lar arası hook sayısı değişir ve React #310 hatası fırlatır.
  const noteCountByLeadId = useMemo(() => {
    const map = {}
    const leadById = {}
    leads.forEach(l => { leadById[l.id] = l })

    // Kaydın hayatı boyunca eklenen GERÇEK ilk notu (kronolojik olarak en eski) bulunuyor -
    // sonuç kategorisi sonradan değişse bile, hariç tutulacak olan hep bu tek nottur.
    // Önceki mantık "şu anki kategoride ilk not"u hariç tutuyordu; bu, kategori
    // değiştikten sonra eklenen GERÇEK bir takip notunu da yanlışlıkla "kayıt açma
    // notu" sayıp sıfırlıyordu.
    const earliestNoteIdByLead = {}
    leadNotes.forEach(n => {
      const current = earliestNoteIdByLead[n.lead_id]
      if (!current || new Date(n.created_at) < new Date(current.created_at)) {
        earliestNoteIdByLead[n.lead_id] = n
      }
    })

    leadNotes.forEach(n => {
      const lead = leadById[n.lead_id]
      if (!lead) return
      if (earliestNoteIdByLead[n.lead_id] && earliestNoteIdByLead[n.lead_id].id === n.id) return // gerçek ilk not, sayma
      // result_at_time eski kayıtlarda olmayabilir (migration öncesi); o durumda güvenli tarafta kalıp say.
      if (n.result_at_time && n.result_at_time !== lead.result) return
      map[n.lead_id] = (map[n.lead_id] || 0) + 1
    })
    return map
  }, [leadNotes, leads])

  // branch_id + result -> rule objesi, hızlı erişim için.
  const reminderRuleMap = useMemo(() => {
    const m = {}
    reminderRules.forEach(r => { m[`${r.branch_id}__${r.result}`] = r })
    return m
  }, [reminderRules])
  function getReminderRule(lead) { return reminderRuleMap[`${lead.branch_id}__${lead.result}`] || null }

  async function saveReminderRule(rule) {
    const { data } = await supabase.from('reminder_rules').update({
      day_1: rule.day_1, day_2: rule.day_2, day_3: rule.day_3, cold_after: rule.cold_after,
      updated_at: new Date().toISOString(),
    }).eq('id', rule.id).select()
    if (data) setReminderRules(prev => prev.map(r => r.id === rule.id ? data[0] : r))
  }

  function loginAndPersist(user) {
    setCurrentUser(user)
  }

  async function logoutAndClear() {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setLoaded(false)
  }

  // Supabase Auth session listener - sayfa yenilenince oturumu geri yükler
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('app_users')
          .select('*, permission_templates(*)')
          .eq('id', session.user.id)
          .maybeSingle()
        if (profile && profile.active !== false) {
          setCurrentUser({ ...profile, permissions: profile.permission_templates })
        }
      }
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        setLoaded(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!currentUser) return
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  async function loadAll() {
    setLoaded(false)
    const [b, u, l, a, t, bs, ln, rr] = await Promise.all([
      supabase.from('branches').select('*').order('name'),
      supabase.from('app_users').select('*'),
      supabase.from('leads').select('*').order('date', { ascending: false }),
      supabase.from('ads_data').select('*').order('date', { ascending: false }),
      supabase.from('permission_templates').select('*'),
      supabase.from('branch_services').select('*').order('name'),
      supabase.from('lead_notes').select('*').order('created_at', { ascending: false }),
      supabase.from('reminder_rules').select('*')
    ])
    setBranches(b.data || [])
    setUsers(u.data || [])
    setLeads(l.data || [])
    setAdsData(a.data || [])
    setTemplates(t.data || [])
    setBranchServices(bs.data || [])
    setLeadNotes(ln.data || [])
    setReminderRules(rr.data || [])
    if (b.data && b.data.length > 0) setAdsSelectedBranch(b.data[0].id)
    setLoaded(true)

    // Hesap sonradan askıya alınmışsa otomatik çıkış yap
    if (currentUser) {
      const stillActive = (u.data || []).find(usr => usr.id === currentUser.id)
      if (stillActive && stillActive.active === false) {
        logoutAndClear()
      }
    }
  }

  async function addLead(lead) {
    const { data } = await supabase.from('leads').insert({ ...lead, last_note_at: lead.date }).select()
    if (data) {
      setLeads(prev => [data[0], ...prev])
      if (lead.note && lead.note.trim()) {
        const { data: noteData } = await supabase.from('lead_notes').insert({
          id: uid(), lead_id: lead.id, note: lead.note, created_by: lead.entered_by, created_at: lead.date, result_at_time: lead.result
        }).select()
        if (noteData) setLeadNotes(prev => [noteData[0], ...prev])
      }
    }
  }
  // updated içindeki 'note' alanı her zaman YENİ bir not olarak eklenir (üzerine yazmaz).
  // Diğer alanlar (result, channel, vb.) normal şekilde güncellenir.
  async function updateLead(updated, currentUsername) {
    const { note: newNoteText, ...leadFields } = updated
    const nowIso = new Date().toISOString()
    const hasNewNote = newNoteText && newNoteText.trim()

    const leadPayload = { ...leadFields }
    if (hasNewNote) {
      leadPayload.note = newNoteText
      leadPayload.last_note_at = nowIso
    }

    const { data } = await supabase.from('leads').update(leadPayload).eq('id', updated.id).select()
    if (data) setLeads(prev => prev.map(l => l.id === updated.id ? data[0] : l))

    if (hasNewNote) {
      const { data: noteData } = await supabase.from('lead_notes').insert({
        id: uid(), lead_id: updated.id, note: newNoteText, created_by: currentUsername, created_at: nowIso, result_at_time: updated.result
      }).select()
      if (noteData) setLeadNotes(prev => [noteData[0], ...prev])
    }
    setEditingLead(null)
  }
  async function deleteLead(id) {
    await supabase.from('leads').delete().eq('id', id)
    setLeads(prev => prev.filter(l => l.id !== id))
    setLeadNotes(prev => prev.filter(n => n.lead_id !== id))
    setEditingLead(null)
  }
  async function addAdsWeek(week) {
    const { data } = await supabase.from('ads_data').insert(week).select()
    if (data) setAdsData(prev => [data[0], ...prev])
  }
  async function toggleActive(userId, currentActive) {
    const newActive = currentActive === false ? true : false
    const res = await authenticatedNetlifyFetch('/.netlify/functions/manage-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_active', userId, active: newActive }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Kullanıcı güncellenemedi')
    if (result.user) setUsers(prev => prev.map(u => u.id === userId ? result.user : u))
  }
  // Ödeme bildirimi onaylandığında (WhatsApp/e-posta üzerinden manuel kontrol sonrası),
  // süper admin bu fonksiyonla kullanıcının erişimini seçilen süre kadar uzatır.
  // Mevcut bitiş tarihi hâlâ ileride bir tarihse (erken ödeme yapıldıysa) o tarihten,
  // geçmişte kaldıysa bugünden itibaren 30 gün eklenir.
  async function extendTrial(userId, days) {
    const res = await authenticatedNetlifyFetch('/.netlify/functions/manage-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'extend_trial', userId, days }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Deneme süresi uzatılamadı')
    if (result.user) setUsers(prev => prev.map(u => u.id === userId ? result.user : u))
  }
  // Kalıcı olarak sınırsız erişim tanımak istersen (örn. özel anlaşma), is_trial'ı kapatır.
  async function grantUnlimitedAccess(userId) {
    const res = await authenticatedNetlifyFetch('/.netlify/functions/manage-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'grant_unlimited', userId }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Sınırsız erişim verilemedi')
    if (result.user) setUsers(prev => prev.map(u => u.id === userId ? result.user : u))
  }
  async function addUser(user) {
    // Kullanıcı oluşturma admin API gerektirdiği için (service role key), bu işlem
    // güvenli sunucu tarafında (Netlify Function) yapılıyor, tarayıcıda değil.
    const res = await authenticatedNetlifyFetch('/.netlify/functions/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        full_name: user.full_name,
        branch_id: user.branch_id,
        role: user.role || 'staff',
        permission_template_id: user.permission_template_id,
        trial_days: user.trial_days,
      }),
    })
    const result = await res.json()
    if (!res.ok) {
      throw new Error(result.error || 'Kullanıcı oluşturulamadı')
    }
    if (result.user) setUsers(prev => [...prev, result.user])
    return result
  }
  async function deleteUser(userId) {
    // Hem app_users kaydını hem gerçek Supabase Auth girişini (service role
    // gerektirdiği için Netlify Function üzerinden) tamamen siler.
    const res = await authenticatedNetlifyFetch('/.netlify/functions/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      throw new Error(result.error || 'Kullanıcı silinemedi')
    }
    setUsers(prev => prev.filter(u => u.id !== userId))
  }
  async function changeUserPassword(userId, newPassword) {
    // Supabase Auth üzerinden şifre değiştirme (admin API gerektirir)
    // Şimdilik kullanıcıya şifre sıfırlama maili gönder
    const user = users.find(u => u.id === userId)
    if (user?.email) {
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'https://musteritakip.net/giris',
      })
    }
  }
  async function changeUserEmail(userId, newEmail) {
    const res = await authenticatedNetlifyFetch('/.netlify/functions/manage-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_email', userId, email: newEmail }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'E-posta güncellenemedi')
    if (result.user) setUsers(prev => prev.map(u => u.id === userId ? result.user : u))
  }
  async function changeUserName(userId, newName) {
    const res = await authenticatedNetlifyFetch('/.netlify/functions/manage-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_name', userId, fullName: newName }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Ad soyad güncellenemedi')
    if (result.user) setUsers(prev => prev.map(u => u.id === userId ? result.user : u))
  }
  async function addBranch(branch) {
    const { data } = await supabase.from('branches').insert(branch).select()
    if (data) setBranches(prev => [...prev, data[0]])
  }
  async function toggleBranchActive(id, currentActive) {
    const newActive = currentActive === false ? true : false
    const { data } = await supabase.from('branches').update({ active: newActive }).eq('id', id).select()
    if (data) setBranches(prev => prev.map(b => b.id === id ? data[0] : b))
  }
  async function saveWorkingHours(id, workingHours) {
    const { data } = await supabase.from('branches').update({ working_hours: workingHours }).eq('id', id).select()
    if (data) setBranches(prev => prev.map(b => b.id === id ? data[0] : b))
  }
  // Şubeyi kalıcı olarak siler, ama önce tüm verisini (leads, app_users) arşive kopyalar.
  // Arşivlenen veri geri panelde görünmez ama ileride toplu indirme için Supabase'de saklı kalır.
  async function deleteBranch(id) {
    const branch = branches.find(b => b.id === id)
    if (!branch) return

    const archiveId = uid()
    const branchLeads = leads.filter(l => l.branch_id === id)
    const branchUsers = users.filter(u => u.branch_id === id)

    // 1) Arşiv kaydı oluştur
    await supabase.from('archived_branches').insert({
      id: archiveId, original_branch_id: id, branch_name: branch.name,
    })

    // 2) Leads'i arşive kopyala
    if (branchLeads.length > 0) {
      await supabase.from('archived_leads').insert(
        branchLeads.map(l => ({
          id: uid(), archive_id: archiveId, original_lead_id: l.id,
          name: l.name, phone: l.phone, channel: l.channel, service: l.service,
          note: l.note, result: l.result, sale_amount: l.sale_amount,
          appointment_at: l.appointment_at, entered_by: l.entered_by, date: l.date,
          edited_at: l.edited_at, last_note_at: l.last_note_at,
        }))
      )
    }

    // 3) Kullanıcıları arşive kopyala
    if (branchUsers.length > 0) {
      await supabase.from('archived_app_users').insert(
        branchUsers.map(u => ({
          id: uid(), archive_id: archiveId,
          username: u.full_name || u.email, role: u.role, is_trial: u.is_trial, trial_ends_at: u.trial_ends_at,
        }))
      )
    }

    // 4) Orijinal veriyi sil (leads -> lead_notes cascade ile gider, app_users, branch_services, branch)
    await supabase.from('leads').delete().eq('branch_id', id)
    await supabase.from('app_users').delete().eq('branch_id', id)
    await supabase.from('branch_services').delete().eq('branch_id', id)
    await supabase.from('branches').delete().eq('id', id)

    // 5) Yerel state'i güncelle
    setBranches(prev => prev.filter(b => b.id !== id))
    setLeads(prev => prev.filter(l => l.branch_id !== id))
    setUsers(prev => prev.filter(u => u.branch_id !== id))
    setBranchServices(prev => prev.filter(s => s.branch_id !== id))
  }
  async function addService(service) {
    const { data } = await supabase.from('branch_services').insert(service).select()
    if (data) setBranchServices(prev => [...prev, data[0]])
  }
  async function deleteService(id) {
    await supabase.from('branch_services').delete().eq('id', id)
    setBranchServices(prev => prev.filter(s => s.id !== id))
  }

  if (authLoading) return <p style={{ padding: 40, fontFamily: 'system-ui' }}>Yükleniyor...</p>
  if (!currentUser) return <Login onLogin={loginAndPersist} />
  if (!loaded) return <p style={{ padding: 40, fontFamily: 'system-ui' }}>Yükleniyor...</p>

  // Deneme süresi dolmuşsa panele hiç erişilmesin, sadece bilgi ekranı gösterilsin.
  // Süper admin (sistemin sahibi) hiçbir zaman deneme kilidine takılmaz.
  if (currentUser.role !== 'super_admin' && currentUser.is_trial && currentUser.trial_ends_at && new Date(currentUser.trial_ends_at) < new Date()) {
    const myBranch = branches.find(b => b.id === currentUser.branch_id)
    return <TrialExpired onLogout={logoutAndClear} trialEndsAt={currentUser.trial_ends_at} businessName={myBranch?.name} />
  }

  // Geriye dönük uyumluluk: izin objesi yoksa (eski veri) ya da eksikse (örn. Supabase
  // sütun varsayılanı boş obje döndürüyorsa), role alanına göre varsayılan izinlerle
  // BİRLEŞTİRİLİR — currentUser.permissions'taki her alan varsayılanı ezer, ama
  // permissions objesinde hiç olmayan/undefined alanlar için role varsayılanı kullanılır.
  const roleDefaultPerms = {
    can_see_phone: currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'manager',
    can_see_revenue: currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'manager',
    can_see_all_branches: currentUser.role === 'super_admin',
    can_add_lead: true,
    can_edit_any_lead: currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'manager',
    can_delete_lead: currentUser.role === 'super_admin' || currentUser.role === 'admin',
    can_manage_users: currentUser.role === 'super_admin' || currentUser.role === 'admin',
    can_manage_branches: currentUser.role === 'super_admin' || currentUser.role === 'admin',
    can_enter_ads_data: currentUser.role === 'super_admin' || currentUser.role === 'admin',
    can_edit_reminder_rules: currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'manager',
    can_export_data: currentUser.role === 'super_admin',
    can_see_calendar: true
  }
  const storedPerms = currentUser.permissions || {}
  const perms = { ...roleDefaultPerms }
  Object.keys(roleDefaultPerms).forEach(key => {
    if (storedPerms[key] !== undefined && storedPerms[key] !== null) perms[key] = storedPerms[key]
  })

  const isSuperAdmin = perms.can_see_all_branches && perms.can_manage_users && perms.can_manage_branches
  // "isStaff" artık ayrı bir rol değil - her ekran kendi spesifik iznine bakıyor.
  // canSeeOwnDataOnly: sadece kendi girdiği kaydı görme/listeleme kısıtı, "herkesin kaydını düzenleme" izni yoksa devreye girer
  const canSeeOwnDataOnly = !perms.can_edit_any_lead && !isSuperAdmin

  const relevantBranchId = isSuperAdmin && filterBranch !== 'all' ? filterBranch : currentUser.branch_id
  const currentBranchServices = branchServices.filter(s => s.branch_id === relevantBranchId)
  const activeBranches = branches.filter(b => b.active !== false)

  const scopedLeads = isSuperAdmin ? (filterBranch === 'all' ? leads : leads.filter(l => l.branch_id === filterBranch)) : leads.filter(l => l.branch_id === currentUser.branch_id)
  // Not: Personel artık şubedeki TÜM kayıtları görebiliyor (eskiden sadece kendi girdiğini görürdü).
  // Düzenleme yetkisi hâlâ ayrı kontrol ediliyor (bkz. canEditLead) - görme ve düzenleme farklı izinler.
  const visibleLeads = scopedLeads
  const scopedAds = isSuperAdmin ? (filterBranch === 'all' ? adsData : adsData.filter(a => a.branch_id === filterBranch)) : adsData.filter(a => a.branch_id === currentUser.branch_id)

  // Danışan ekranı için arama, durum filtresi ve öncelikli sıralama. Bu yalnızca
  // ekrandaki görünümü değiştirir; kayıtların kendisine veya raporlara dokunmaz.
  const normalizedClientSearch = clientSearch.trim().toLocaleLowerCase('tr')
  const clientStatusCounts = visibleLeads.reduce((counts, lead) => {
    const status = getAppointmentStatus(lead)
    counts[status] = (counts[status] || 0) + 1
    return counts
  }, {})
  const clientRows = [...visibleLeads]
    .filter(lead => {
      if (clientStatusFilter !== 'all' && getAppointmentStatus(lead) !== clientStatusFilter) return false
      if (!normalizedClientSearch) return true
      return [lead.name, lead.phone, lead.service, lead.channel, lead.note]
        .some(value => String(value || '').toLocaleLowerCase('tr').includes(normalizedClientSearch))
    })
    .sort((a, b) => {
      if (clientSort === 'newest') return new Date(b.date) - new Date(a.date)
      const priority = { needs_result: 0, upcoming: 1, no_show: 2, not_bought: 3, awaiting_reply: 4, customer: 5 }
      const rank = priority[getAppointmentStatus(a)] - priority[getAppointmentStatus(b)]
      if (rank !== 0) return rank
      return new Date(b.appointment_at || b.date) - new Date(a.appointment_at || a.date)
    })

  function canEditLead(lead) {
    if (perms.can_edit_any_lead) return true
    const myName = currentUser.full_name || currentUser.email
    return lead.entered_by === myName
  }
  function canDeleteLead() {
    return !!perms.can_delete_lead
  }
  function branchName(id) { return (branches.find(b => b.id === id) || {}).name || '—' }

  // Genel Bakış'taki her kart, KENDİ olayının gerçekleştiği aya göre sayılır:
  // - "Toplam Mesaj": görüşmenin/kaydın açıldığı ay (date alanı)
  // - "Randevu Verilen / Gelen Müşteri / Satış Olan / Ciro": randevunun/satışın
  //   GERÇEKLEŞTİĞİ ay (appointment_at alanı). Randevu tarihi girilmemişse
  //   (örn. aynı gün doğrudan satış), kaydın kendi tarihine düşer.
  // Böylece Temmuz'da alınıp Ağustos'a verilen bir randevunun satışı,
  // doğru şekilde Ağustos'un performansına yazılır, Temmuz'a değil.
  const now = new Date()
  const isThisMonth = d => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()

  const monthlyLeads = scopedLeads.filter(l => isThisMonth(new Date(l.date)))
  const monthlyByEvent = scopedLeads.filter(l => isThisMonth(new Date(l.appointment_at || l.date)))

  const customers = monthlyByEvent.filter(l => l.result === 'Müşteri oldu')
  const withAmount = customers.filter(l => l.sale_amount != null)
  const revenue = customers.reduce((s, l) => s + (Number(l.sale_amount) || 0), 0)
  const avgTicket = withAmount.length ? Math.round(revenue / withAmount.length) : 0
  const noShow = monthlyByEvent.filter(l => l.result === 'Randevuya gelmedi')
  const notBought = monthlyByEvent.filter(l => l.result === 'Satın almadı')
  const noResponse = monthlyLeads.filter(l => l.result === 'Cevap yazıldı, müşteriden dönüş gelmedi')
  const appointed = monthlyByEvent.filter(l => ['Randevu aldı', 'Randevuya gelmedi', 'Satın almadı', 'Müşteri oldu'].includes(l.result))
  const arrived = monthlyByEvent.filter(l => ['Satın almadı', 'Müşteri oldu'].includes(l.result))
  const stats = {
    total: monthlyLeads.length,
    customers: customers.length,
    ig: monthlyLeads.filter(l => l.channel === 'Instagram').length,
    wa: monthlyLeads.filter(l => l.channel === 'WhatsApp').length,
    organik: monthlyLeads.filter(l => l.channel === 'Organik').length,
    rate: monthlyLeads.length ? Math.round((customers.length / monthlyLeads.length) * 100) : 0,
    revenue, avgTicket, withAmountCount: withAmount.length,
    appointed: appointed.length, arrived: arrived.length,
    noShowCount: noShow.length, notBoughtCount: notBought.length, noResponseCount: noResponse.length,
    pctAppointed: monthlyLeads.length ? Math.round((appointed.length / monthlyLeads.length) * 100) : 0,
    pctArrived: appointed.length ? Math.round((arrived.length / appointed.length) * 100) : 0,
    pctSold: arrived.length ? Math.round((customers.length / arrived.length) * 100) : 0,
    pctNoShow: appointed.length ? Math.round((noShow.length / appointed.length) * 100) : 0,
    pctNotBought: arrived.length ? Math.round((notBought.length / arrived.length) * 100) : 0,
    pctNoResponse: monthlyLeads.length ? Math.round((noResponse.length / monthlyLeads.length) * 100) : 0,
  }
  const totalSpend = scopedAds.reduce((s, w) => s + Number(w.spend), 0)
  const metaMessagesThisMonth = scopedAds
    .filter(w => isThisMonth(new Date(w.date)))
    .reduce((s, w) => s + (Number(w.messages) || 0), 0)

  const visibleNavItems = NAV_ITEMS.filter(item => item.show(perms, isSuperAdmin, canSeeOwnDataOnly))
  const branchLabel = isSuperAdmin ? 'süper admin · tüm şubeler' : `${branchName(currentUser.branch_id)}`
  const trialDaysLeft = (!isSuperAdmin && currentUser.is_trial && currentUser.trial_ends_at)
    ? Math.ceil((new Date(currentUser.trial_ends_at).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div style={{ fontFamily: "'DM Sans', Inter, system-ui, sans-serif", display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: T.bg, minHeight: '100vh', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        html, body { overflow-x: hidden; max-width: 100%; }
        select, input, textarea { font-family: 'Inter', system-ui, sans-serif; max-width: 100%; }
        select option { background: #fff; color: ${T.text}; }
        button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid ${T.primary}; outline-offset: 1px; }
        ::placeholder { color: ${T.textFaint}; }
        img, svg, canvas { max-width: 100%; }
      `}</style>

      {isMobile ? (
        <MobileTopBar currentUser={currentUser} branchLabel={branchLabel} onLogout={logoutAndClear} trialDaysLeft={trialDaysLeft} />
      ) : (
        <SidebarNav items={visibleNavItems} activeTab={activeTab} onSelect={setActiveTab} currentUser={currentUser}
          isSuperAdmin={isSuperAdmin} canSeeOwnDataOnly={canSeeOwnDataOnly} branchLabel={branchLabel} onLogout={logoutAndClear} onQuickAction={(key) => {
            setActiveTab(key)
            if (key === 'clients') { setEditingLead(null); setIsLeadFormOpen(true) }
          }} trialDaysLeft={trialDaysLeft} />
      )}

<div style={getPageWrapStyle(isMobile)} className="page-wrap">
        {isMobile && showMobileMore ? (
          <MobileMoreSheet items={visibleNavItems} onSelect={(key) => { setActiveTab(key); setShowMobileMore(false) }} onLogout={logoutAndClear} />
        ) : (
        <>
        {isSuperAdmin && (
          <div style={{ marginBottom: '1.5rem' }}>
            <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ ...inputStyle, width: isMobile ? '100%' : 240, fontWeight: 600 }}>
              <option value="all">Tüm şubeler (toplu rapor)</option>
              {branches.filter(b => b.active !== false).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {activeTab === 'overview' && (
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Genel Bakış</h1>
            <p style={{ fontSize: 13.5, color: T.textSoft, margin: '0 0 20px' }}>
              {isSuperAdmin && filterBranch === 'all' ? 'Tüm şubeler (toplu rapor)' : branchName(isSuperAdmin ? filterBranch : currentUser.branch_id)}
              {' · '}{now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
            </p>
            <StaleAlerts leads={visibleLeads} canSeePhone={perms.can_see_phone} currentUserName={currentUser.full_name || currentUser.email} isStaff={canSeeOwnDataOnly} noteCountMap={noteCountByLeadId} ruleMap={reminderRuleMap} />

<div style={{
  display: 'grid',
  gridTemplateColumns: perms.can_see_revenue
    ? 'repeat(auto-fit, minmax(180px, 1fr))'
    : 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 14,
  marginBottom: 18
}}>
  {metaMessagesThisMonth > 0 && (
    <StatCard icon={<Megaphone size={20} />} label="Meta Mesaj (reklam)" value={metaMessagesThisMonth} color="purple" />
  )}
  <StatCard icon={<MessageCircle size={20} />} label="Toplam Mesaj" value={stats.total} color="violet" />
              <StatCard icon={<CalendarDays size={20} />} label="Randevu Verilen" value={stats.appointed} color="blue" />
              <StatCard icon={<UserRound size={20} />} label="Gelen Müşteri" value={stats.arrived} color="green" />
              <StatCard icon={<ShoppingCart size={20} />} label="Satış Olan" value={stats.customers} color="amber" />
              {perms.can_see_revenue && (
                <>
                  <StatCard icon={<TrendingUp size={20} />} label="Dönüşüm Oranı" value={`%${stats.rate}`} color="violet" />
                  <StatCard icon={<Wallet size={20} />} label="Toplam Ciro" value={fmtTL(stats.revenue)} color="blue" />
                </>
              )}
            </div>

<div style={{ ...sectionGridStyle, gridTemplateColumns: 'minmax(0, 1fr)' }}>
  <FunnelSection stats={stats} isMobile={isMobile} metaMessages={metaMessagesThisMonth} />
</div>

<div style={{ ...sectionGridStyle, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
  <LossAnalysis stats={stats} />
</div>

<div style={{
  display: 'grid',
  gridTemplateColumns: perms.can_see_revenue
    ? 'repeat(auto-fit, minmax(260px, 1fr))'
    : 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 16,
  marginBottom: 16
}}>              <div style={{ ...cardStyle, padding: '1.1rem' }}>
                <p style={{ fontSize: 14.5, color: T.text, margin: '0 0 14px', fontWeight: 700 }}>Lead Kaynak Dağılımı</p>
                <ChannelDonut leads={scopedLeads} />
              </div>
              <div style={{ ...cardStyle, padding: '1.1rem' }}>
                <p style={{ fontSize: 14.5, color: T.text, margin: '0 0 14px', fontWeight: 700 }}>Aylık Trend</p>
                <MonthlyTrendChart leads={scopedLeads} />
              </div>
              {perms.can_see_revenue && (
                <>
                  <div style={{ ...cardStyle, padding: '1.1rem' }}>
                    <p style={{ fontSize: 14.5, color: T.text, margin: '0 0 14px', fontWeight: 700 }}>Hizmete Göre Ciro</p>
                    <RevenueByServiceChart leads={scopedLeads} services={isSuperAdmin && filterBranch === 'all' ? Array.from(new Map(branchServices.map(s => [s.name, s])).values()) : currentBranchServices} />
                  </div>
                  {perms.can_enter_ads_data && (
                    <div style={{ ...cardStyle, padding: '1.1rem' }}>
                      <p style={{ fontSize: 14.5, color: T.text, margin: '0 0 14px', fontWeight: 700 }}>Reklam Performansı (Bu Ay)</p>
                      <AdsPerformanceTable adsData={scopedAds} leads={scopedLeads} isMobile={isMobile} />
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: (isSuperAdmin && filterBranch === 'all' && !isMobile) ? '2fr 1fr' : '1fr', gap: 16 }}>
              <div style={{ ...cardStyle, padding: '1.1rem', minWidth: 0, overflow: 'hidden' }}>
                <p style={{ fontSize: 14.5, color: T.text, margin: '0 0 14px', fontWeight: 700 }}>Son Görüşmeler</p>
                <RecentLeadsTable leads={visibleLeads} canSeePhone={perms.can_see_phone} showBranch={isSuperAdmin && filterBranch === 'all'} branchNameFn={branchName} isMobile={isMobile} />
              </div>
              {isSuperAdmin && filterBranch === 'all' && (
                <div style={{ ...cardStyle, padding: '1.1rem' }}>
                  <p style={{ fontSize: 14.5, color: T.text, margin: '0 0 14px', fontWeight: 700 }}>Şubeler</p>
                  <BranchesOverview branches={branches} leads={leads} />
                </div>
              )}
            </div>
          </div>
               )}

        {activeTab === 'opportunities' && (
          <OpportunitiesTab
            leads={visibleLeads}
            noteCountMap={noteCountByLeadId}
            rules={reminderRules}
            ruleMap={reminderRuleMap}
            canEditRules={perms.can_edit_reminder_rules}
            isSuperAdmin={isSuperAdmin}
            filterBranch={filterBranch}
            activeBranches={activeBranches}
            branchName={branchName}
            onSaveRule={saveReminderRule}
            canSeePhone={perms.can_see_phone}
            onOpenLead={(lead) => { setEditingLead(lead); setIsLeadFormOpen(true); setActiveTab('clients') }}
          />
        )}

        {activeTab === 'clients' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 18 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: 0, letterSpacing: '-0.025em' }}>Danışanlar</h1>
                <p style={{ margin: '4px 0 0', color: T.textSoft, fontSize: 13 }}>
                  {isSuperAdmin && filterBranch === 'all' ? 'Tüm şubelerdeki müşteri süreçleri' : 'Müşteri süreçlerini ve günlük aksiyonları yönetin'}
                </p>
              </div>
              {perms.can_add_lead && (
                <button type="button" onClick={() => {
                  if (isLeadFormOpen || editingLead) { setEditingLead(null); setIsLeadFormOpen(false) }
                  else setIsLeadFormOpen(true)
                }} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 14px', border: 'none', borderRadius: 10,
                  background: T.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 9px 18px rgba(111,97,217,.22)',
                }}>
                  {isLeadFormOpen || editingLead ? <X size={16} /> : <Plus size={16} />}
                  {editingLead ? 'Düzenlemeyi kapat' : (isLeadFormOpen ? 'Formu kapat' : 'Yeni görüşme')}
                </button>
              )}
            </div>

            {perms.can_add_lead && (isLeadFormOpen || editingLead) && (
              <div style={{ marginBottom: 18 }}>
                <LeadForm onAdd={addLead} onUpdate={updateLead} onDelete={deleteLead} canDelete={canDeleteLead()} currentUser={currentUser} editing={editingLead}
                  onCancelEdit={() => { setEditingLead(null); setIsLeadFormOpen(false) }}
                  onSaved={() => { setEditingLead(null); setIsLeadFormOpen(false) }}
                  services={currentBranchServices} isMobile={isMobile}
                  targetBranchId={isSuperAdmin ? (filterBranch !== 'all' ? filterBranch : (activeBranches[0]?.id || null)) : currentUser.branch_id}
                  targetBranchName={isSuperAdmin ? (filterBranch !== 'all' ? branchName(filterBranch) : branchName(activeBranches[0]?.id)) : branchName(currentUser.branch_id)}
                  isSuperAdmin={isSuperAdmin}
                  notesForLead={editingLead ? leadNotes.filter(n => n.lead_id === editingLead.id) : []}
                  existingLeads={visibleLeads}
                  onFoundExisting={(lead) => { setEditingLead(lead); setIsLeadFormOpen(true) }}
                />
              </div>
            )}

            <div style={{ ...cardStyle, padding: isMobile ? '14px' : '18px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 14 }}>
                <div style={{ position: 'relative', width: isMobile ? '100%' : 330 }}>
                  <Search size={17} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.textFaint }} />
                  <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="İsim, telefon, hizmet veya not ara"
                    style={{ ...inputStyle, width: '100%', paddingLeft: 37, fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12.5, color: T.textSoft, whiteSpace: 'nowrap' }}><strong style={{ color: T.text }}>{clientRows.length}</strong> kayıt gösteriliyor</span>
                  <select value={clientSort} onChange={e => setClientSort(e.target.value)} style={{ ...inputStyle, padding: '8px 10px', width: 'auto', fontSize: 12.5, fontWeight: 600 }}>
                    <option value="priority">Önceliğe göre</option>
                    <option value="newest">En yeni kayıtlar</option>
                  </select>
                  {(isSuperAdmin || perms.can_export_data) && (
                    <ExportButtons
                      rows={leadsToExportRows(clientRows, branchName, isSuperAdmin && filterBranch === 'all')}
                      baseFilename={`danisanlar-${new Date().toISOString().slice(0, 10)}`}
                      sheetName="Danışanlar"
                    />
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                {[
                  ['all', 'Tümü'],
                  ['needs_result', 'Sonuç bekliyor'],
                  ['upcoming', 'Yaklaşan'],
                  ['customer', 'Müşteri oldu'],
                  ['no_show', 'Gelmedi'],
                ].map(([value, label]) => {
                  const active = clientStatusFilter === value
                  const config = value === 'all' ? null : APPOINTMENT_STATUS[value]
                  const count = value === 'all' ? visibleLeads.length : (clientStatusCounts[value] || 0)
                  return (
                    <button key={value} type="button" onClick={() => setClientStatusFilter(value)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 99, padding: '6px 10px',
                      border: active ? `1px solid ${config?.color || T.primary}` : `1px solid ${T.border}`,
                      background: active ? (config?.bg || T.primaryLight) : '#fff', color: active ? (config?.color || T.primary) : T.textSoft,
                      fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                    }}>
                      {config && <span style={{ width: 6, height: 6, borderRadius: '50%', background: config.color }} />}
                      {label} <span style={{ opacity: .72 }}>{count}</span>
                    </button>
                  )
                })}
              </div>

              {clientRows.length === 0 ? (
                <div style={{ padding: '34px 8px', textAlign: 'center', color: T.textSoft, fontSize: 13 }}>
                  Bu arama veya filtreye uygun danışan bulunamadı.
                </div>
              ) : (
                <div style={{ overflowX: isMobile ? 'visible' : 'auto' }}>
                  {!isMobile && (
                    <div style={{
                      display: 'grid', gridTemplateColumns: (isSuperAdmin && filterBranch === 'all') ? '0.82fr 1.35fr 1.05fr 1.05fr 1.15fr .7fr .46fr' : '1.4fr 1.1fr 1.1fr 1.15fr .72fr .48fr',
                      gap: 12, minWidth: 790, padding: '0 0 10px', borderBottom: `1px solid ${T.border}`, color: T.textFaint, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.055em',
                    }}>
                      {(isSuperAdmin && filterBranch === 'all') && <span>Şube</span>}
                      <span>Danışan</span><span>Hizmet / kanal</span><span>Durum</span><span>Sonraki adım</span><span>Tutar</span><span />
                    </div>
                  )}
                  {clientRows.map(lead => (
                    <LeadRow key={lead.id} lead={lead} canSeePhone={perms.can_see_phone} canEdit={canEditLead(lead)}
                      onEdit={(selected) => { setEditingLead(selected); setIsLeadFormOpen(true) }}
                      showBranch={isSuperAdmin && filterBranch === 'all'} branchName={branchName(lead.branch_id)} isMobile={isMobile}
                      noteCount={noteCountByLeadId[lead.id] || 0} rule={reminderRuleMap[`${lead.branch_id}__${lead.result}`] || null} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'appointments' && perms.can_see_calendar && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: '0 0 18px' }}>Randevular</h1>
            <AppointmentCalendar leads={visibleLeads} canSeePhone={perms.can_see_phone} currentUserName={currentUser.full_name || currentUser.email} isStaff={canSeeOwnDataOnly} showBranch={isSuperAdmin && filterBranch === 'all'} branchNameFn={branchName} isMobile={isMobile} />
          </div>
        )}

        {activeTab === 'reports' && perms.can_see_revenue && (
          <ReportsDashboard
            leads={scopedLeads}
            adsData={scopedAds}
            services={isSuperAdmin && filterBranch === 'all' ? Array.from(new Map(branchServices.map(service => [service.name, service])).values()) : currentBranchServices}
            isMobile={isMobile}
            canExport={isSuperAdmin || perms.can_export_data}
            branchName={branchName}
            showBranch={isSuperAdmin && filterBranch === 'all'}
          />
        )}

        {activeTab === 'ads' && perms.can_enter_ads_data && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: '0 0 18px' }}>Reklam Kaynakları</h1>
            {isSuperAdmin ? (
              <AdsBranchSelector branches={activeBranches} selectedBranch={adsSelectedBranch} onSelectBranch={setAdsSelectedBranch} isMobile={isMobile} />
            ) : (
              <AdsBranchSelector branches={activeBranches.filter(b => b.id === currentUser.branch_id)} selectedBranch={currentUser.branch_id} onSelectBranch={() => {}} isMobile={isMobile} />
            )}
            {(isSuperAdmin ? adsSelectedBranch : currentUser.branch_id) && (
              <MetaConnectionPanel branchId={isSuperAdmin ? adsSelectedBranch : currentUser.branch_id} branchName={branchName(isSuperAdmin ? adsSelectedBranch : currentUser.branch_id)} />
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: '0 0 18px' }}>Ayarlar</h1>
            {!isSuperAdmin && !canSeeOwnDataOnly && (
              <OnlineBookingLinkCard branchId={currentUser.branch_id} branchName={branchName(currentUser.branch_id)} />
            )}
            {perms.can_manage_branches && <BranchManagement branches={branches} onAdd={addBranch} onToggleActive={toggleBranchActive} onDelete={deleteBranch} onSaveWorkingHours={saveWorkingHours} />}
            {!isSuperAdmin && !canSeeOwnDataOnly && (
              <BranchServiceManager
                services={currentBranchServices}
                branchId={currentUser.branch_id}
                branchName={branchName(currentUser.branch_id)}
                onAdd={addService}
                onDelete={deleteService}
              />
            )}
            {isSuperAdmin && <UserManagement users={users} onToggle={toggleActive} onAdd={addUser} onDelete={deleteUser} onChangePassword={changeUserPassword} onChangeName={changeUserName} onChangeEmail={changeUserEmail} branches={activeBranches} templates={templates} isMobile={isMobile} currentUserId={currentUser.id} isSuperAdmin={isSuperAdmin} />}
          </div>
        )}

        {activeTab === 'admin' && isSuperAdmin && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: '0 0 18px' }}>Yönetim</h1>
            <SubscriptionManager users={users} branches={branches} onExtend={extendTrial} onGrantUnlimited={grantUnlimitedAccess} />
            <PermissionTemplateManager isMobile={isMobile} />
            <SecurityNotice isAdmin={isSuperAdmin} />
          </div>
        )}
        </>
        )}
      </div>

      {isMobile && (
        <BottomTabBar
          items={visibleNavItems}
          activeTab={activeTab}
          isMoreActive={showMobileMore}
          onSelect={(key) => { setActiveTab(key); setShowMobileMore(false) }}
          onMoreClick={() => setShowMobileMore(true)}
        />
      )}
    </div>
  )
}
