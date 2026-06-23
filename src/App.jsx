import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabaseClient'
import {
  Chart, BarController, BarElement, DoughnutController, ArcElement,
  LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip
} from 'chart.js'

Chart.register(BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip)

const CHANNELS = ['Instagram', 'WhatsApp', 'Organik']
const SERVICES = ['Bölgesel incelme', 'Lazer epilasyon', 'Cilt işlemleri', 'Kalıcı makyaj işlemleri']
const RESULTS = ['Görüşülüyor', 'Randevu aldı', 'Düşünüyor', 'Görüşüldü, randevu alınamadı', 'Vazgeçti', 'Müşteri oldu']
const OPEN_RESULTS = ['Görüşülüyor', 'Düşünüyor']
const RESULT_COLOR = { 'Görüşülüyor': '#185FA5', 'Randevu aldı': '#0F6E56', 'Düşünüyor': '#854F0B', 'Görüşüldü, randevu alınamadı': '#6B6B6B', 'Vazgeçti': '#A32D2D', 'Müşteri oldu': '#3B6D11' }
const RESULT_HEX = { 'Görüşülüyor': '#378ADD', 'Randevu aldı': '#1D9E75', 'Düşünüyor': '#EF9F27', 'Görüşüldü, randevu alınamadı': '#9CA3AF', 'Vazgeçti': '#E24B4A', 'Müşteri oldu': '#639922' }
const CHANNEL_HEX = { 'Instagram': '#D4537E', 'WhatsApp': '#1D9E75', 'Organik': '#7F77DD' }
const SERVICE_HEX = { 'Bölgesel incelme': '#D4537E', 'Lazer epilasyon': '#378ADD', 'Cilt işlemleri': '#1D9E75', 'Kalıcı makyaj işlemleri': '#EF9F27' }
const PHONE_RE = /^\+\d{10,15}$/
const WARN_DAYS = 7
const CRITICAL_DAYS = 14

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function daysSince(dateStr) { return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000) }
function lastTouch(lead) { return lead.edited_at || lead.date }
function staleness(lead) {
  if (!OPEN_RESULTS.includes(lead.result)) return null
  const d = daysSince(lastTouch(lead))
  if (d >= CRITICAL_DAYS) return { level: 'critical', days: d }
  if (d >= WARN_DAYS) return { level: 'warning', days: d }
  return null
}
function fmtTL(n) { return Number(n || 0).toLocaleString('tr-TR') + ' TL' }

const inputStyle = { padding: 10, borderRadius: 8, border: '1px solid #ccc', boxSizing: 'border-box', fontSize: 14, fontFamily: 'inherit' }

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

    setLoading(false)
    onLogin(data)
  }

  return (
    <div style={{ maxWidth: 360, margin: '4rem auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Müşteri takip sistemi</p>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Giriş yapın</p>
      <form onSubmit={submit}>
        <input placeholder="Kullanıcı adı" value={name} onChange={e => setName(e.target.value)}
          style={{ width: '100%', marginBottom: 10, padding: 10, borderRadius: 8, border: '1px solid #ccc', boxSizing: 'border-box' }} />
        <input type="password" placeholder="Şifre" value={pass} onChange={e => setPass(e.target.value)}
          style={{ width: '100%', marginBottom: 10, padding: 10, borderRadius: 8, border: '1px solid #ccc', boxSizing: 'border-box' }} />
        {err && <p style={{ fontSize: 13, color: '#c0392b', marginBottom: 10 }}>{err}</p>}
        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: 10, borderRadius: 8, background: '#1a2744', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>
    </div>
  )
}

const emptyForm = { name: '', phone: '', channel: 'Instagram', service: SERVICES[0], note: '', result: 'Görüşülüyor', saleAmount: '', appointmentAt: '' }

function toLocalInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function LeadForm({ onAdd, onUpdate, currentUser, editing, onCancelEdit }) {
  const [form, setForm] = useState(editing ? { ...editing, saleAmount: editing.sale_amount != null ? String(editing.sale_amount) : '', appointmentAt: toLocalInputValue(editing.appointment_at) } : emptyForm)
  const [saved, setSaved] = useState(false)
  const [phoneErr, setPhoneErr] = useState('')
  const [noteErr, setNoteErr] = useState('')
  const [appointmentErr, setAppointmentErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setForm(editing ? { ...editing, saleAmount: editing.sale_amount != null ? String(editing.sale_amount) : '', appointmentAt: toLocalInputValue(editing.appointment_at) } : emptyForm)
    setPhoneErr(''); setNoteErr(''); setAppointmentErr('')
  }, [editing])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    let ok = true
    if (!PHONE_RE.test(form.phone.trim())) { setPhoneErr('Telefon +90 ile başlayıp boşluksuz, sadece sayı içermeli. Örnek: +905551234567'); ok = false }
    else setPhoneErr('')
    if (!form.note.trim()) { setNoteErr('Görüşme notu olmadan kayıt eklenemez.'); ok = false }
    else setNoteErr('')
    if (form.result === 'Randevu aldı' && !form.appointmentAt) { setAppointmentErr('Randevu aldı seçildiğinde tarih ve saat girilmesi zorunludur.'); ok = false }
    else setAppointmentErr('')
    if (!form.name.trim()) ok = false
    if (!ok) return

    setSubmitting(true)
    const saleAmount = form.result === 'Müşteri oldu' && form.saleAmount.trim() !== '' ? Number(form.saleAmount) : null
    const appointmentAt = form.appointmentAt ? new Date(form.appointmentAt).toISOString() : null

    if (editing) {
      await onUpdate({
        id: editing.id, name: form.name, phone: form.phone, channel: form.channel,
        service: form.service, note: form.note, result: form.result, sale_amount: saleAmount,
        appointment_at: appointmentAt, edited_at: new Date().toISOString()
      })
    } else {
      await onAdd({
        id: uid(), branch_id: currentUser.branch_id, name: form.name, phone: form.phone,
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
    <form onSubmit={submit} style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>{editing ? 'Kaydı düzenle' : 'Yeni görüşme kaydı'}</p>
        {editing && <button type="button" onClick={onCancelEdit} style={{ fontSize: 12 }}>Vazgeç</button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <input placeholder="İsim soyisim" value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
        <div>
          <input placeholder="+905551234567" value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} />
          {phoneErr && <p style={{ fontSize: 12, color: '#c0392b', margin: '4px 0 0' }}>{phoneErr}</p>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <select value={form.channel} onChange={e => set('channel', e.target.value)} style={inputStyle}>
          {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={form.result} onChange={e => set('result', e.target.value)} style={inputStyle}>
          {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <select value={form.service} onChange={e => set('service', e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: 10 }}>
        {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <div style={{ marginBottom: 10 }}>
        <input type="datetime-local" value={form.appointmentAt} onChange={e => { set('appointmentAt', e.target.value); if (e.target.value) setAppointmentErr('') }} style={{ ...inputStyle, width: '100%' }} />
        <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
          {form.result === 'Randevu aldı' ? 'Randevu tarihi ve saati zorunludur.' : 'Randevu tarihi/saati — varsa girin, takvimde görünür. Boş bırakılabilir.'}
        </p>
        {appointmentErr && <p style={{ fontSize: 12, color: '#c0392b', margin: '4px 0 0' }}>{appointmentErr}</p>}
      </div>
      {form.result === 'Müşteri oldu' && (
        <div style={{ marginBottom: 10 }}>
          <input placeholder="Satış tutarı (TL) — isteğe bağlı" value={form.saleAmount} onChange={e => set('saleAmount', e.target.value)} type="number" min="0" style={{ ...inputStyle, width: '100%' }} />
          <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Bu alan zorunlu değildir, doldurmak istemezseniz boş bırakabilirsiniz.</p>
        </div>
      )}
      <textarea placeholder="Görüşme notu (zorunlu)" value={form.note} onChange={e => set('note', e.target.value)} rows={2}
        style={{ width: '100%', marginBottom: 4, fontFamily: 'inherit', fontSize: 14, padding: 10, border: '1px solid #ccc', borderRadius: 8, boxSizing: 'border-box' }} />
      {noteErr && <p style={{ fontSize: 12, color: '#c0392b', margin: '0 0 10px' }}>{noteErr}</p>}
      <button type="submit" disabled={submitting} style={{ marginTop: 8, padding: '8px 16px', borderRadius: 8, background: '#1a2744', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
        {submitting ? 'Kaydediliyor...' : (editing ? 'Güncelle' : 'Kaydet')}
      </button>
      {saved && <span style={{ marginLeft: 10, fontSize: 13, color: '#2e7d32' }}>{editing ? 'Güncellendi' : 'Kaydedildi'}</span>}
    </form>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: '#f4f5f7', borderRadius: 10, padding: '1rem' }}>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{value}</p>
    </div>
  )
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const WEEKDAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function dateKey(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function AppointmentCalendar({ leads, canSeePhone, currentUserName, isStaff, showBranch, branchNameFn }) {
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)

  const scopedLeads = useMemo(() =>
    leads.filter(l => isStaff ? l.entered_by === currentUserName : true).filter(l => l.appointment_at),
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

  const selectedKey = selectedDay ? dateKey(new Date(year, month, selectedDay)) : null
  const selectedLeads = selectedKey ? (leadsByDay[selectedKey] || []) : []

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button type="button" onClick={() => changeMonth(-1)} style={{ padding: '4px 10px', borderRadius: 8 }}>‹</button>
        <p style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>{MONTH_NAMES[month]} {year}</p>
        <button type="button" onClick={() => changeMonth(1)} style={{ padding: '4px 10px', borderRadius: 8 }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {WEEKDAY_NAMES.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 11, color: '#888', fontWeight: 600 }}>{w}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={'e' + i} />
          const key = dateKey(new Date(year, month, d))
          const dayLeads = leadsByDay[key] || []
          const isToday = key === todayKey
          const isSelected = key === selectedKey
          return (
            <button key={d} type="button" onClick={() => setSelectedDay(d)}
              style={{
                position: 'relative', padding: '8px 4px', minHeight: 44, borderRadius: 8, textAlign: 'left',
                background: isSelected ? '#1a2744' : (isToday ? '#eef2f8' : '#fafafa'),
                color: isSelected ? '#fff' : '#222',
                border: isToday && !isSelected ? '1px solid #1a2744' : '1px solid #eee',
                cursor: 'pointer', fontSize: 13
              }}>
              <span>{d}</span>
              {dayLeads.length > 0 && (
                <span style={{
                  display: 'block', marginTop: 4, fontSize: 10, fontWeight: 700,
                  color: isSelected ? '#fff' : '#1a2744'
                }}>
                  {dayLeads.length} randevu
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
            <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: 13, borderBottom: '1px solid #f0f0f0' }}>
              <span>
                <span style={{ fontWeight: 600 }}>{lead.name}</span>
                <span style={{ color: '#777', marginLeft: 8 }}>{canSeePhone ? lead.phone : '••• gizli'}</span>
                {showBranch && <span style={{ color: '#777', marginLeft: 8, fontSize: 12 }}>· {branchNameFn(lead.branch_id)}</span>}
                <span style={{ color: '#777', marginLeft: 8, fontSize: 12 }}>· {lead.service}</span>
                {lead.note && <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>· {lead.note.slice(0, 40)}</span>}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>
                {new Date(lead.appointment_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StaleAlerts({ leads, canSeePhone, currentUserName, isStaff }) {
  const stale = useMemo(() =>
    leads
      .filter(l => isStaff ? l.entered_by === currentUserName : true)
      .map(l => ({ lead: l, s: staleness(l) }))
      .filter(x => x.s)
      .sort((a, b) => b.s.days - a.s.days),
    [leads, currentUserName, isStaff])

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
            <span style={{ color: '#777', marginLeft: 8 }}>{canSeePhone ? lead.phone : '••• gizli'}</span>
            <span style={{ color: '#777', marginLeft: 8, fontSize: 12 }}>· {lead.result}</span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: s.level === 'critical' ? '#c0392b' : '#b8860b' }}>{s.days} gün önce — tekrar ara</span>
        </div>
      ))}
      {stale.length > 8 && <p style={{ fontSize: 12, color: '#777', margin: '8px 0 0' }}>+ {stale.length - 8} kayıt daha</p>}
    </div>
  )
}

function LeadRow({ lead, canSeePhone, canEdit, onEdit, showBranch, branchName }) {
  const s = staleness(lead)
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: showBranch ? '0.8fr 0.9fr 0.9fr 0.6fr 0.9fr 0.9fr 0.6fr 0.6fr 0.5fr 0.4fr' : '1fr 1fr 0.7fr 1fr 1fr 0.7fr 0.6fr 0.6fr 0.4fr',
      gap: 8, padding: '10px 0', borderBottom: '1px solid #eee', fontSize: 13, alignItems: 'center'
    }}>
      {showBranch && <span style={{ fontSize: 12, color: '#777' }}>{branchName}</span>}
      <span style={{ fontWeight: 600 }}>{lead.name}</span>
      <span style={{ color: '#777' }}>{canSeePhone ? lead.phone : '••• gizli'}</span>
      <span>{lead.channel}</span>
      <span style={{ color: '#777', fontSize: 12 }}>{lead.service || '—'}</span>
      <span style={{ fontSize: 12, color: '#777' }}>{lead.note ? lead.note.slice(0, 30) : '—'}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: RESULT_COLOR[lead.result] }}>{lead.result}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#2e7d32' }}>{lead.sale_amount != null ? fmtTL(lead.sale_amount) : '—'}</span>
      {s ? <span style={{ fontSize: 11, fontWeight: 600, color: s.level === 'critical' ? '#c0392b' : '#b8860b' }}>{s.days}g</span> : <span />}
      {canEdit ? <button onClick={() => onEdit(lead)} style={{ fontSize: 12, padding: '4px 8px' }}>✎</button> : <span />}
    </div>
  )
}

function WeeklyAdsForm({ onAdd, branches, selectedBranch, onSelectBranch }) {
  const [form, setForm] = useState({ spend: '', impressions: '', messages: '' })
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  async function submit(e) {
    e.preventDefault()
    await onAdd({ id: uid(), branch_id: selectedBranch, date: new Date().toISOString(), spend: Number(form.spend) || 0, impressions: Number(form.impressions) || 0, messages: Number(form.messages) || 0 })
    setForm({ spend: '', impressions: '', messages: '' })
  }
  return (
    <form onSubmit={submit} style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem', marginTop: '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 12px' }}>Haftalık reklam verisi gir (admin)</p>
      <select value={selectedBranch} onChange={e => onSelectBranch(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: 10 }}>
        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <input placeholder="Harcama (TL)" value={form.spend} onChange={e => set('spend', e.target.value)} style={inputStyle} />
        <input placeholder="Gösterim" value={form.impressions} onChange={e => set('impressions', e.target.value)} style={inputStyle} />
        <input placeholder="Mesaj sayısı" value={form.messages} onChange={e => set('messages', e.target.value)} style={inputStyle} />
      </div>
      <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, background: '#1a2744', color: '#fff', border: 'none', cursor: 'pointer' }}>Haftalık veriyi kaydet</button>
    </form>
  )
}

function BranchManagement({ branches, onAdd }) {
  const [name, setName] = useState('')
  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    await onAdd({ id: uid(), name: name.trim() })
    setName('')
  }
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem', marginTop: '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 12px' }}>Şube ekle</p>
      <form onSubmit={submit} style={{ display: 'flex', gap: 10 }}>
        <input placeholder="Şube adı (örn. Aris Kadıköy)" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, background: '#1a2744', color: '#fff', border: 'none', cursor: 'pointer' }}>Ekle</button>
      </form>
      <div style={{ marginTop: 12 }}>
        {branches.map(b => <p key={b.id} style={{ fontSize: 13, margin: '4px 0', color: '#666' }}>🏪 {b.name}</p>)}
      </div>
    </div>
  )
}

function UserManagement({ users, onToggle, branches }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem', marginTop: '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>Erişim yönetimi</p>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px' }}>Ödeme alınmazsa ilgili şubenin erişimini buradan askıya alabilirsin.</p>
      {users.filter(u => u.role !== 'admin').map(u => {
        const branch = branches.find(b => b.id === u.branch_id)
        return (
          <div key={u.username} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{u.username}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#777' }}>{(u.role === 'manager' ? 'Şube yöneticisi · ' : 'Personel · ') + (branch ? branch.name : '—')}</p>
            </div>
            <button onClick={() => onToggle(u.username, u.active)} style={{ fontSize: 12, color: u.active === false ? '#2e7d32' : '#c0392b' }}>
              {u.active === false ? 'Erişimi aç' : 'Erişimi askıya al'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function ChartLegend({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8, fontSize: 12, color: '#666' }}>
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
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
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

function RevenueByServiceChart({ leads }) {
  const ref = useRef(null)
  const chartRef = useRef(null)
  const sums = useMemo(() => {
    const s = {}; SERVICES.forEach(sv => s[sv] = 0)
    leads.forEach(l => { if (l.result === 'Müşteri oldu' && l.sale_amount != null && s[l.service] !== undefined) s[l.service] += Number(l.sale_amount) })
    return s
  }, [leads])
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: { labels: SERVICES, datasets: [{ label: 'Ciro (TL)', data: SERVICES.map(s => sums[s]), backgroundColor: SERVICES.map(s => SERVICE_HEX[s]) }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [sums])
  return <div style={{ position: 'relative', width: '100%', height: 200 }}><canvas ref={ref} /></div>
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
    <div style={{ background: '#f4f5f7', borderRadius: 12, padding: '1rem 1.25rem', marginTop: '1.5rem', fontSize: 12, color: '#666' }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#222' }}>🔒 Veri koruma durumu</p>
      <p style={{ margin: '2px 0' }}>✓ Toplu dışa aktarma (CSV/Excel indirme) kapalı — sadece görüntüleme</p>
      <p style={{ margin: '2px 0' }}>✓ Telefon numaraları personelden gizli, sadece admin/yönetici görür</p>
      <p style={{ margin: '2px 0' }}>✓ Her şube verisi izole — diğer şubeler birbirini göremez</p>
      <p style={{ margin: '2px 0' }}>✓ Erişim, ödeme durumuna göre anında askıya alınabilir</p>
    </div>
  )
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mt_current_user')
      return saved ? JSON.parse(saved) : null
    } catch (e) { return null }
  })
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])
  const [leads, setLeads] = useState([])
  const [adsData, setAdsData] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [adsSelectedBranch, setAdsSelectedBranch] = useState('')
  const [filterBranch, setFilterBranch] = useState('all')

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
    const [b, u, l, a] = await Promise.all([
      supabase.from('branches').select('*').order('name'),
      supabase.from('app_users').select('*'),
      supabase.from('leads').select('*').order('date', { ascending: false }),
      supabase.from('ads_data').select('*').order('date', { ascending: false })
    ])
    setBranches(b.data || [])
    setUsers(u.data || [])
    setLeads(l.data || [])
    setAdsData(a.data || [])
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
    const { data } = await supabase.from('leads').insert(lead).select()
    if (data) setLeads(prev => [data[0], ...prev])
  }
  async function updateLead(updated) {
    const { data } = await supabase.from('leads').update(updated).eq('id', updated.id).select()
    if (data) setLeads(prev => prev.map(l => l.id === updated.id ? data[0] : l))
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
  async function addBranch(branch) {
    const { data } = await supabase.from('branches').insert(branch).select()
    if (data) setBranches(prev => [...prev, data[0]])
  }

  if (!currentUser) return <Login onLogin={loginAndPersist} />
  if (!loaded) return <p style={{ padding: 40, fontFamily: 'system-ui' }}>Yükleniyor...</p>

  const isAdmin = currentUser.role === 'admin'
  const isManager = currentUser.role === 'manager'
  const isStaff = currentUser.role === 'staff'

  const scopedLeads = isAdmin ? (filterBranch === 'all' ? leads : leads.filter(l => l.branch_id === filterBranch)) : leads.filter(l => l.branch_id === currentUser.branch_id)
  const visibleLeads = isStaff ? scopedLeads.filter(l => l.entered_by === currentUser.username) : scopedLeads
  const scopedAds = isAdmin ? (filterBranch === 'all' ? adsData : adsData.filter(a => a.branch_id === filterBranch)) : adsData.filter(a => a.branch_id === currentUser.branch_id)

  function canEditLead(lead) {
    if (isAdmin || isManager) return true
    if (isStaff) return lead.entered_by === currentUser.username
    return false
  }
  function branchName(id) { return (branches.find(b => b.id === id) || {}).name || '—' }

  const customers = scopedLeads.filter(l => l.result === 'Müşteri oldu')
  const withAmount = customers.filter(l => l.sale_amount != null)
  const revenue = customers.reduce((s, l) => s + (Number(l.sale_amount) || 0), 0)
  const avgTicket = withAmount.length ? Math.round(revenue / withAmount.length) : 0
  const stats = {
    total: scopedLeads.length,
    customers: customers.length,
    ig: scopedLeads.filter(l => l.channel === 'Instagram').length,
    wa: scopedLeads.filter(l => l.channel === 'WhatsApp').length,
    organik: scopedLeads.filter(l => l.channel === 'Organik').length,
    rate: scopedLeads.length ? Math.round((customers.length / scopedLeads.length) * 100) : 0,
    revenue, avgTicket, withAmountCount: withAmount.length
  }
  const totalSpend = scopedAds.reduce((s, w) => s + Number(w.spend), 0)

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>Lead takip paneli</p>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
            {currentUser.username} · {isAdmin ? 'tüm şubeler' : isManager ? `şube yöneticisi · ${branchName(currentUser.branch_id)}` : `personel · ${branchName(currentUser.branch_id)}`}
          </p>
        </div>
        <button onClick={logoutAndClear} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', color: '#1a2744', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>Çıkış yap</button>
      </div>

      {isAdmin && (
        <div style={{ marginBottom: '1.5rem' }}>
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ ...inputStyle, width: 240 }}>
            <option value="all">Tüm şubeler (toplu rapor)</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      <AppointmentCalendar leads={visibleLeads} canSeePhone={isAdmin || isManager} currentUserName={currentUser.username} isStaff={isStaff} showBranch={isAdmin && filterBranch === 'all'} branchNameFn={branchName} />

      <StaleAlerts leads={visibleLeads} canSeePhone={isAdmin || isManager} currentUserName={currentUser.username} isStaff={isStaff} />

      {!isStaff && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 12 }}>
          <StatCard label="Toplam lead" value={stats.total} />
          <StatCard label="Müşteriye dönüşen" value={stats.customers} />
          <StatCard label="Dönüşüm oranı" value={stats.rate + '%'} />
          <StatCard label="IG / WA" value={stats.ig + ' / ' + stats.wa} />
          <StatCard label="Organik" value={stats.organik} />
        </div>
      )}

      {!isStaff && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
          <StatCard label="Toplam ciro (girilen)" value={fmtTL(stats.revenue)} />
          <StatCard label="Ortalama satış tutarı" value={stats.withAmountCount ? fmtTL(stats.avgTicket) : '—'} />
          <StatCard label="Tutar girilen satış" value={`${stats.withAmountCount} / ${stats.customers}`} />
        </div>
      )}

      {!isStaff && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 12px' }}>Aylık rapor — grafikler</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1rem' }}>
              <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px' }}>Görüşme sonuçları</p>
              <ResultBarChart leads={scopedLeads} />
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1rem' }}>
              <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px' }}>Lead kanalı dağılımı</p>
              <ChannelPieChart leads={scopedLeads} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: scopedAds.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1rem' }}>
              <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px' }}>Hizmete göre ciro</p>
              <RevenueByServiceChart leads={scopedLeads} />
            </div>
            {scopedAds.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1rem' }}>
                <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px' }}>Haftalık reklam harcaması</p>
                <MonthlySpendChart adsData={scopedAds} />
              </div>
            )}
          </div>
        </div>
      )}

      <LeadForm onAdd={addLead} onUpdate={updateLead} currentUser={currentUser} editing={editingLead} onCancelEdit={() => setEditingLead(null)} />

      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 10px' }}>
          {isStaff ? 'Senin girdiğin kayıtlar' : (isAdmin && filterBranch === 'all' ? 'Tüm şubeler — kayıtlar' : 'Şube kayıtları')}
        </p>
        {visibleLeads.length === 0 ? (
          <p style={{ fontSize: 13, color: '#666' }}>Henüz kayıt yok.</p>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '0 1.25rem', overflowX: 'auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: (isAdmin && filterBranch === 'all') ? '0.8fr 0.9fr 0.9fr 0.6fr 0.9fr 0.9fr 0.6fr 0.6fr 0.5fr 0.4fr' : '1fr 1fr 0.7fr 1fr 1fr 0.7fr 0.6fr 0.6fr 0.4fr',
              gap: 8, padding: '10px 0', borderBottom: '1px solid #ddd', fontSize: 12, color: '#666', minWidth: 760
            }}>
              {(isAdmin && filterBranch === 'all') && <span>şube</span>}
              <span>isim</span><span>telefon</span><span>kanal</span><span>hizmet</span><span>not</span><span>sonuç</span><span>tutar</span><span>takip</span><span></span>
            </div>
            {visibleLeads.map(l => (
              <LeadRow key={l.id} lead={l} canSeePhone={isAdmin || isManager} canEdit={canEditLead(l)} onEdit={setEditingLead}
                showBranch={isAdmin && filterBranch === 'all'} branchName={branchName(l.branch_id)} />
            ))}
          </div>
        )}
      </div>

      {isAdmin && <WeeklyAdsForm onAdd={addAdsWeek} branches={branches} selectedBranch={adsSelectedBranch} onSelectBranch={setAdsSelectedBranch} />}
      {isAdmin && <BranchManagement branches={branches} onAdd={addBranch} />}
      {isAdmin && <UserManagement users={users} onToggle={toggleActive} branches={branches} />}
      <SecurityNotice isAdmin={isAdmin} />
    </div>
  )
}
