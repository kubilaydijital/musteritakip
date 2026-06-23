import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabaseClient'
import {
  Chart, BarController, BarElement, DoughnutController, ArcElement,
  LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip
} from 'chart.js'

Chart.register(BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip)

const CHANNELS = ['Instagram', 'WhatsApp', 'Organik']
const RESULTS = ['Randevu aldı', 'Görüşüldü, randevu alınamadı', 'Vazgeçti', 'Müşteri oldu']
const OPEN_RESULTS = []
const RESULT_COLOR = { 'Randevu aldı': '#0F6E56', 'Görüşüldü, randevu alınamadı': '#6B6B6B', 'Vazgeçti': '#A32D2D', 'Müşteri oldu': '#3B6D11' }
const RESULT_HEX = { 'Randevu aldı': '#1D9E75', 'Görüşüldü, randevu alınamadı': '#9CA3AF', 'Vazgeçti': '#E24B4A', 'Müşteri oldu': '#639922' }
const CHANNEL_HEX = { 'Instagram': '#D4537E', 'WhatsApp': '#1D9E75', 'Organik': '#7F77DD' }
const SERVICE_COLOR_PALETTE = ['#D4537E', '#378ADD', '#1D9E75', '#EF9F27', '#7F77DD', '#E24B4A', '#639922', '#854F0B']
const PHONE_RE = /^\+\d{10,15}$/
const WARN_DAYS = 7
const CRITICAL_DAYS = 14

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function daysSince(dateStr) { return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000) }
function lastTouch(lead) { return lead.edited_at || lead.date }
function staleness(lead) {
  if (lead.result !== 'Randevu aldı' || !lead.appointment_at) return null
  const d = daysSince(lead.appointment_at)
  if (d < 0) return null // randevu henüz geçmedi
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

const emptyForm = { name: '', phone: '+90', channel: 'Instagram', service: '', note: '', result: 'Görüşülüyor', saleAmount: '', appointmentAt: '' }

function toLocalInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function LeadForm({ onAdd, onUpdate, onDelete, canDelete, currentUser, editing, onCancelEdit, services }) {
  const [form, setForm] = useState(editing ? { ...editing, saleAmount: editing.sale_amount != null ? Number(editing.sale_amount).toLocaleString('tr-TR') : '', appointmentAt: toLocalInputValue(editing.appointment_at) } : emptyForm)
  const [saved, setSaved] = useState(false)
  const [phoneErr, setPhoneErr] = useState('')
  const [noteErr, setNoteErr] = useState('')
  const [appointmentErr, setAppointmentErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    setForm(editing ? { ...editing, saleAmount: editing.sale_amount != null ? Number(editing.sale_amount).toLocaleString('tr-TR') : '', appointmentAt: toLocalInputValue(editing.appointment_at) } : emptyForm)
    setPhoneErr(''); setNoteErr(''); setAppointmentErr(''); setConfirmingDelete(false)
  }, [editing])

  useEffect(() => {
    if (!editing && !form.service && services && services.length > 0) {
      set('service', services[0].name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleDelete() {
    if (!confirmingDelete) { setConfirmingDelete(true); return }
    await onDelete(editing.id)
  }

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
    const saleAmount = form.result === 'Müşteri oldu' && form.saleAmount.trim() !== '' ? Number(form.saleAmount.replace(/\./g, '')) : null
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
          <input placeholder="+905551234567" value={form.phone} onChange={e => {
            let v = e.target.value
            if (!v.startsWith('+90')) v = '+90' + v.replace(/^\+?90?/, '')
            set('phone', v)
          }} style={inputStyle} />
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
        {(!services || services.length === 0) && <option value="">Hizmet listesi tanımlanmamış</option>}
        {(services || []).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
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
          <input placeholder="Satış tutarı (TL) — isteğe bağlı" value={form.saleAmount} onChange={e => {
            const digits = e.target.value.replace(/\D/g, '')
            const formatted = digits ? Number(digits).toLocaleString('tr-TR') : ''
            set('saleAmount', formatted)
          }} type="text" inputMode="numeric" style={{ ...inputStyle, width: '100%' }} />
          <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Bu alan zorunlu değildir, doldurmak istemezseniz boş bırakabilirsiniz.</p>
        </div>
      )}
      <textarea placeholder="Görüşme notu (zorunlu)" value={form.note} onChange={e => set('note', e.target.value)} rows={2}
        style={{ width: '100%', marginBottom: 4, fontFamily: 'inherit', fontSize: 14, padding: 10, border: '1px solid #ccc', borderRadius: 8, boxSizing: 'border-box' }} />
      {noteErr && <p style={{ fontSize: 12, color: '#c0392b', margin: '0 0 10px' }}>{noteErr}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <button type="submit" disabled={submitting} style={{ padding: '8px 16px', borderRadius: 8, background: '#1a2744', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
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
  function jumpToYear(y) {
    setViewDate(new Date(Number(y), month, 1))
    setSelectedDay(null)
  }
  function jumpToMonth(m) {
    setViewDate(new Date(year, Number(m), 1))
    setSelectedDay(null)
  }

  const yearOptions = []
  for (let y = 2022; y <= new Date().getFullYear() + 1; y++) yearOptions.push(y)

  const selectedKey = selectedDay ? dateKey(new Date(year, month, selectedDay)) : null
  const selectedLeads = selectedKey ? (leadsByDay[selectedKey] || []) : []

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 }}>
        <button type="button" onClick={() => changeMonth(-1)} style={{ padding: '4px 10px', borderRadius: 8 }}>‹</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={month} onChange={e => jumpToMonth(e.target.value)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14, fontWeight: 600 }}>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => jumpToYear(e.target.value)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14, fontWeight: 600 }}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
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

function BranchManagement({ branches, onAdd, onToggleActive }) {
  const [name, setName] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    await onAdd({ id: uid(), name: name.trim() })
    setName('')
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem', marginTop: '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>Şube ekle</p>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px' }}>Bir şubeyi pasif yaparsan panelde görünmez ama tüm verisi (kayıtlar, kullanıcılar) korunur, istediğin zaman tekrar aktif edebilirsin.</p>
      <form onSubmit={submit} style={{ display: 'flex', gap: 10 }}>
        <input placeholder="Şube adı (örn. Aris Kadıköy)" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, background: '#1a2744', color: '#fff', border: 'none', cursor: 'pointer' }}>Ekle</button>
      </form>
      <div style={{ marginTop: 12 }}>
        {branches.map(b => (
          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <p style={{ fontSize: 13, margin: 0, color: b.active === false ? '#bbb' : '#666' }}>🏪 {b.name}{b.active === false ? ' (pasif)' : ''}</p>
            <button onClick={() => onToggleActive(b.id, b.active)} style={{
              fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
              border: b.active === false ? '1px solid #2e7d32' : '1px solid #c0392b',
              background: b.active === false ? '#2e7d32' : '#c0392b',
              color: '#fff'
            }}>
              {b.active === false ? 'Aktif et' : 'Pasif yap'}
            </button>
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
    <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem', marginTop: '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>Hizmet listesi {branchName ? `· ${branchName}` : ''}</p>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px' }}>Bu şubenin görüşme formunda görünecek hizmetleri buradan yönetebilirsin.</p>
      <form onSubmit={submit} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <input placeholder="Hizmet adı (örn. Saç boyama)" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, background: '#1a2744', color: '#fff', border: 'none', cursor: 'pointer' }}>Ekle</button>
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
function UserManagement({ users, onToggle, onAdd, onDelete, onChangePassword, onChangeUsername, branches, templates }) {
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newBranchId, setNewBranchId] = useState(branches[0]?.id || '')
  const [newTemplateId, setNewTemplateId] = useState('')
  const [addErr, setAddErr] = useState('')
  const [editingPwFor, setEditingPwFor] = useState(null)
  const [pwValue, setPwValue] = useState('')
  const [editingUsernameFor, setEditingUsernameFor] = useState(null)
  const [usernameValue, setUsernameValue] = useState('')
  const [usernameErr, setUsernameErr] = useState('')
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
    await onAdd({ username: newUsername.trim(), password: newPassword.trim(), branch_id: newBranchId, permission_template_id: newTemplateId, active: true })
    setNewUsername(''); setNewPassword('')
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

  async function handleDelete(username) {
    if (confirmingDeleteFor !== username) { setConfirmingDeleteFor(username); return }
    await onDelete(username)
    setConfirmingDeleteFor(null)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem', marginTop: '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>Erişim yönetimi</p>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px' }}>Ödeme alınmazsa ilgili şubenin erişimini buradan askıya alabilirsin.</p>

      {users.filter(u => u.role !== 'admin' || u.permission_template_id !== 'tpl_super_admin').map(u => {
        const branch = branches.find(b => b.id === u.branch_id)
        const tplName = (templates || []).find(t => t.id === u.permission_template_id)?.name || u.role
        return (
          <div key={u.username} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{u.username}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#777' }}>{tplName} · {branch ? branch.name : '—'}</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setEditingPwFor(editingPwFor === u.username ? null : u.username); setPwValue(''); setEditingUsernameFor(null) }}
                  style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', color: '#1a2744', cursor: 'pointer', fontWeight: 500 }}>
                  Şifre değiştir
                </button>
                <button onClick={() => { setEditingUsernameFor(editingUsernameFor === u.username ? null : u.username); setUsernameValue(u.username); setEditingPwFor(null) }}
                  style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', color: '#1a2744', cursor: 'pointer', fontWeight: 500 }}>
                  Kullanıcı adı değiştir
                </button>
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
              </div>
            </div>
            {editingPwFor === u.username && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input type="text" placeholder="Yeni şifre" value={pwValue} onChange={e => setPwValue(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => submitPasswordChange(u.username)} style={{ padding: '8px 14px', borderRadius: 8, background: '#1a2744', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Kaydet</button>
              </div>
            )}
            {editingUsernameFor === u.username && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="Yeni kullanıcı adı" value={usernameValue} onChange={e => setUsernameValue(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => submitUsernameChange(u.username)} style={{ padding: '8px 14px', borderRadius: 8, background: '#1a2744', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Kaydet</button>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input placeholder="Kullanıcı adı" value={newUsername} onChange={e => setNewUsername(e.target.value)} style={inputStyle} />
            <input placeholder="Şifre" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <select value={newBranchId} onChange={e => setNewBranchId(e.target.value)} style={inputStyle}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={newTemplateId} onChange={e => setNewTemplateId(e.target.value)} style={inputStyle}>
              <option value="">İzin şablonu seç...</option>
              {nonSuperAdminTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {addErr && <p style={{ fontSize: 12, color: '#c0392b', margin: '0 0 10px' }}>{addErr}</p>}
          <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, background: '#1a2744', color: '#fff', border: 'none', cursor: 'pointer' }}>Kullanıcı ekle</button>
        </form>
      </div>
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

function PermissionTemplateManager() {
  const [templates, setTemplates] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('permission_templates').select('*').order('name')
    setTemplates(data || [])
    setLoaded(true)
  }

  const [err, setErr] = useState('')

  async function toggle(tpl, key) {
    setErr('')
    const newValue = !tpl[key]
    setSavingId(tpl.id)
    const { data, error } = await supabase.from('permission_templates').update({ [key]: newValue }).eq('id', tpl.id).select()
    if (error) {
      setErr(`Kaydedilemedi: ${error.message}`)
    } else if (data && data.length > 0) {
      setTemplates(prev => prev.map(t => t.id === tpl.id ? data[0] : t))
    } else {
      setErr('Kaydedilemedi: değişiklik veritabanına yansımadı (RLS veya yetki sorunu olabilir).')
    }
    setSavingId(null)
  }

  if (!loaded) return null

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1.25rem', marginTop: '1.5rem' }}>
      <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>İzin şablonları (Süper Admin)</p>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 14px' }}>Her şablonun hangi yetkilere sahip olduğunu buradan açıp kapatabilirsin. Değişiklik anında tüm o şablona bağlı kullanıcılara uygulanır.</p>
      {err && <p style={{ fontSize: 13, color: '#c0392b', margin: '0 0 14px', fontWeight: 600 }}>{err}</p>}
      {templates.map(tpl => (
        <div key={tpl.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #eee' }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 8px' }}>{tpl.name}{savingId === tpl.id ? ' · kaydediliyor...' : ''}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {Object.keys(PERMISSION_LABELS).map(key => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!tpl[key]} onChange={() => toggle(tpl, key)} />
                {PERMISSION_LABELS[key]}
              </label>
            ))}
          </div>
        </div>
      ))}
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
  const [templates, setTemplates] = useState([])
  const [branchServices, setBranchServices] = useState([])
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
    const [b, u, l, a, t, bs] = await Promise.all([
      supabase.from('branches').select('*').order('name'),
      supabase.from('app_users').select('*'),
      supabase.from('leads').select('*').order('date', { ascending: false }),
      supabase.from('ads_data').select('*').order('date', { ascending: false }),
      supabase.from('permission_templates').select('*'),
      supabase.from('branch_services').select('*').order('name')
    ])
    setBranches(b.data || [])
    setUsers(u.data || [])
    setLeads(l.data || [])
    setAdsData(a.data || [])
    setTemplates(t.data || [])
    setBranchServices(bs.data || [])
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
  async function deleteLead(id) {
    await supabase.from('leads').delete().eq('id', id)
    setLeads(prev => prev.filter(l => l.id !== id))
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
  const visibleLeads = canSeeOwnDataOnly ? scopedLeads.filter(l => l.entered_by === currentUser.username) : scopedLeads
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
            {currentUser.username} · {isSuperAdmin ? 'süper admin · tüm şubeler' : canSeeOwnDataOnly ? `personel · ${branchName(currentUser.branch_id)}` : `admin · ${branchName(currentUser.branch_id)}`}
          </p>
        </div>
        <button onClick={logoutAndClear} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', color: '#1a2744', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>Çıkış yap</button>
      </div>

      {isSuperAdmin && (
        <div style={{ marginBottom: '1.5rem' }}>
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ ...inputStyle, width: 240 }}>
            <option value="all">Tüm şubeler (toplu rapor)</option>
            {branches.filter(b => b.active !== false).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {perms.can_see_calendar && (
        <AppointmentCalendar leads={visibleLeads} canSeePhone={perms.can_see_phone} currentUserName={currentUser.username} isStaff={canSeeOwnDataOnly} showBranch={isSuperAdmin && filterBranch === 'all'} branchNameFn={branchName} />
      )}

      <StaleAlerts leads={visibleLeads} canSeePhone={perms.can_see_phone} currentUserName={currentUser.username} isStaff={canSeeOwnDataOnly} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 12 }}>
        <StatCard label="Toplam lead" value={stats.total} />
        <StatCard label="Müşteriye dönüşen" value={stats.customers} />
        <StatCard label="Dönüşüm oranı" value={stats.rate + '%'} />
        <StatCard label="IG / WA" value={stats.ig + ' / ' + stats.wa} />
        <StatCard label="Organik" value={stats.organik} />
      </div>

      {perms.can_see_revenue && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
          <StatCard label="Toplam ciro (girilen)" value={fmtTL(stats.revenue)} />
          <StatCard label="Ortalama satış tutarı" value={stats.withAmountCount ? fmtTL(stats.avgTicket) : '—'} />
          <StatCard label="Tutar girilen satış" value={`${stats.withAmountCount} / ${stats.customers}`} />
        </div>
      )}

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
        {perms.can_see_revenue && (
          <div style={{ display: 'grid', gridTemplateColumns: scopedAds.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1rem' }}>
              <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px' }}>Hizmete göre ciro</p>
              <RevenueByServiceChart leads={scopedLeads} services={isSuperAdmin && filterBranch === 'all' ? Array.from(new Map(branchServices.map(s => [s.name, s])).values()) : currentBranchServices} />
            </div>
            {scopedAds.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '1rem' }}>
                <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px' }}>Haftalık reklam harcaması</p>
                <MonthlySpendChart adsData={scopedAds} />
              </div>
            )}
          </div>
        )}
      </div>

      {perms.can_add_lead && (
        <LeadForm onAdd={addLead} onUpdate={updateLead} onDelete={deleteLead} canDelete={canDeleteLead()} currentUser={currentUser} editing={editingLead} onCancelEdit={() => setEditingLead(null)} services={currentBranchServices} />
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 10px' }}>
          {canSeeOwnDataOnly ? 'Senin girdiğin kayıtlar' : (isSuperAdmin && filterBranch === 'all' ? 'Tüm şubeler — kayıtlar' : 'Şube kayıtları')}
        </p>
        {visibleLeads.length === 0 ? (
          <p style={{ fontSize: 13, color: '#666' }}>Henüz kayıt yok.</p>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '0 1.25rem', overflowX: 'auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: (isSuperAdmin && filterBranch === 'all') ? '0.8fr 0.9fr 0.9fr 0.6fr 0.9fr 0.9fr 0.6fr 0.6fr 0.5fr 0.4fr' : '1fr 1fr 0.7fr 1fr 1fr 0.7fr 0.6fr 0.6fr 0.4fr',
              gap: 8, padding: '10px 0', borderBottom: '1px solid #ddd', fontSize: 12, color: '#666', minWidth: 760
            }}>
              {(isSuperAdmin && filterBranch === 'all') && <span>şube</span>}
              <span>isim</span><span>telefon</span><span>kanal</span><span>hizmet</span><span>not</span><span>sonuç</span><span>tutar</span><span>takip</span><span></span>
            </div>
            {visibleLeads.map(l => (
              <LeadRow key={l.id} lead={l} canSeePhone={perms.can_see_phone} canEdit={canEditLead(l)} onEdit={setEditingLead}
                showBranch={isSuperAdmin && filterBranch === 'all'} branchName={branchName(l.branch_id)} />
            ))}
          </div>
        )}
      </div>

      {perms.can_enter_ads_data && <WeeklyAdsForm onAdd={addAdsWeek} branches={activeBranches} selectedBranch={adsSelectedBranch} onSelectBranch={setAdsSelectedBranch} />}
      {perms.can_manage_branches && <BranchManagement branches={branches} onAdd={addBranch} onToggleActive={toggleBranchActive} />}
      {!isSuperAdmin && !canSeeOwnDataOnly && (
        <BranchServiceManager
          services={currentBranchServices}
          branchId={currentUser.branch_id}
          branchName={branchName(currentUser.branch_id)}
          onAdd={addService}
          onDelete={deleteService}
        />
      )}
      {perms.can_manage_users && <UserManagement users={users} onToggle={toggleActive} onAdd={addUser} onDelete={deleteUser} onChangePassword={changeUserPassword} onChangeUsername={changeUsername} branches={activeBranches} templates={templates} />}
      {isSuperAdmin && <PermissionTemplateManager />}
      <SecurityNotice isAdmin={isSuperAdmin} />
    </div>
  )
}
