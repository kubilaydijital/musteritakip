import { useState } from 'react'
import { X } from 'lucide-react'
import { T } from './theme.js'
import { bookingAppointmentIso, turkeyDateString } from '../lib/booking.js'
import { followUpDateParts } from '../lib/followUps.js'
import { followUpConversionError, followUpConversionWriteError, parseFollowUpAmount } from '../lib/followUpConversions.js'

const field = { width: '100%', minWidth: 0, border: `1px solid ${T.border}`, borderRadius: 9, padding: '10px 11px', background: '#fff', color: T.text, font: 'inherit', fontSize: 13, boxSizing: 'border-box' }
const button = { border: `1px solid ${T.border}`, borderRadius: 9, padding: '8px 11px', background: '#fff', color: T.text, font: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }
const formatTime = value => new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const money = value => `${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2, maximumFractionDigits: 2 })} TL`

export function FollowUpHistory({ events, users, canSeeRevenue }) {
  const labels = { plan: 'Takip planla', contact: 'Takip sonucu kaydet', close: 'Takibi kapat', reopen: 'Yeniden aç', appointment: 'Yeni randevu oluştur', sale: 'Satış kaydet' }
  if (!events.length) return null
  return <details style={{ marginTop: 12, fontSize: 12.5, overflowWrap: 'anywhere' }}>
    <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Takip işlem geçmişi ({events.length})</summary>
    {[...events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(item => {
      const source = events.find(event => String(event.id) === String(item.source_contact_id) && event.action === 'contact')
      return <div key={item.id} style={{ padding: '9px 0', borderTop: `1px solid ${T.border}` }}>
        <strong>{labels[item.action] || 'Takip işlemi'}</strong> · {item.actor_name} · {formatTime(item.created_at)}
        {item.outcome && <div>Sonuç: {item.outcome}</div>}
        {item.close_reason && <div>Neden: {item.close_reason}</div>}
        {item.owner_id && <div>Sorumlu: {users.find(user => user.id === item.owner_id)?.full_name || 'Eski personel'}</div>}
        {item.next_followup_at && <div>Sonraki takip: {formatTime(item.next_followup_at)}</div>}
        {item.previous_appointment_at && <div>Önceki randevu: {formatTime(item.previous_appointment_at)}</div>}
        {item.appointment_at && <div>Yeni randevu: {formatTime(item.appointment_at)}</div>}
        {item.sold_at && <div>Satış günü: {new Date(item.sold_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}{canSeeRevenue && item.sale_amount != null && ` · Kayıt anındaki tutar: ${money(item.sale_amount)}`}</div>}
        {source && <div>Bağlı görüşme: {formatTime(source.created_at)} · {source.actor_name}</div>}
        {item.explanation && <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>{item.explanation}</p>}
      </div>
    })}
  </details>
}

export function FollowUpConversionEditor({ lead, action, events, onSave, onCancel }) {
  const [snapshot] = useState(() => ({ ...lead, followup: lead.followup ? { ...lead.followup } : null }))
  const [initial] = useState(() => followUpDateParts(new Date(Date.now() + 3600000).toISOString()))
  const [date, setDate] = useState(initial.date), [time, setTime] = useState(initial.time)
  const [saleDate, setSaleDate] = useState(turkeyDateString()), [amount, setAmount] = useState('')
  const [sourceId, setSourceId] = useState(''), [note, setNote] = useState(''), [replaceAppointment, setReplaceAppointment] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const title = action === 'appointment' ? 'Yeni randevu oluştur' : 'Satış kaydet'
  const contacts = events.filter(event => event.action === 'contact' && event.lead_id === snapshot.id && event.branch_id === snapshot.branch_id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const hasFutureAppointment = new Date(snapshot.appointment_at) > new Date()

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const validation = followUpConversionError({ action, lead: snapshot, date, time, saleDate, amount, note, sourceId, events, replaceAppointment })
    if (validation) { setError(validation); return }
    setBusy(true); setError('')
    try {
      await onSave({ p_lead_id: snapshot.id, p_action: action, p_expected_revision: snapshot.followup?.revision || 0,
        p_expected_result: snapshot.result, p_expected_appointment_at: snapshot.appointment_at || null,
        p_note: note.trim(), p_source_contact_id: sourceId || null,
        p_appointment_at: action === 'appointment' ? bookingAppointmentIso(date, time) : null,
        p_replace_appointment: replaceAppointment,
        p_sale_amount: action === 'sale' ? parseFollowUpAmount(amount) : null, p_sale_day: action === 'sale' ? saleDate : null })
      onCancel()
    } catch (failure) { setError(failure.message || followUpConversionWriteError(failure)) }
    finally { setBusy(false) }
  }
  return <section aria-label="Takipten sonuç kaydetme" style={{ border: `1px solid ${T.primary}`, background: '#F8F6FF', padding: 16, borderRadius: 12, margin: '12px 0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
      <div><h3 style={{ fontSize: 16, margin: 0 }}>{title}</h3><p style={{ fontSize: 13, color: T.textSoft, margin: '4px 0 0' }}>{snapshot.name} · {snapshot.service}</p></div>
      <button type="button" aria-label="Sonuç formunu kapat" onClick={onCancel} disabled={busy} style={button}><X size={16} /></button>
    </div>
    <p style={{ fontSize: 12.5, lineHeight: 1.5, color: T.textSoft }}>Aynı danışan kaydı güncellenir; yeni müşteri kaydı açılmaz. {action === 'sale' ? 'Satış kaydedilince açık takip otomatik kapanır. Bu işlem ödeme tahsil etmez.' : 'Tarih takvimde görünür; bu kaydın sonraki takip zamanı randevu saatine taşınır.'}</p>
    <form onSubmit={submit} noValidate>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {action === 'appointment' ? <>
          <label style={{ fontSize: 12.5 }}>Randevu tarihi (zorunlu)<input aria-label="Yeni randevu tarihi" type="date" min={turkeyDateString()} value={date} onChange={e => setDate(e.target.value)} disabled={busy} style={{ ...field, marginTop: 5 }} /></label>
          <label style={{ fontSize: 12.5 }}>Randevu saati (Türkiye)<input aria-label="Yeni randevu saati" type="time" value={time} onChange={e => setTime(e.target.value)} disabled={busy} style={{ ...field, marginTop: 5 }} /></label>
        </> : <>
          <label style={{ fontSize: 12.5 }}>Satış tutarı (TL, zorunlu)<input aria-label="Takip satış tutarı" inputMode="decimal" placeholder="Örnek: 15.000,50" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} style={{ ...field, marginTop: 5 }} /></label>
          <label style={{ fontSize: 12.5 }}>Satış tarihi (zorunlu)<input aria-label="Takip satış tarihi" type="date" max={turkeyDateString()} value={saleDate} onChange={e => setSaleDate(e.target.value)} disabled={busy} style={{ ...field, marginTop: 5 }} /></label>
        </>}
      </div>
      {action === 'appointment' && hasFutureAppointment && <label style={{ display: 'block', fontSize: 12.5, padding: 10, margin: '10px 0', background: T.orangeBg, borderRadius: 8 }}><input type="checkbox" checked={replaceAppointment} onChange={e => setReplaceAppointment(e.target.checked)} disabled={busy} /> Mevcut {formatTime(snapshot.appointment_at)} randevusunu bu yeni tarih/saatle değiştirmeyi onaylıyorum. Eski saat işlem geçmişinde korunur.</label>}
      <label style={{ display: 'block', fontSize: 12.5, marginTop: 14 }}>Sonucun bağlı olduğu takip görüşmesi<select aria-label="Bağlı takip görüşmesi" value={sourceId} onChange={e => setSourceId(e.target.value)} disabled={busy} style={{ ...field, marginTop: 5 }}>
        <option value="">Şimdi yapılan takip görüşmesi — yeni not kaydedilir</option>
        {contacts.map(event => <option key={event.id} value={String(event.id)}>{formatTime(event.created_at)} · {event.actor_name} · {event.outcome || 'Takip görüşmesi'}</option>)}
      </select></label>
      <p style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.5, margin: '6px 0 12px' }}>{sourceId ? 'Önceden kaydedilmiş gerçek görüşmeye bağlanır. Bu sonuç kaydı yeni görüşme sayılmaz ve son temas tarihini değiştirmez.' : 'Müşteriyle şu an yapılan görüşmeyi açıklayın. Görüşme notu ve sonuç birlikte kaydedilir; personel performansında bu danışan bir kez sayılır.'} Satış tarihi bağlı görüşmeden önce olamaz.</p>
      <label style={{ fontSize: 12.5 }}>Görüşme / sonuç açıklaması (zorunlu)<textarea aria-label="Sonuç açıklaması" rows={3} maxLength={4000} value={note} onChange={e => setNote(e.target.value)} disabled={busy} placeholder={action === 'sale' ? 'Örnek: Müşteriyle görüşüldü, hizmet paketini satın aldı.' : 'Örnek: Müşteri arandı, yeni randevu tarihini onayladı.'} style={{ ...field, marginTop: 5 }} /></label>
      <p style={{ fontSize: 12, color: T.textSoft, margin: '5px 0 12px' }}>En az 2 farklı kelime ve 10 harf/rakam. Eski notlar silinmez.</p>
      {error && <div role="alert" style={{ background: '#FFF0ED', color: '#B83B34', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="submit" disabled={busy} style={{ ...button, background: T.primary, borderColor: T.primary, color: '#fff', opacity: busy ? .65 : 1 }}>{busy ? 'Kaydediliyor…' : title}</button><button type="button" onClick={onCancel} disabled={busy} style={button}>Vazgeç</button></div>
    </form>
  </section>
}

export function FollowUpConversionSummary({ report, canSeeRevenue, onInspect, inspection }) {
  const cards = [
    { key: 'appointments', label: 'Yeniden randevu alan', value: report.appointments, detail: 'Dönemde randevu verilen farklı danışan', ids: report.appointmentLeadIds, color: T.blue },
    { key: 'sales', label: 'Takipten satışa dönüşen', value: report.sales, detail: 'Satış günü bu dönemde olan danışan', ids: report.saleLeadIds, color: T.green },
    { key: 'revenue', label: 'Bu satışların cirosu', value: canSeeRevenue ? money(report.revenue) : 'Gizli', detail: canSeeRevenue ? 'Bağlantısı kayıtlı satışların güncel tutarı' : 'Ciro görüntüleme yetkisi gerekli', ids: report.saleLeadIds, color: T.primary },
  ]
  return <section aria-label="Takip sonrası sonuçlar" style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
    <h2 style={{ fontSize: 16, margin: '0 0 4px', color: T.text }}>Takip sonrası sonuçlar</h2>
    <p style={{ fontSize: 12, color: T.textSoft, margin: '0 0 12px', lineHeight: 1.5 }}>{report.range.label} · Yukarıdaki sonuç dönemi uygulanır. Yalnızca görüşmeye açıkça bağlanan randevu ve satışlar sayılır; eski kayıtlardan başarı tahmin edilmez.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
      {cards.map(card => <button key={card.key} type="button" disabled={!card.ids.length || (card.key === 'revenue' && !canSeeRevenue)} onClick={() => onInspect(card.key)} aria-pressed={inspection === card.key} style={{ ...button, minWidth: 0, padding: 14, textAlign: 'left', cursor: card.ids.length ? 'pointer' : 'default', background: inspection === card.key ? T.primaryLight : '#FAFAFA', borderColor: inspection === card.key ? T.primary : T.border }}><span style={{ fontSize: 12, color: T.textSoft }}>{card.label}</span><strong style={{ display: 'block', fontSize: 25, color: card.color, margin: '5px 0', overflowWrap: 'anywhere' }}>{card.value}</strong><span style={{ fontSize: 11.5, color: T.textSoft, fontWeight: 400 }}>{card.detail}</span></button>)}
    </div>
    <p style={{ fontSize: 11.5, color: T.textSoft, margin: '10px 0 0', lineHeight: 1.5 }}>Aynı danışan dönemde bir kez sayılır. Bu bağlantı personelin kaydettiği sonucu gösterir; takibin satışı tek başına sağladığını bağımsız olarak kanıtlamaz.</p>
  </section>
}
