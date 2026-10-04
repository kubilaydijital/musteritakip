import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import usePageMeta from '../usePageMeta.js'
import { BOOKING_TIME_ZONE, bookingDateWindow, turkeyDateString } from '../lib/booking.js'

export default function BookingPage() {
  const { branchId } = useParams()
  usePageMeta('Randevu Al', 'Hemen online randevu alın, kredi kartı veya kayıt gerekmez.')

  const [selectedDate, setSelectedDate] = useState(() => turkeyDateString())
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsErr, setSlotsErr] = useState('')
  const [branchName, setBranchName] = useState('')

  const [selectedTime, setSelectedTime] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '+90', service: '' })
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [availabilityRevision, setAvailabilityRevision] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function loadSlots() {
      setSlotsLoading(true)
      setSlots([])
      setSlotsErr('')
      setSelectedTime(null)
      try {
        const res = await fetch(`/.netlify/functions/availability?branch_id=${encodeURIComponent(branchId)}&date=${selectedDate}`, { cache: 'no-store' })
        const data = await res.json()
        if (cancelled) return
        if (res.ok) {
          setSlots(data.slots || [])
          setBranchName(data.branch_name || '')
          if (data.reason) setSlotsErr(data.reason)
        } else {
          setSlotsErr(data.error || 'Müsaitlik bilgisi alınamadı')
          setSlots([])
        }
      } catch {
        if (!cancelled) { setSlotsErr('Müsaitlik bilgisi alınamadı, lütfen tekrar deneyin.'); setSlots([]) }
      }
      if (!cancelled) setSlotsLoading(false)
    }
    loadSlots()
    return () => { cancelled = true }
  }, [branchId, selectedDate, availabilityRevision])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (status === 'submitting' || slotsLoading || !selectedTime || !slots.includes(selectedTime) || !form.name.trim() || !form.phone.trim()) return
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/.netlify/functions/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: branchId, name: form.name.trim(), phone: form.phone.trim(),
          service: form.service.trim(), date: selectedDate, time: selectedTime,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('done')
      } else {
        setErrorMsg(data.error || 'Randevu oluşturulamadı, lütfen tekrar deneyin.')
        setStatus('error')
        if (res.status === 409) {
          setSelectedTime(null)
          setAvailabilityRevision(value => value + 1)
        }
      }
    } catch {
      setErrorMsg('Bir şeyler ters gitti, lütfen tekrar deneyin.')
      setStatus('error')
    }
  }

  const { minDate, maxDate } = bookingDateWindow()

  if (status === 'done') {
    return (
      <Layout>
        <main className="page">
          <section className="container trial-card" style={{ textAlign: 'center' }}>
            <span className="page-no">✅ Randevunuz Alındı</span>
            <h1>Görüşmek üzere!</h1>
            <p>
              {new Date(`${selectedDate}T12:00:00+03:00`).toLocaleDateString('tr-TR', { timeZone: BOOKING_TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric' })}{' '}
              tarihinde saat <strong>{selectedTime}</strong> için randevunuz oluşturuldu.
              {branchName ? ` (${branchName})` : ''}
            </p>
          </section>
        </main>
      </Layout>
    )
  }

  return (
    <Layout>
      <main className="page">
        <section className="container trial-card">
          <span className="page-no">Online Randevu</span>
          <h1>{branchName || 'Randevu Al'}</h1>
          <p>Aşağıdan size uygun bir gün ve saat seçin.</p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tarih</label>
            <input type="date" value={selectedDate} min={minDate} max={maxDate} disabled={status === 'submitting'}
              onChange={e => { setSelectedDate(e.target.value); setErrorMsg(''); setStatus('idle') }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Müsait saatler</label>
            {slotsLoading && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Yükleniyor...</p>}
            {!slotsLoading && slotsErr && <p style={{ fontSize: 13, color: 'var(--muted)' }}>{slotsErr}</p>}
            {!slotsLoading && !slotsErr && slots.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Bu gün için boş saat kalmadı, başka bir tarih seçin.</p>
            )}
            {!slotsLoading && slots.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {slots.map(s => (
                  <button key={s} type="button" disabled={status === 'submitting'} onClick={() => { setSelectedTime(s); setErrorMsg(''); setStatus('idle') }} style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                    border: selectedTime === s ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,.15)',
                    background: selectedTime === s ? 'var(--primary)' : 'transparent',
                    color: selectedTime === s ? '#fff' : 'inherit',
                  }}>{s}</button>
                ))}
              </div>
            )}
          </div>

          {errorMsg && <p role="alert" style={{ color: 'var(--red)', fontSize: 14 }}>{errorMsg}</p>}
          {selectedTime && !slotsLoading && slots.includes(selectedTime) && (
            <form onSubmit={submit}>
              <input placeholder="Ad Soyad" value={form.name} onChange={e => set('name', e.target.value)} disabled={status === 'submitting'} required />
              <input placeholder="Telefon (+905551234567)" value={form.phone} disabled={status === 'submitting'} onChange={e => {
                let v = e.target.value
                if (!v.startsWith('+90')) v = '+90' + v.replace(/^\+?90?/, '')
                set('phone', v)
              }} required />
              <input placeholder="Hangi hizmet için? (isteğe bağlı)" value={form.service} disabled={status === 'submitting'} onChange={e => set('service', e.target.value)} />
              <button className="btn btn-primary" type="submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Randevu oluşturuluyor...' : `${selectedTime} için randevu al`}
              </button>
            </form>
          )}
        </section>
      </main>
    </Layout>
  )
}
