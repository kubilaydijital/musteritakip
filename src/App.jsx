import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabaseClient'
import {
  Chart, BarController, BarElement, DoughnutController, ArcElement,
  LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip
} from 'chart.js'
import {
  MessageCircle, CalendarDays, UserRound, ShoppingCart, TrendingUp, Wallet,
  Home, Headphones, Users, ClipboardList, BarChart3, Megaphone, Building2,
  ShieldCheck, Settings, Plus, ChevronDown, LogOut
} from 'lucide-react'

Chart.register(BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip)

const CHANNELS = ['Instagram', 'WhatsApp', 'Telefon', 'Google Ads', 'Facebook Ads', 'TikTok', 'Online Randevu', 'Organik']
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
// Her sonuç kategorisi için kademeli hatırlatma eşikleri (gün).
// Dizinin uzunluğu = "soğumadan önce" kaç hatırlatma yapılacağı.
// Sayaç, o leade eklenen not sayısına (lead_notes) göre ilerler.
const REMINDER_SCHEDULE = {
  'Randevu aldı': [1, 15, 45],
  'Randevuya gelmedi': [3, 17, 47],
  'Cevap yazıldı, müşteriden dönüş gelmedi': [3, 17, 47],
  'Satın almadı': [15, 45, 105],
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function daysSince(dateStr) { return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000) }
function lastTouch(lead) { return lead.last_note_at || lead.edited_at || lead.date }

// noteCount: leadin MEVCUT sonuç kategorisinde şu ana kadar eklenmiş not sayısı.
// Sonuç değiştiğinde bu sayaç otomatik sıfırlanır (PanelApp'teki noteCountByLeadId hesaplamasına bak).
// Süre, "Randevu aldı" için randevu tarihinden, diğerleri için son temas tarihinden işler.
function staleness(lead, noteCount = 0) {
  const schedule = REMINDER_SCHEDULE[lead.result]
  if (!schedule) return null // Müşteri oldu -> takip yok

  let anchorDate
  if (lead.result === 'Randevu aldı') {
    if (!lead.appointment_at) return null
    anchorDate = lead.appointment_at
  } else {
    anchorDate = lastTouch(lead)
  }

  const d = daysSince(anchorDate)
  if (d < 0) return null // randevu henüz geçmedi

  // noteCount, son hatırlatmadan sonra kaçıncı temasta olduğumuzu gösterir.
  // Şimdiye kadar yapılan temas sayısı schedule.length'e ulaştıysa -> soğuk, artık uyarma.
  if (noteCount >= schedule.length) return { level: 'cold', days: d }

  const threshold = schedule[noteCount]
  if (d < threshold) return null

  const level = noteCount === schedule.length - 1 ? 'critical' : 'warning'
  return { level, days: d, reminderNumber: noteCount + 1, totalReminders: schedule.length }
}
function fmtTL(n) { return Number(n || 0).toLocaleString('tr-TR') + ' TL' }

// Tasarım sistemi token'ları — koyu tema
const T = {
  primary: '#7C5CFC',
  primaryDark: '#6C3FFC',
  primaryLight: 'rgba(124,92,252,0.16)',
  bg: '#070D18',
  card: '#0C1626',
  cardSoft: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textSoft: '#94A3B8',
  textFaint: '#64748B',
  green: '#22C55E',
  greenBg: 'rgba(34,197,94,0.14)',
  orange: '#F59E0B',
  orangeBg: 'rgba(245,158,11,0.14)',
  red: '#EF4444',
  redBg: 'rgba(239,68,68,0.14)',
  blue: '#3B82F6',
  blueBg: 'rgba(59,130,246,0.14)',
}
const inputStyle = { padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, boxSizing: 'border-box', fontSize: 14, fontFamily: 'inherit', background: T.cardSoft, color: T.text, colorScheme: 'dark' }
const cardStyle = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }
const quickBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 9,
  border: `1px solid ${T.border}`, background: 'transparent', color: T.textSoft, fontSize: 12.5, cursor: 'pointer', textAlign: 'left'
}
function getPageWrapStyle(isMobile) {
  return {
    flex: 1,
    padding: isMobile ? '16px 14px 84px' : '28px 32px',
    width: '100%',
    maxWidth: 'none',
    overflowX: 'hidden'
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
  const [name, setName] = useState('')
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
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .ilike('username', name.trim())
      .maybeSingle()

    if (error || !data) { setLoading(false); setErr('Kullanıcı adı veya şifre hatalı.'); return }
    if (data.password !== pass) { setLoading(false); setErr('Kullanıcı adı veya şifre hatalı.'); return }
    if (data.active === false) { setLoading(false); setErr('Bu hesabın erişimi şu anda askıya alınmış. Yöneticinizle görüşün.'); return }

    // Admin hesabı IP kontrolünden muaf - kendi erişimin kilitlenmesin
    if (data.role !== 'admin') {
      const ip = await getClientIp()
      if (ip) {
        await supabase.from('login_logs').insert({ id: uid(), username: data.username, ip })
        const since = new Date(Date.now() - SUSPICIOUS_WINDOW_MS).toISOString()
        const { data: recentLogs } = await supabase
          .from('login_logs')
          .select('ip')
          .eq('username', data.username)
          .gte('created_at', since)
        const distinctIps = new Set((recentLogs || []).map(l => l.ip).filter(Boolean))
        if (distinctIps.size >= SUSPICIOUS_IP_THRESHOLD) {
          await supabase.from('app_users').update({ active: false }).eq('username', data.username)
          setLoading(false)
          setErr('Güvenlik nedeniyle bu hesap askıya alındı: kısa sürede çok farklı yerden giriş tespit edildi. Yöneticinizle görüşün.')
          return
        }
      }
    }

    // İzin şablonunu çek ve kullanıcı objesine ekle
    let permissions = null
    if (data.permission_template_id) {
      const { data: tpl } = await supabase
        .from('permission_templates')
        .select('*')
        .eq('id', data.permission_template_id)
        .maybeSingle()
      permissions = tpl
    }

    setLoading(false)
    onLogin({ ...data, permissions })
  }

  async function submitForgot(e) {
    e.preventDefault()
    setResetErr('')
    if (!resetEmail.trim()) return
    setResetLoading(true)
    try {
      const res = await fetch('/.netlify/functions/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      })
      // Güvenlik için: e-posta kayıtlı olmasa da olsa aynı mesajı göster,
      // böylece sistemde hangi e-postaların kayıtlı olduğu dışarıdan anlaşılamaz.
      if (res.ok || res.status === 404) {
        setMode('sent')
      } else {
        setResetErr('Bir sorun oluştu, lütfen daha sonra tekrar deneyin.')
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
        <p style={{ fontSize: 13, color: T.textSoft, marginBottom: 20 }}>Hesabınıza kayıtlı e-posta adresinizi girin, yeni şifrenizi gönderelim.</p>
        <form onSubmit={submitForgot}>
          <input type="email" placeholder="E-posta adresiniz" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
            style={{ width: '100%', marginBottom: 10, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, boxSizing: 'border-box' }} />
          {resetErr && <p style={{ fontSize: 13, color: '#c0392b', marginBottom: 10 }}>{resetErr}</p>}
          <button type="submit" disabled={resetLoading}
            style={{ width: '100%', padding: 10, borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            {resetLoading ? 'Gönderiliyor...' : 'Yeni şifre gönder'}
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
          Eğer bu e-posta adresine kayıtlı bir hesap varsa, yeni şifre gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin.
        </p>
        <button onClick={() => setMode('login')} style={{ fontSize: 13, color: T.primary, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          ← Giriş ekranına dön
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 360, margin: '4rem auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Müşteri takip sistemi</p>
      <p style={{ fontSize: 13, color: T.textSoft, marginBottom: 20 }}>Giriş yapın</p>
      <form onSubmit={submit}>
        <input placeholder="Kullanıcı adı" value={name} onChange={e => setName(e.target.value)}
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
    </div>
  )
}

const TRIAL_CONTACT_EMAIL = 'info@musteritakip.net'

function TrialExpired({ onLogout, trialEndsAt }) {
  const endedDate = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : null

  return (
    <div style={{ maxWidth: 420, margin: '4rem auto', padding: '2rem', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <p style={{ fontSize: 40, margin: '0 0 12px' }}>⏰</p>
      <p style={{ fontSize: 19, fontWeight: 700, margin: '0 0 10px', color: T.text }}>14 günlük deneme süreniz doldu</p>
      <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.6, margin: '0 0 4px' }}>
        {endedDate ? `Deneme süreniz ${endedDate} tarihinde sona erdi.` : 'Deneme süreniz sona erdi.'}
      </p>
      <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.6, margin: '0 0 26px' }}>
        Verileriniz güvende — kullanmaya devam etmek için bizimle iletişime geçin.
      </p>
      <a href={`mailto:${TRIAL_CONTACT_EMAIL}?subject=${encodeURIComponent('Deneme Süresi Doldu - Devam Etmek İstiyorum')}`} style={{
        display: 'block', width: '100%', padding: '12px', borderRadius: 10, background: T.primary,
        color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none', marginBottom: 18, boxSizing: 'border-box'
      }}>{TRIAL_CONTACT_EMAIL}</a>
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

function LeadForm({ onAdd, onUpdate, onDelete, canDelete, currentUser, editing, onCancelEdit, services, targetBranchId, targetBranchName, isSuperAdmin, isMobile, notesForLead }) {
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

  useEffect(() => {
    setForm(editing ? { ...editing, newNote: '', saleAmount: editing.sale_amount != null ? Number(editing.sale_amount).toLocaleString('tr-TR') : '', appointmentDate: toLocalDateValue(editing.appointment_at), appointmentTime: toLocalTimeValue(editing.appointment_at) } : emptyForm)
    setPhoneErr(''); setNoteErr(''); setAppointmentErr(''); setConfirmingDelete(false)
    setAiTip(''); setAiErr('')
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
      const res = await fetch('/.netlify/functions/lead-tip', {
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
    if (!PHONE_RE.test(form.phone.trim())) { setPhoneErr('Geçerli bir cep telefonu girin: +90 ile başlayıp, 5 ile devam edip, toplam 10 hane olmalı. Örnek: +905551234567'); ok = false }
    else setPhoneErr('')
    if (!editing && !form.note.trim()) { setNoteErr('Görüşme notu olmadan kayıt eklenemez.'); ok = false }
    else setNoteErr('')
    if (form.result === 'Randevu aldı' && !(form.appointmentDate && form.appointmentTime)) { setAppointmentErr('Randevu aldı seçildiğinde tarih ve saat girilmesi zorunludur.'); ok = false }
    else setAppointmentErr('')
    if (!form.name.trim()) ok = false
    if (!ok) return

    setSubmitting(true)
    const saleAmount = form.result === 'Müşteri oldu' && form.saleAmount.trim() !== '' ? Number(form.saleAmount.replace(/\./g, '')) : null
    const appointmentAt = (form.appointmentDate && form.appointmentTime) ? new Date(`${form.appointmentDate}T${form.appointmentTime}`).toISOString() : null

    if (editing) {
      await onUpdate({
        id: editing.id, name: form.name, phone: form.phone, channel: form.channel,
        service: form.service, note: form.newNote, result: form.result, sale_amount: saleAmount,
        appointment_at: appointmentAt, edited_at: new Date().toISOString()
      }, currentUser.username)
    } else {
      await onAdd({
        id: uid(), branch_id: targetBranchId, name: form.name, phone: form.phone,
        channel: form.channel, service: form.service, note: form.note, result: form.result,
        sale_amount: saleAmount, appointment_at: appointmentAt, entered_by: currentUser.username, date: new Date().toISOString()
      })
    }
    setSubmitting(false)
    setForm(emptyForm)
    setSaved(true)
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
          <input placeholder="+905551234567" value={form.phone} onChange={e => {
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
          <input type="date" value={form.appointmentDate} onChange={e => { set('appointmentDate', e.target.value); if (e.target.value && form.appointmentTime) setAppointmentErr('') }} style={inputStyle} />
          <input type="time" value={form.appointmentTime} onChange={e => { set('appointmentTime', e.target.value); if (form.appointmentDate && e.target.value) setAppointmentErr('') }} style={inputStyle} />
        </div>
        <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
          {form.result === 'Randevu aldı' ? 'Randevu tarihi ve saati zorunludur.' : 'Randevu tarihi/saati — varsa girin, takvimde görünür. Boş bırakılabilir.'}
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
            style={{ width: '100%', marginBottom: 4, fontFamily: 'inherit', fontSize: 14, padding: 10, border: `1px solid ${T.border}`, borderRadius: 8, boxSizing: 'border-box', background: T.cardSoft, color: T.text, colorScheme: 'dark' }} />
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
            style={{ width: '100%', marginBottom: 4, fontFamily: 'inherit', fontSize: 14, padding: 10, border: `1px solid ${T.border}`, borderRadius: 8, boxSizing: 'border-box', background: T.cardSoft, color: T.text, colorScheme: 'dark' }} />
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
}

function StatCard({ icon, label, value, color = 'violet', trend, trendLabel }) {
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

function AppointmentCalendar({ leads, canSeePhone, currentUserName, isStaff, showBranch, branchNameFn, isMobile }) {
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 3 : 4, marginBottom: 6 }}>
        {WEEKDAY_NAMES.map(w => <div key={w} style={{ textAlign: 'center', fontSize: isMobile ? 10 : 11, color: '#888', fontWeight: 600 }}>{w}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 3 : 4 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={'e' + i} />
          const key = dateKey(new Date(year, month, d))
          const dayLeads = leadsByDay[key] || []
          const isToday = key === todayKey
          const isSelected = key === selectedKey
          return (
            <button key={d} type="button" onClick={() => setSelectedDay(d)}
              style={{
                position: 'relative', padding: isMobile ? '5px 2px' : '8px 4px', minHeight: isMobile ? 36 : 44, borderRadius: 8, textAlign: 'left',
                background: isSelected ? '#6C5CE7' : (isToday ? '#eef2f8' : '#fafafa'),
                color: isSelected ? '#fff' : '#222',
                border: isToday && !isSelected ? '1px solid #6C5CE7' : '1px solid #eee',
                cursor: 'pointer', fontSize: isMobile ? 12 : 13
              }}>
              <span>{d}</span>
              {dayLeads.length > 0 && (
                <span style={{
                  display: 'block', marginTop: 4, fontSize: isMobile ? 9 : 10, fontWeight: 700,
                  color: isSelected ? '#fff' : '#6C5CE7'
                }}>
                  {isMobile ? dayLeads.length : `${dayLeads.length} randevu`}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selectedDay && (
        <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 14 }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 10px' }}>
            {selectedDay} {MONTH_NAMES[month]} {year} — {selectedLeads.length} randevu
          </p>
          {selectedLeads.length === 0 ? (
            <p style={{ fontSize: 13, color: '#888' }}>Bu günde randevu yok.</p>
          ) : selectedLeads.map(lead => (
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
                <span style={{ fontSize: 13, fontWeight: 700, color: '#6C5CE7' }}>
                  {new Date(lead.appointment_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}

function StaleAlerts({ leads, canSeePhone, currentUserName, isStaff, noteCountMap }) {
  const stale = useMemo(() =>
    leads
      .map(l => ({ lead: l, s: staleness(l, noteCountMap[l.id] || 0) }))
      .filter(x => x.s && x.s.level !== 'cold')
      .sort((a, b) => b.s.days - a.s.days),
    [leads, currentUserName, isStaff, noteCountMap])

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

// Danışanın sonuç durumuna göre kişiselleştirilmiş WhatsApp mesaj şablonu üretir.
const WHATSAPP_TEMPLATES = {
  'Randevu aldı': (name, service) =>
    `Merhaba ${name}, randevunuzu hatırlatmak istedik${service ? ` (${service})` : ''}. Sizi görmeyi bekliyoruz! 😊`,
  'Randevuya gelmedi': (name) =>
    `Merhaba ${name}, geçtiğimiz randevunuza gelemediğinizi fark ettik. Size uygun yeni bir gün ayarlamak isteriz, ne zaman uygun olur?`,
  'Satın almadı': (name, service) =>
    `Merhaba ${name}, ${service ? `${service} ile ilgili ` : ''}görüşmemizin ardından aklınızda kalan sorular varsa size yardımcı olmak isteriz. Ne zaman uygun olursunuz?`,
  'Cevap yazıldı, müşteriden dönüş gelmedi': (name) =>
    `Merhaba ${name}, daha önce yazmıştık, size hâlâ yardımcı olmak isteriz. Müsait olduğunuzda bize ulaşabilirsiniz.`,
  'Müşteri oldu': (name) =>
    `Merhaba ${name}, bizi tercih ettiğiniz için çok mutluyuz! Her zaman buradayız, görüşmek üzere. 💜`,
}

function buildWhatsappUrl(lead) {
  const template = WHATSAPP_TEMPLATES[lead.result] || WHATSAPP_TEMPLATES['Randevu aldı']
  const message = template(lead.name, lead.service)
  const digits = (lead.phone || '').replace(/[^\d]/g, '') // wa.me formatı: sadece rakamlar, + işareti olmadan
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

function LeadRow({ lead, canSeePhone, canEdit, onEdit, showBranch, branchName, isMobile, noteCount = 0 }) {
  const s = staleness(lead, noteCount)

  if (isMobile) {
    return (
      <div style={{ padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: T.text }}>{lead.name}</p>
            <p style={{ fontSize: 12.5, color: T.textSoft, margin: '2px 0 0' }}>
              {canSeePhone ? lead.phone : '••• gizli'} · {lead.channel}
              {showBranch && ` · ${branchName}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {canSeePhone && lead.phone && (
              <a href={buildWhatsappUrl(lead)} target="_blank" rel="noopener noreferrer" style={{
                fontSize: 12, padding: '5px 9px', borderRadius: 8, border: `1px solid #1D9E75`, background: 'transparent', color: '#1D9E75', textDecoration: 'none'
              }}>📱</a>
            )}
            {canEdit && (
              <button onClick={() => onEdit(lead)} style={{ fontSize: 12, padding: '5px 9px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.textSoft, flexShrink: 0 }}>✎</button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: RESULT_COLOR[lead.result], background: T.cardSoft, padding: '3px 8px', borderRadius: 6 }}>{lead.result}</span>
          {lead.service && <span style={{ fontSize: 11.5, color: T.textSoft, background: T.cardSoft, padding: '3px 8px', borderRadius: 6 }}>{lead.service}</span>}
          {lead.sale_amount != null && <span style={{ fontSize: 11.5, fontWeight: 700, color: T.green, background: T.greenBg, padding: '3px 8px', borderRadius: 6 }}>{fmtTL(lead.sale_amount)}</span>}
          {s && s.level === 'cold' && <span style={{ fontSize: 11.5, fontWeight: 700, color: T.textFaint, background: T.cardSoft, padding: '3px 8px', borderRadius: 6 }}>Soğuk</span>}
          {s && s.level !== 'cold' && <span style={{ fontSize: 11.5, fontWeight: 700, color: s.level === 'critical' ? T.red : T.orange, background: s.level === 'critical' ? T.redBg : T.orangeBg, padding: '3px 8px', borderRadius: 6 }}>{s.days} gün önce</span>}
        </div>
        {lead.note && <p style={{ fontSize: 12.5, color: T.textFaint, margin: '8px 0 0' }}>{lead.note}</p>}
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: showBranch ? '0.8fr 0.9fr 0.9fr 0.6fr 0.9fr 0.9fr 0.6fr 0.6fr 0.5fr 0.4fr' : '1fr 1fr 0.7fr 1fr 1fr 0.7fr 0.6fr 0.6fr 0.4fr',
      gap: 8, padding: '10px 0', borderBottom: '1px solid #eee', fontSize: 13, alignItems: 'center'
    }}>
      {showBranch && <span style={{ fontSize: 12, color: T.textSoft }}>{branchName}</span>}
      <span style={{ fontWeight: 600 }}>{lead.name}</span>
      <span style={{ color: T.textSoft, display: 'flex', alignItems: 'center', gap: 6 }}>
        {canSeePhone ? lead.phone : '••• gizli'}
        {canSeePhone && lead.phone && (
          <a href={buildWhatsappUrl(lead)} target="_blank" rel="noopener noreferrer" title="WhatsApp'tan yaz" style={{
            fontSize: 13, color: '#1D9E75', textDecoration: 'none', flexShrink: 0
          }}>📱</a>
        )}
      </span>
      <span>{lead.channel}</span>
      <span style={{ color: T.textSoft, fontSize: 12 }}>{lead.service || '—'}</span>
      <span style={{ fontSize: 12, color: T.textSoft }}>{lead.note ? lead.note.slice(0, 30) : '—'}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: RESULT_COLOR[lead.result] }}>{lead.result}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#2e7d32' }}>{lead.sale_amount != null ? fmtTL(lead.sale_amount) : '—'}</span>
      {s && s.level === 'cold' ? <span style={{ fontSize: 11, fontWeight: 600, color: T.textFaint }}>Soğuk</span> : s ? <span style={{ fontSize: 11, fontWeight: 600, color: s.level === 'critical' ? '#c0392b' : '#b8860b' }}>{s.days}g</span> : <span />}
      {canEdit ? <button onClick={() => onEdit(lead)} style={{ fontSize: 12, padding: '4px 8px' }}>✎</button> : <span />}
    </div>
  )
}

function WeeklyAdsForm({ onAdd, branches, selectedBranch, onSelectBranch, isMobile }) {
  const [form, setForm] = useState({ channel: CHANNELS[0], spend: '', impressions: '', messages: '', manualAdjustment: '' })
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  async function submit(e) {
    e.preventDefault()
    await onAdd({
      id: uid(), branch_id: selectedBranch, date: new Date().toISOString(), channel: form.channel,
      spend: Number(form.spend) || 0, impressions: Number(form.impressions) || 0, messages: Number(form.messages) || 0,
      manual_adjustment: Number(form.manualAdjustment) || 0
    })
    setForm({ channel: CHANNELS[0], spend: '', impressions: '', messages: '', manualAdjustment: '' })
  }
  return (
    <form onSubmit={submit} style={{ background: T.card, border: '1px solid #e2e2e2', borderRadius: 12, padding: isMobile ? '1rem' : '1.25rem', marginTop: isMobile ? '1rem' : '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 12px' }}>Haftalık reklam verisi gir (admin)</p>
      <select value={selectedBranch} onChange={e => onSelectBranch(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: 10 }}>
        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <select value={form.channel} onChange={e => set('channel', e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: 10 }}>
        {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <input placeholder="Harcama (TL)" value={form.spend} onChange={e => set('spend', e.target.value)} style={inputStyle} />
        <input placeholder="Gösterim" value={form.impressions} onChange={e => set('impressions', e.target.value)} style={inputStyle} />
        <input placeholder="Mesaj sayısı (Meta)" value={form.messages} onChange={e => set('messages', e.target.value)} style={inputStyle} />
      </div>
      <input placeholder="Manuel düzeltme (kayıt eksikliği — örn. 5)" value={form.manualAdjustment} onChange={e => set('manualAdjustment', e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: 6 }} />
      <p style={{ fontSize: 11, color: '#888', margin: '0 0 12px' }}>Sosyal medya personeli kaçırdığı mesajlar varsa, eksik kalan sayıyı buraya yaz — rapor bu sayıyı da hesaba katar.</p>
      <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer' }}>Haftalık veriyi kaydet</button>
    </form>
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
function UserManagement({ users, onToggle, onAdd, onDelete, onChangePassword, onChangeUsername, onChangeEmail, branches, templates, isMobile, currentUsername }) {
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newBranchId, setNewBranchId] = useState(branches[0]?.id || '')
  const [newTemplateId, setNewTemplateId] = useState('')
  const [addErr, setAddErr] = useState('')
  const [editingPwFor, setEditingPwFor] = useState(null)
  const [pwValue, setPwValue] = useState('')
  const [editingUsernameFor, setEditingUsernameFor] = useState(null)
  const [usernameValue, setUsernameValue] = useState('')
  const [usernameErr, setUsernameErr] = useState('')
  const [editingEmailFor, setEditingEmailFor] = useState(null)
  const [emailValue, setEmailValue] = useState('')
  const [confirmingDeleteFor, setConfirmingDeleteFor] = useState(null)

  const nonSuperAdminTemplates = (templates || []).filter(t => t.id !== 'tpl_super_admin')

  async function submitAdd(e) {
    e.preventDefault()
    setAddErr('')
    if (!newUsername.trim() || !newPassword.trim() || !newBranchId || !newTemplateId) {
      setAddErr('Tüm alanları doldurun.')
      return
    }
    if (users.some(u => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      setAddErr('Bu kullanıcı adı zaten kullanılıyor.')
      return
    }
    await onAdd({ username: newUsername.trim(), password: newPassword.trim(), branch_id: newBranchId, permission_template_id: newTemplateId, email: newEmail.trim() || null, active: true })
    setNewUsername(''); setNewPassword(''); setNewEmail('')
  }

  async function submitPasswordChange(username) {
    if (!pwValue.trim()) return
    await onChangePassword(username, pwValue.trim())
    setEditingPwFor(null); setPwValue('')
  }

  async function submitUsernameChange(oldUsername) {
    setUsernameErr('')
    const trimmed = usernameValue.trim()
    if (!trimmed) return
    if (trimmed.toLowerCase() === oldUsername.toLowerCase()) { setEditingUsernameFor(null); return }
    if (users.some(u => u.username.toLowerCase() === trimmed.toLowerCase())) {
      setUsernameErr('Bu kullanıcı adı zaten kullanılıyor.')
      return
    }
    await onChangeUsername(oldUsername, trimmed)
    setEditingUsernameFor(null); setUsernameValue('')
  }

  async function submitEmailChange(username) {
    const trimmed = emailValue.trim()
    await onChangeEmail(username, trimmed)
    setEditingEmailFor(null); setEmailValue('')
  }

  async function handleDelete(username) {
    if (confirmingDeleteFor !== username) { setConfirmingDeleteFor(username); return }
    await onDelete(username)
    setConfirmingDeleteFor(null)
  }

  return (
    <div style={{ background: T.card, border: '1px solid #e2e2e2', borderRadius: 12, padding: isMobile ? '1rem' : '1.25rem', marginTop: isMobile ? '1rem' : '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>Erişim yönetimi</p>
      <p style={{ fontSize: 13, color: T.textSoft, margin: '0 0 12px' }}>Ödeme alınmazsa ilgili şubenin erişimini buradan askıya alabilirsin.</p>

      {users.map(u => {
        const branch = branches.find(b => b.id === u.branch_id)
        const tplName = (templates || []).find(t => t.id === u.permission_template_id)?.name || u.role
        const isSelf = u.username === currentUsername
        return (
          <div key={u.username} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 8 : 0 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{u.username}{isSelf && <span style={{ color: T.primary, fontWeight: 500 }}> (sen)</span>}</p>
                <p style={{ margin: 0, fontSize: 12, color: T.textSoft }}>{tplName} · {branch ? branch.name : '—'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: u.email ? T.textFaint : '#c0392b' }}>{u.email || 'e-posta yok — şifremi unuttum çalışmaz'}</p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                <button onClick={() => { setEditingPwFor(editingPwFor === u.username ? null : u.username); setPwValue(''); setEditingUsernameFor(null); setEditingEmailFor(null) }}
                  style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: '#6C5CE7', cursor: 'pointer', fontWeight: 500 }}>
                  Şifre değiştir
                </button>
                <button onClick={() => { setEditingUsernameFor(editingUsernameFor === u.username ? null : u.username); setUsernameValue(u.username); setEditingPwFor(null); setEditingEmailFor(null) }}
                  style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: '#6C5CE7', cursor: 'pointer', fontWeight: 500 }}>
                  Kullanıcı adı değiştir
                </button>
                <button onClick={() => { setEditingEmailFor(editingEmailFor === u.username ? null : u.username); setEmailValue(u.email || ''); setEditingPwFor(null); setEditingUsernameFor(null) }}
                  style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: '#6C5CE7', cursor: 'pointer', fontWeight: 500 }}>
                  E-posta düzenle
                </button>
                {!isSelf && (
                  <>
                    <button onClick={() => onToggle(u.username, u.active)} style={{
                      fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                      border: u.active === false ? '1px solid #2e7d32' : '1px solid #c0392b',
                      background: u.active === false ? '#2e7d32' : '#c0392b',
                      color: '#fff'
                    }}>
                      {u.active === false ? 'Erişimi aç' : 'Erişimi askıya al'}
                    </button>
                    <button onClick={() => handleDelete(u.username)} style={{
                      fontSize: 12, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                      border: confirmingDeleteFor === u.username ? '1px solid #c0392b' : '1px solid #ddd',
                      background: confirmingDeleteFor === u.username ? '#c0392b' : '#fff',
                      color: confirmingDeleteFor === u.username ? '#fff' : '#999'
                    }}>
                      {confirmingDeleteFor === u.username ? 'Emin misin?' : 'Sil'}
                    </button>
                  </>
                )}
              </div>
            </div>
            {editingPwFor === u.username && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input type="text" placeholder="Yeni şifre" value={pwValue} onChange={e => setPwValue(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => submitPasswordChange(u.username)} style={{ padding: '8px 14px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Kaydet</button>
              </div>
            )}
            {editingEmailFor === u.username && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input type="email" placeholder="ornek@mail.com" value={emailValue} onChange={e => setEmailValue(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => submitEmailChange(u.username)} style={{ padding: '8px 14px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Kaydet</button>
              </div>
            )}
            {editingUsernameFor === u.username && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="Yeni kullanıcı adı" value={usernameValue} onChange={e => setUsernameValue(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => submitUsernameChange(u.username)} style={{ padding: '8px 14px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Kaydet</button>
                </div>
                {usernameErr && <p style={{ fontSize: 12, color: '#c0392b', margin: '6px 0 0' }}>{usernameErr}</p>}
              </div>
            )}
          </div>
        )
      })}

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #eee' }}>
        <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 10px' }}>Yeni kullanıcı ekle</p>
        <form onSubmit={submitAdd}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input placeholder="Kullanıcı adı" value={newUsername} onChange={e => setNewUsername(e.target.value)} style={inputStyle} />
            <input placeholder="Şifre" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
          </div>
          <input type="email" placeholder="E-posta (şifremi unuttum için gerekli, isteğe bağlı)" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: 10 }} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <select value={newBranchId} onChange={e => setNewBranchId(e.target.value)} style={inputStyle}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={newTemplateId} onChange={e => setNewTemplateId(e.target.value)} style={inputStyle}>
              <option value="">İzin şablonu seç...</option>
              {nonSuperAdminTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {addErr && <p style={{ fontSize: 12, color: '#c0392b', margin: '0 0 10px' }}>{addErr}</p>}
          <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer' }}>Kullanıcı ekle</button>
        </form>
      </div>
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
  const serviceNames = (services || []).map(s => s.name)
  const sums = useMemo(() => {
    const s = {}; serviceNames.forEach(sv => s[sv] = 0)
    leads.forEach(l => { if (l.result === 'Müşteri oldu' && l.sale_amount != null && s[l.service] !== undefined) s[l.service] += Number(l.sale_amount) })
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, serviceNames.join(',')])
  useEffect(() => {
    if (serviceNames.length === 0) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: { labels: serviceNames, datasets: [{ label: 'Ciro (TL)', data: serviceNames.map(s => sums[s]), backgroundColor: serviceNames.map((_, i) => SERVICE_COLOR_PALETTE[i % SERVICE_COLOR_PALETTE.length]) }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [sums])
  return <div style={{ position: 'relative', width: '100%', height: 200 }}><canvas ref={ref} /></div>
}

function MessageMatchReport({ adsData, leads }) {
  const sorted = useMemo(() => [...adsData].sort((a, b) => new Date(b.date) - new Date(a.date)), [adsData])
  if (sorted.length === 0) return null

  function recordCountForWeek(weekDate) {
    // O hafta verisinin girildiği tarihten 7 gün öncesine kadar girilen kayıtları say (basit yaklaşım)
    const end = new Date(weekDate)
    const start = new Date(end.getTime() - 7 * 86400000)
    return leads.filter(l => {
      const d = new Date(l.date)
      return d >= start && d <= end
    }).length
  }

  return (
    <div style={{ background: T.card, border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem', marginTop: '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>Mesaj / kayıt eşleşme raporu</p>
      <p style={{ fontSize: 13, color: T.textSoft, margin: '0 0 12px' }}>Meta'nın gösterdiği mesaj sayısı ile sisteme girilen kayıt sayısını karşılaştırır. Manuel düzeltme, kaçırılan mesajları telafi eder.</p>
      {sorted.slice(0, 8).map(week => {
        const recordCount = recordCountForWeek(week.date)
        const adjusted = recordCount + (week.manual_adjustment || 0)
        const total = week.messages || 0
        const missing = Math.max(0, total - adjusted)
        const pct = total > 0 ? Math.round((adjusted / total) * 100) : 100
        const dateLabel = new Date(week.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        return (
          <div key={week.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: T.textSoft }}>{dateLabel}</span>
              <span style={{ fontWeight: 600, color: pct >= 90 ? '#2e7d32' : pct >= 70 ? '#b8860b' : '#c0392b' }}>%{pct} kayıt oranı</span>
            </div>
            <span style={{ color: '#444' }}>
              Mesaj: {total} · Kayıt: {recordCount}{week.manual_adjustment > 0 ? ` (+${week.manual_adjustment} manuel)` : ''} · {missing > 0 ? <strong style={{ color: '#c0392b' }}>{missing} eksik</strong> : 'eksik yok'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MonthlySpendChart({ adsData }) {
  const ref = useRef(null)
  const chartRef = useRef(null)
  const sorted = useMemo(() => [...adsData].sort((a, b) => new Date(a.date) - new Date(b.date)), [adsData])
  useEffect(() => {
    if (sorted.length === 0) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: { labels: sorted.map((w, i) => 'Hafta ' + (i + 1)), datasets: [{ label: 'Harcama (TL)', data: sorted.map(w => w.spend), borderColor: '#378ADD', backgroundColor: 'rgba(55,138,221,0.15)', fill: true, tension: 0.3 }] },
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
  can_see_calendar: 'Randevu takvimini görebilir'
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
  { key: 'clients', label: 'Danışanlar', icon: <Users size={18} />, show: () => true },
  { key: 'appointments', label: 'Randevular', icon: <CalendarDays size={18} />, show: perms => perms.can_see_calendar },
  { key: 'reports', label: 'Raporlar', icon: <BarChart3 size={18} />, show: perms => perms.can_see_revenue },
  { key: 'ads', label: 'Reklam Kaynakları', icon: <Megaphone size={18} />, show: perms => perms.can_enter_ads_data },
  { key: 'settings', label: 'Ayarlar', icon: <Settings size={18} />, show: (perms, isSuperAdmin, canSeeOwnDataOnly) => perms.can_manage_users || perms.can_manage_branches || (!isSuperAdmin && !canSeeOwnDataOnly) },
  { key: 'admin', label: 'Yönetim', icon: <ShieldCheck size={18} />, show: (perms, isSuperAdmin) => isSuperAdmin },
]

function SidebarNav({ items, activeTab, onSelect, currentUser, isSuperAdmin, canSeeOwnDataOnly, branchLabel, onLogout, onQuickAction }) {
  return (
    <div style={{
      width: 248, flexShrink: 0, background: T.card, borderRight: `1px solid ${T.border}`,
      minHeight: '100vh', padding: '22px 16px', display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 18px', marginBottom: 14 }}>
        <span style={{
          width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${T.primary}, #A78BFA)`,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17
        }}>M</span>
        <div>
          <p style={{ fontWeight: 800, fontSize: 14.5, margin: 0, color: T.text, lineHeight: 1.25, letterSpacing: '0.01em' }}>MÜŞTERİ<br />TAKİP</p>
        </div>
      </div>
      <div style={{
        background: T.primaryLight, borderRadius: 10, padding: '9px 11px', marginBottom: 16,
        fontSize: 12, color: '#C7B9FF', fontWeight: 600
      }}>{currentUser.username} · {branchLabel}</div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {items.map(item => {
          const active = activeTab === item.key
          return (
            <button key={item.key} onClick={() => onSelect(item.key)} style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10,
              border: 'none', background: active ? T.primary : 'transparent',
              color: active ? '#fff' : T.textSoft,
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
          <p style={{ fontSize: 11, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px', fontWeight: 700 }}>Hızlı İşlemler</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <button onClick={() => onQuickAction('clients')} style={quickBtnStyle}><Plus size={14} /> Yeni Görüşme</button>
            <button onClick={() => onQuickAction('appointments')} style={quickBtnStyle}><Plus size={14} /> Randevu Oluştur</button>
            <button onClick={() => onQuickAction('ads')} style={quickBtnStyle}><Plus size={14} /> Reklam Verisi Gir</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 18 }}>
        <button onClick={onLogout} style={{
          width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`,
          background: 'transparent', color: T.textSoft, fontWeight: 500, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}><LogOut size={14} /> Çıkış yap</button>
        <p style={{ fontSize: 11, color: T.textFaint, margin: '14px 0 0', textAlign: 'center' }}>Müşteri Takip v2.0.0</p>
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

function MobileTopBar({ currentUser, branchLabel, onLogout }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '12px 14px', background: T.card,
      borderBottom: `1px solid ${T.border}`, width: '100%', boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${T.primary}, #A78BFA)`,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0
        }}>M</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 13, margin: 0, color: T.text, lineHeight: 1.2 }}>Müşteri Takip</p>
          <p style={{ fontSize: 11, margin: 0, color: T.textSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.username} · {branchLabel}</p>
        </div>
      </div>
      <button onClick={onLogout} style={{
        flexShrink: 0, padding: '7px 9px', borderRadius: 9, border: `1px solid ${T.border}`,
        background: 'transparent', color: T.textSoft, cursor: 'pointer', display: 'flex', alignItems: 'center'
      }}><LogOut size={15} /></button>
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

function FunnelSection({ stats, isMobile }) {
  const stages = [
    {
      label: '1. Mesaj Geldi',
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

  const rates = [stats.pctAppointed, stats.pctArrived, stats.pctSold]

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
        gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
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
    const byChannel = {}
    adsData.forEach(w => {
      const ch = w.channel || 'Instagram'
      if (!byChannel[ch]) byChannel[ch] = { spend: 0, messages: 0 }
      byChannel[ch].spend += Number(w.spend) || 0
      byChannel[ch].messages += Number(w.messages) || 0
    })
    return Object.keys(byChannel).map(ch => {
      const sales = leads.filter(l => l.channel === ch && l.result === 'Müşteri oldu').length
      const spend = byChannel[ch].spend
      const revenue = leads.filter(l => l.channel === ch && l.result === 'Müşteri oldu').reduce((s, l) => s + (Number(l.sale_amount) || 0), 0)
      const roas = spend > 0 ? (revenue / spend).toFixed(1) : '—'
      return { channel: ch, spend, messages: byChannel[ch].messages, sales, roas }
    }).sort((a, b) => b.spend - a.spend)
  }, [adsData, leads])

  if (rows.length === 0) return <p style={{ fontSize: 13, color: T.textSoft }}>Henüz reklam verisi girilmemiş.</p>

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
          <div key={l.id} style={{ padding: '11px 0', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ color: T.text, fontWeight: 600, fontSize: 13.5 }}>{l.name}</span>
              <span style={{ color: T.textFaint, fontSize: 11.5, flexShrink: 0 }}>{new Date(l.date).toLocaleDateString('tr-TR')}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <span style={{ background: T.primaryLight, color: T.primary, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{l.result}</span>
              <span style={{ color: T.textSoft, fontSize: 11.5 }}>{l.channel}{showBranch && ` · ${branchNameFn(l.branch_id)}`}</span>
            </div>
            {l.note && <p style={{ color: T.textSoft, fontSize: 12, margin: '6px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.note}</p>}
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
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mt_current_user')
      return saved ? JSON.parse(saved) : null
    } catch (e) { return null }
  })
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])
  const [leads, setLeads] = useState([])
  const [leadNotes, setLeadNotes] = useState([])
  const [adsData, setAdsData] = useState([])
  const [templates, setTemplates] = useState([])
  const [branchServices, setBranchServices] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [adsSelectedBranch, setAdsSelectedBranch] = useState('')
  const [filterBranch, setFilterBranch] = useState('all')
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
    leadNotes.forEach(n => {
      const lead = leadById[n.lead_id]
      if (!lead) return
      // result_at_time eski kayıtlarda olmayabilir (migration öncesi); o durumda güvenli tarafta kalıp say.
      if (n.result_at_time && n.result_at_time !== lead.result) return
      map[n.lead_id] = (map[n.lead_id] || 0) + 1
    })
    return map
  }, [leadNotes, leads])

  function loginAndPersist(user) {
    try { localStorage.setItem('mt_current_user', JSON.stringify(user)) } catch (e) {}
    setCurrentUser(user)
  }
  function logoutAndClear() {
    try { localStorage.removeItem('mt_current_user') } catch (e) {}
    setCurrentUser(null)
  }

  useEffect(() => {
    if (!currentUser) return
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  async function loadAll() {
    setLoaded(false)
    const [b, u, l, a, t, bs, ln] = await Promise.all([
      supabase.from('branches').select('*').order('name'),
      supabase.from('app_users').select('*'),
      supabase.from('leads').select('*').order('date', { ascending: false }),
      supabase.from('ads_data').select('*').order('date', { ascending: false }),
      supabase.from('permission_templates').select('*'),
      supabase.from('branch_services').select('*').order('name'),
      supabase.from('lead_notes').select('*').order('created_at', { ascending: false })
    ])
    setBranches(b.data || [])
    setUsers(u.data || [])
    setLeads(l.data || [])
    setAdsData(a.data || [])
    setTemplates(t.data || [])
    setBranchServices(bs.data || [])
    setLeadNotes(ln.data || [])
    if (b.data && b.data.length > 0) setAdsSelectedBranch(b.data[0].id)
    setLoaded(true)

    // Hesap sonradan askıya alınmışsa otomatik çıkış yap
    if (currentUser) {
      const stillActive = (u.data || []).find(usr => usr.username === currentUser.username)
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
  async function toggleActive(username, currentActive) {
    const newActive = currentActive === false ? true : false
    const { data } = await supabase.from('app_users').update({ active: newActive }).eq('username', username).select()
    if (data) setUsers(prev => prev.map(u => u.username === username ? data[0] : u))
  }
  async function addUser(user) {
    const { data } = await supabase.from('app_users').insert({ ...user, role: 'staff' }).select()
    if (data) setUsers(prev => [...prev, data[0]])
  }
  async function deleteUser(username) {
    await supabase.from('app_users').delete().eq('username', username)
    setUsers(prev => prev.filter(u => u.username !== username))
  }
  async function changeUserPassword(username, newPassword) {
    const { data } = await supabase.from('app_users').update({ password: newPassword }).eq('username', username).select()
    if (data) setUsers(prev => prev.map(u => u.username === username ? data[0] : u))
  }
  async function changeUserEmail(username, newEmail) {
    const { data } = await supabase.from('app_users').update({ email: newEmail || null }).eq('username', username).select()
    if (data) setUsers(prev => prev.map(u => u.username === username ? data[0] : u))
  }
  async function changeUsername(oldUsername, newUsername) {
    const existing = users.find(u => u.username === oldUsername)
    if (!existing) return
    // Yeni kullanıcı adıyla yeni satır oluştur (aynı bilgilerle)
    const { username: _old, ...rest } = existing
    const { data: created } = await supabase.from('app_users').insert({ ...rest, username: newUsername }).select()
    if (!created) return
    // Bu kullanıcının girdiği geçmiş kayıtları yeni kullanıcı adına taşı
    await supabase.from('leads').update({ entered_by: newUsername }).eq('entered_by', oldUsername)
    // Eski kullanıcı satırını sil
    await supabase.from('app_users').delete().eq('username', oldUsername)
    setUsers(prev => prev.map(u => u.username === oldUsername ? created[0] : u))
    setLeads(prev => prev.map(l => l.entered_by === oldUsername ? { ...l, entered_by: newUsername } : l))
    // Eğer kendi kullanıcı adını değiştirdiysek, oturum bilgisini de güncelle - aksi halde
    // sayfa yenilenince (localStorage'da eski kullanıcı adı kaldığı için) oturum bozulur.
    if (currentUser.username === oldUsername) {
      const updatedSelf = { ...currentUser, ...created[0] }
      setCurrentUser(updatedSelf)
      try { localStorage.setItem('mt_current_user', JSON.stringify(updatedSelf)) } catch (e) {}
    }
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

    // 3) Kullanıcıları arşive kopyala (şifre hariç - güvenlik)
    if (branchUsers.length > 0) {
      await supabase.from('archived_app_users').insert(
        branchUsers.map(u => ({
          id: uid(), archive_id: archiveId,
          username: u.username, role: u.role, is_trial: u.is_trial, trial_ends_at: u.trial_ends_at,
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

  if (!currentUser) return <Login onLogin={loginAndPersist} />
  if (!loaded) return <p style={{ padding: 40, fontFamily: 'system-ui' }}>Yükleniyor...</p>

  // Deneme süresi dolmuşsa panele hiç erişilmesin, sadece bilgi ekranı gösterilsin.
  if (currentUser.is_trial && currentUser.trial_ends_at && new Date(currentUser.trial_ends_at) < new Date()) {
    return <TrialExpired onLogout={logoutAndClear} trialEndsAt={currentUser.trial_ends_at} />
  }

  // Geriye dönük uyumluluk: izin objesi yoksa (eski veri) role alanına göre varsayılan izinler uygula
  const perms = currentUser.permissions || {
    can_see_phone: currentUser.role === 'admin' || currentUser.role === 'manager',
    can_see_revenue: currentUser.role === 'admin' || currentUser.role === 'manager',
    can_see_all_branches: currentUser.role === 'admin',
    can_add_lead: true,
    can_edit_any_lead: currentUser.role === 'admin' || currentUser.role === 'manager',
    can_delete_lead: currentUser.role === 'admin',
    can_manage_users: currentUser.role === 'admin',
    can_manage_branches: currentUser.role === 'admin',
    can_enter_ads_data: currentUser.role === 'admin',
    can_see_calendar: true
  }

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

  function canEditLead(lead) {
    if (perms.can_edit_any_lead) return true
    return lead.entered_by === currentUser.username
  }
  function canDeleteLead() {
    return !!perms.can_delete_lead
  }
  function branchName(id) { return (branches.find(b => b.id === id) || {}).name || '—' }

  const customers = scopedLeads.filter(l => l.result === 'Müşteri oldu')
  const withAmount = customers.filter(l => l.sale_amount != null)
  const revenue = customers.reduce((s, l) => s + (Number(l.sale_amount) || 0), 0)
  const avgTicket = withAmount.length ? Math.round(revenue / withAmount.length) : 0
  const noShow = scopedLeads.filter(l => l.result === 'Randevuya gelmedi')
  const notBought = scopedLeads.filter(l => l.result === 'Satın almadı')
  const noResponse = scopedLeads.filter(l => l.result === 'Cevap yazıldı, müşteriden dönüş gelmedi')
  const appointed = scopedLeads.filter(l => ['Randevu aldı', 'Randevuya gelmedi', 'Satın almadı', 'Müşteri oldu'].includes(l.result))
  const arrived = scopedLeads.filter(l => ['Satın almadı', 'Müşteri oldu'].includes(l.result))
  const stats = {
    total: scopedLeads.length,
    customers: customers.length,
    ig: scopedLeads.filter(l => l.channel === 'Instagram').length,
    wa: scopedLeads.filter(l => l.channel === 'WhatsApp').length,
    organik: scopedLeads.filter(l => l.channel === 'Organik').length,
    rate: scopedLeads.length ? Math.round((customers.length / scopedLeads.length) * 100) : 0,
    revenue, avgTicket, withAmountCount: withAmount.length,
    appointed: appointed.length, arrived: arrived.length,
    noShowCount: noShow.length, notBoughtCount: notBought.length, noResponseCount: noResponse.length,
    pctAppointed: scopedLeads.length ? Math.round((appointed.length / scopedLeads.length) * 100) : 0,
    pctArrived: appointed.length ? Math.round((arrived.length / appointed.length) * 100) : 0,
    pctSold: arrived.length ? Math.round((customers.length / arrived.length) * 100) : 0,
    pctNoShow: appointed.length ? Math.round((noShow.length / appointed.length) * 100) : 0,
    pctNotBought: arrived.length ? Math.round((notBought.length / arrived.length) * 100) : 0,
    pctNoResponse: scopedLeads.length ? Math.round((noResponse.length / scopedLeads.length) * 100) : 0,
  }
  const totalSpend = scopedAds.reduce((s, w) => s + Number(w.spend), 0)

  const visibleNavItems = NAV_ITEMS.filter(item => item.show(perms, isSuperAdmin, canSeeOwnDataOnly))
  const branchLabel = isSuperAdmin ? 'süper admin · tüm şubeler' : `${branchName(currentUser.branch_id)}`

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: T.bg, minHeight: '100vh', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        html, body { overflow-x: hidden; max-width: 100%; }
        select, input, textarea { font-family: 'Inter', system-ui, sans-serif; max-width: 100%; }
        select option { background: #0C1626; color: #fff; }
        button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid ${T.primary}; outline-offset: 1px; }
        ::placeholder { color: ${T.textFaint}; }
        img, svg, canvas { max-width: 100%; }
      `}</style>

      {isMobile ? (
        <MobileTopBar currentUser={currentUser} branchLabel={branchLabel} onLogout={logoutAndClear} />
      ) : (
        <SidebarNav items={visibleNavItems} activeTab={activeTab} onSelect={setActiveTab} currentUser={currentUser}
          isSuperAdmin={isSuperAdmin} canSeeOwnDataOnly={canSeeOwnDataOnly} branchLabel={branchLabel} onLogout={logoutAndClear} onQuickAction={setActiveTab} />
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
            </p>
            <StaleAlerts leads={visibleLeads} canSeePhone={perms.can_see_phone} currentUserName={currentUser.username} isStaff={canSeeOwnDataOnly} noteCountMap={noteCountByLeadId} />

<div style={{
  display: 'grid',
  gridTemplateColumns: perms.can_see_revenue
    ? 'repeat(auto-fit, minmax(180px, 1fr))'
    : 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 14,
  marginBottom: 18
}}>
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
  <FunnelSection stats={stats} isMobile={isMobile} />
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

            <div style={{ display: 'grid', gridTemplateColumns: isSuperAdmin && filterBranch === 'all' ? '2fr 1fr' : '1fr', gap: 16 }}>
              <div style={{ ...cardStyle, padding: '1.1rem' }}>
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

        {activeTab === 'clients' && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: '0 0 18px' }}>Danışanlar</h1>
            {perms.can_add_lead && (
              <LeadForm onAdd={addLead} onUpdate={updateLead} onDelete={deleteLead} canDelete={canDeleteLead()} currentUser={currentUser} editing={editingLead} onCancelEdit={() => setEditingLead(null)} services={currentBranchServices} isMobile={isMobile}
                targetBranchId={isSuperAdmin ? (filterBranch !== 'all' ? filterBranch : (activeBranches[0]?.id || null)) : currentUser.branch_id}
                targetBranchName={isSuperAdmin ? (filterBranch !== 'all' ? branchName(filterBranch) : branchName(activeBranches[0]?.id)) : branchName(currentUser.branch_id)}
                isSuperAdmin={isSuperAdmin}
                notesForLead={editingLead ? leadNotes.filter(n => n.lead_id === editingLead.id) : []}
              />
            )}
            <div style={{ marginTop: '1.5rem' }}>
              <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 10px' }}>
                {isSuperAdmin && filterBranch === 'all' ? 'Tüm şubeler — kayıtlar' : 'Şube kayıtları'}
              </p>
              {visibleLeads.length === 0 ? (
                <p style={{ fontSize: 13, color: T.textSoft }}>Henüz kayıt yok.</p>
              ) : (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: isMobile ? '0 1rem' : '0 1.25rem', overflowX: isMobile ? 'visible' : 'auto' }}>
                  {!isMobile && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: (isSuperAdmin && filterBranch === 'all') ? '0.8fr 0.9fr 0.9fr 0.6fr 0.9fr 0.9fr 0.6fr 0.6fr 0.5fr 0.4fr' : '1fr 1fr 0.7fr 1fr 1fr 0.7fr 0.6fr 0.6fr 0.4fr',
                      gap: 8, padding: '10px 0', borderBottom: '1px solid #ddd', fontSize: 12, color: T.textSoft, minWidth: 760
                    }}>
                      {(isSuperAdmin && filterBranch === 'all') && <span>şube</span>}
                      <span>isim</span><span>telefon</span><span>kanal</span><span>hizmet</span><span>not</span><span>sonuç</span><span>tutar</span><span>takip</span><span></span>
                    </div>
                  )}
                  {visibleLeads.map(l => (
                    <LeadRow key={l.id} lead={l} canSeePhone={perms.can_see_phone} canEdit={canEditLead(l)} onEdit={setEditingLead}
                      showBranch={isSuperAdmin && filterBranch === 'all'} branchName={branchName(l.branch_id)} isMobile={isMobile} noteCount={noteCountByLeadId[l.id] || 0} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'appointments' && perms.can_see_calendar && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: '0 0 18px' }}>Randevular</h1>
            <AppointmentCalendar leads={visibleLeads} canSeePhone={perms.can_see_phone} currentUserName={currentUser.username} isStaff={canSeeOwnDataOnly} showBranch={isSuperAdmin && filterBranch === 'all'} branchNameFn={branchName} isMobile={isMobile} />
          </div>
        )}

        {activeTab === 'reports' && perms.can_see_revenue && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: '0 0 18px' }}>Raporlar</h1>
            <div style={{ display: 'grid', gridTemplateColumns: scopedAds.length > 0 ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '1rem' }}>
                <p style={{ fontSize: 13, color: T.textSoft, margin: '0 0 8px', fontWeight: 600 }}>Hizmete göre ciro</p>
                <RevenueByServiceChart leads={scopedLeads} services={isSuperAdmin && filterBranch === 'all' ? Array.from(new Map(branchServices.map(s => [s.name, s])).values()) : currentBranchServices} />
              </div>
              {scopedAds.length > 0 && (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '1rem' }}>
                  <p style={{ fontSize: 13, color: T.textSoft, margin: '0 0 8px', fontWeight: 600 }}>Haftalık reklam harcaması</p>
                  <MonthlySpendChart adsData={scopedAds} />
                </div>
              )}
            </div>
            {perms.can_enter_ads_data && scopedAds.length > 0 && <MessageMatchReport adsData={scopedAds} leads={scopedLeads} />}
          </div>
        )}

        {activeTab === 'ads' && perms.can_enter_ads_data && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: '0 0 18px' }}>Reklam Kaynakları</h1>
            <WeeklyAdsForm onAdd={addAdsWeek} branches={activeBranches} selectedBranch={adsSelectedBranch} onSelectBranch={setAdsSelectedBranch} isMobile={isMobile} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: '0 0 18px' }}>Ayarlar</h1>
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
            {perms.can_manage_users && <UserManagement users={users} onToggle={toggleActive} onAdd={addUser} onDelete={deleteUser} onChangePassword={changeUserPassword} onChangeUsername={changeUsername} onChangeEmail={changeUserEmail} branches={activeBranches} templates={templates} isMobile={isMobile} currentUsername={currentUser.username} />}
          </div>
        )}

        {activeTab === 'admin' && isSuperAdmin && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: '0 0 18px' }}>Yönetim</h1>
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
