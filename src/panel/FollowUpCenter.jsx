import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ClipboardList, Search, X } from 'lucide-react'
import { T } from './theme.js'
import { bookingAppointmentIso, turkeyDateString } from '../lib/booking.js'
import { buildFollowUpPerformance, followUpPersonKey } from '../lib/followUpPerformance.js'
import { FollowUpPerformance } from './FollowUpPerformance.jsx'
import { buildFollowUpConversions } from '../lib/followUpConversions.js'
import { FollowUpConversionEditor, FollowUpConversionSummary, FollowUpHistory } from './FollowUpConversions.jsx'
import {
  FOLLOW_UP_CLOSE_REASONS, FOLLOW_UP_OUTCOMES, canManageFollowUp,
  followUpDateParts, followUpInputError, followUpState, followUpWriteError,
} from '../lib/followUps.js'

const fieldStyle = { width: '100%', minWidth: 0, border: `1px solid ${T.border}`, borderRadius: 9, padding: '10px 11px', background: '#fff', color: T.text, font: 'inherit', fontSize: 13, boxSizing: 'border-box' }
const buttonStyle = { border: `1px solid ${T.border}`, borderRadius: 9, padding: '8px 11px', background: '#fff', color: T.text, font: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }
const formatTime = value => new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const ACTION_LABELS = { plan: 'Takip planla', contact: 'Takip sonucu kaydet', close: 'Takibi kapat', reopen: 'Yeniden aç', appointment: 'Yeni randevu oluştur', sale: 'Satış kaydet' }

function FollowUpEditor({ lead, action, users, currentUser, canEditAny, onSave, onCancel }) {
  const [initial] = useState(() => {
    const nextTime = new Date(Date.now() + 3600000)
    return followUpDateParts(lead.followup?.next_followup_at && new Date(lead.followup.next_followup_at) > new Date() ? lead.followup.next_followup_at : nextTime.toISOString())
  })
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [ownerId, setOwnerId] = useState(lead.followup?.owner_id || '')
  const [outcome, setOutcome] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  // Açılırken alınan sürüm; başkası değiştirmişse metni silmeden çakışma uyarılır.
  const [revision] = useState(lead.followup?.revision || 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const owners = users.filter(user => user.active !== false && user.branch_id === lead.branch_id &&
    !(user.is_trial && user.trial_ends_at && new Date(user.trial_ends_at) < new Date() && user.role !== 'super_admin') &&
    (canEditAny || user.id === currentUser.id || user.id === lead.followup?.owner_id))
  const oldOwner = users.find(user => user.id === lead.followup?.owner_id)

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const validation = followUpInputError({ action, date, time, outcome, reason, note, leadResult: lead.result })
    if (validation) { setError(validation); return }
    setError(''); setBusy(true)
    try {
      await onSave({ p_lead_id: lead.id, p_action: action, p_expected_revision: revision,
        p_next_at: action === 'close' ? null : bookingAppointmentIso(date, time),
        p_owner_id: ownerId || null, p_outcome: outcome || null, p_reason: reason || null,
        p_note: action === 'plan' ? null : note.trim() })
      onCancel()
    } catch (saveError) { setError(saveError.message || followUpWriteError(saveError)) }
    finally { setBusy(false) }
  }

  return <section aria-label="Takip düzenleme" style={{ border: `1px solid ${T.primary}`, background: '#F8F6FF', padding: 16, borderRadius: 12, margin: '12px 0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
      <div><h3 style={{ fontSize: 16, margin: 0 }}>{ACTION_LABELS[action]}</h3><p style={{ fontSize: 13, color: T.textSoft, margin: '4px 0 0' }}>{lead.name}</p></div>
      <button type="button" aria-label="Takip düzenlemeyi kapat" onClick={onCancel} disabled={busy} style={buttonStyle}><X size={16} /></button>
    </div>
    <form onSubmit={submit} noValidate>
      {action !== 'close' && <>
        {action === 'reopen' && lead.followup?.close_reason === 'Müşteri takip istemiyor' && <p style={{ color: '#B83B34', fontSize: 12.5, lineHeight: 1.5 }}>Bu müşteri takip istemediği için kapatılmıştı. Yalnızca tekrar iletişim kurulmasını istediğini doğruladıysanız açın; açıklamaya ne zaman/nasıl istediğini yazın.</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <label style={{ fontSize: 12.5 }}>Sonraki takip tarihi<input aria-label="Sonraki takip tarihi" type="date" min={turkeyDateString()} value={date} onChange={e => setDate(e.target.value)} disabled={busy} style={{ ...fieldStyle, marginTop: 5 }} /></label>
          <label style={{ fontSize: 12.5 }}>Takip saati (Türkiye)<input aria-label="Takip saati" type="time" value={time} onChange={e => setTime(e.target.value)} disabled={busy} style={{ ...fieldStyle, marginTop: 5 }} /></label>
          <label style={{ fontSize: 12.5 }}>Sorumlu personel<select aria-label="Sorumlu personel" value={ownerId} onChange={e => setOwnerId(e.target.value)} disabled={busy} style={{ ...fieldStyle, marginTop: 5 }}>
            {(canEditAny || !lead.followup?.owner_id) && <option value="">Henüz atanmadı</option>}
            {owners.map(user => <option key={user.id} value={user.id}>{user.full_name || user.email}</option>)}
            {ownerId && !owners.some(user => user.id === ownerId) && <option value={ownerId}>{oldOwner?.full_name || 'Eski sorumlu'} (yeniden seçin)</option>}
          </select></label>
        </div>
        <p style={{ color: T.textSoft, fontSize: 12, margin: '7px 0 12px' }}>Bu tarih bir randevu oluşturmaz; yalnızca ekibin sonraki takip zamanıdır. Otomatik mesaj gönderilmez.</p>
      </>}
      {action === 'contact' && <label style={{ fontSize: 12.5 }}>Takip sonucu<select aria-label="Takip sonucu" value={outcome} onChange={e => setOutcome(e.target.value)} disabled={busy} style={{ ...fieldStyle, marginTop: 5, marginBottom: 12 }}><option value="">Sonuç seçin</option>{FOLLOW_UP_OUTCOMES.map(value => <option key={value}>{value}</option>)}</select></label>}
      {action === 'close' && <>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: T.textSoft }}>Müşteri ve geçmiş notları silinmez. Takip, “Kapatılan” listesine taşınır. “Müşteri takip istemiyor” seçilirse buradaki WhatsApp bağlantısı da kaldırılır.</p>
        <label style={{ fontSize: 12.5 }}>Kapatma nedeni<select aria-label="Kapatma nedeni" value={reason} onChange={e => setReason(e.target.value)} disabled={busy} style={{ ...fieldStyle, marginTop: 5, marginBottom: 12 }}><option value="">Neden seçin</option>{FOLLOW_UP_CLOSE_REASONS.filter(value => value !== 'Satış gerçekleşti' || lead.result === 'Müşteri oldu').map(value => <option key={value}>{value}</option>)}</select></label>
      </>}
      {action !== 'plan' && <label style={{ fontSize: 12.5 }}>{action === 'contact' ? 'Yapılan işlem ve sonuç (zorunlu)' : action === 'reopen' ? 'Yeniden açma açıklaması (zorunlu)' : 'Kapatma açıklaması (zorunlu)'}
        <textarea aria-label="Takip açıklaması" value={note} onChange={e => setNote(e.target.value)} maxLength={4000} rows={3} disabled={busy} style={{ ...fieldStyle, marginTop: 5 }} placeholder={action === 'contact' ? 'Örnek: Müşteri arandı, yarın kararını bildirecek.' : action === 'reopen' ? 'Örnek: Müşteri tekrar iletişim kurulmasını istedi.' : 'Örnek: Müşteri yeniden aranmak istemediğini belirtti.'} />
        <p style={{ fontSize: 12, color: T.textSoft, margin: '5px 0 12px' }}>{action === 'contact' ? 'Görüşme notuna eklenir. Eski notların üzerine yazılmaz.' : 'Takip geçmişine eklenir; görüşme sayacını sıfırlamaz.'} En az 2 kelime ve 10 harf/rakam yazın.</p>
      </label>}
      {action === 'plan' && <p style={{ fontSize: 12, color: T.textSoft }}>Tarih/sorumlu planlamak, görüşme yapılmış sayılmaz ve mevcut notları değiştirmez.</p>}
      {error && <div role="alert" style={{ color: '#B83B34', background: '#FFF0ED', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}><button type="submit" disabled={busy} style={{ ...buttonStyle, borderColor: action === 'close' ? '#B83B34' : T.primary, background: action === 'close' ? '#B83B34' : T.primary, color: '#fff', opacity: busy ? .65 : 1 }}>{busy ? 'Kaydediliyor…' : ACTION_LABELS[action]}</button><button type="button" onClick={onCancel} disabled={busy} style={buttonStyle}>Vazgeç</button></div>
    </form>
  </section>
}

export function FollowUpCenter({ leads, leadNotes, users, currentUser, canEditAny, canSeePhone, canSeeRevenue, branchName, showBranch, scopeBranchIds, getLegacyReminder, buildWhatsappUrl, onOpenLead, canEditLead, onSave, events, loadError }) {
  const [filter, setFilter] = useState('open')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selection, setSelection] = useState(null)
  const [period, setPeriod] = useState('month')
  const [inspection, setInspection] = useState(null)
  const [conversionInspection, setConversionInspection] = useState(null)
  const [notice, setNotice] = useState('')
  const [clock, setClock] = useState(() => new Date())
  const editorRef = useRef(null)
  const queueRef = useRef(null)
  useEffect(() => { if (selection) editorRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }, [selection])
  useEffect(() => { if (inspection || conversionInspection) queueRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }, [inspection, conversionInspection])
  useEffect(() => { const timer = setInterval(() => setClock(new Date()), 60000); return () => clearInterval(timer) }, [])
  const items = useMemo(() => leads.map(lead => ({ lead, state: followUpState(lead, getLegacyReminder(lead), clock) })), [leads, getLegacyReminder, clock])
  const report = useMemo(() => canEditAny && !loadError ? buildFollowUpPerformance({ items, users, events, branchIds: scopeBranchIds, period, now: clock }) : null, [canEditAny, loadError, items, users, events, scopeBranchIds, period, clock])
  const conversions = useMemo(() => canEditAny && !loadError ? buildFollowUpConversions({ leads, events, branchIds: scopeBranchIds, period, now: clock }) : null, [canEditAny, loadError, leads, events, scopeBranchIds, period, clock])
  const activeInspection = report ? inspection : null
  const activeConversionInspection = conversions ? conversionInspection : null
  const hasInspection = Boolean(activeInspection || activeConversionInspection)
  const inspectionRow = report?.rows.find(row => row.key === inspection?.rowKey)
  const inspectionFields = { open: 'openLeadIds', overdue: 'overdueLeadIds', today: 'todayLeadIds', contacted: 'contactLeadIds' }
  const inspectedLeadIds = new Set(activeConversionInspection ? (conversionInspection === 'appointments' ? conversions.appointmentLeadIds : conversions.saleLeadIds) : inspectionRow?.[inspectionFields[inspection?.metric]] || [])
  const latestNotes = useMemo(() => {
    const notes = {}
    for (const note of leadNotes) if (!notes[note.lead_id] || new Date(note.created_at) > new Date(notes[note.lead_id].created_at)) notes[note.lead_id] = note
    return notes
  }, [leadNotes])
  const matchingOwner = item => ownerFilter === 'all' || (ownerFilter === 'mine' ? item.lead.followup?.owner_id === currentUser.id : ownerFilter === 'unassigned' ? !item.lead.followup?.owner_id : followUpPersonKey(item.lead.branch_id, item.lead.followup?.owner_id) === ownerFilter)
  const counts = { open: 0, overdue: 0, today: 0, planned: 0, closed: 0 }
  for (const item of items) {
    if (!item.state || !matchingOwner(item)) continue
    counts[item.state.bucket]++
    if (item.state.bucket !== 'closed') counts.open++
  }
  const query = search.trim().toLocaleLowerCase('tr-TR')
  const rows = items.filter(item => {
    if (hasInspection ? !inspectedLeadIds.has(item.lead.id) : !matchingOwner(item)) return false
    if (query) return [item.lead.name, canSeePhone ? item.lead.phone : '', item.lead.service, branchName(item.lead.branch_id)].some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(query))
    if (hasInspection) return true
    return filter === 'open' ? item.state && item.state.bucket !== 'closed' : item.state?.bucket === filter
  }).sort((a, b) => {
    const rank = { overdue: 0, today: 1, planned: 2, closed: 3 }
    return (rank[a.state?.bucket] ?? 4) - (rank[b.state?.bucket] ?? 4) || (b.state?.dueDays || 0) - (a.state?.dueDays || 0) || new Date(a.lead.followup?.next_followup_at || a.lead.date) - new Date(b.lead.followup?.next_followup_at || b.lead.date)
  })
  const selectedLead = leads.find(lead => lead.id === selection?.id)
  const tiles = [{ key: 'overdue', label: 'Geciken', color: '#C2413B' }, { key: 'today', label: 'Bugün', color: T.primary }, { key: 'planned', label: 'Planlanan', color: T.blue }, { key: 'closed', label: 'Kapatılan', color: T.textSoft }]
  const clearInspection = () => { setInspection(null); setConversionInspection(null) }
  async function saveSelection(payload) {
    await onSave(payload)
    if (['appointment', 'sale'].includes(payload.p_action)) {
      setClock(new Date())
      setNotice(payload.p_action === 'sale' ? 'Satış kaydedildi ve açık takip kapatıldı. Sonucu Kapatılan listesinde görebilirsiniz.' : 'Randevu kaydedildi. Randevular takvimine ve takip planına işlendi.')
    }
  }

  return <div>
    <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', color: T.text }}>Takip Merkezi</h1>
    <p style={{ fontSize: 13.5, color: T.textSoft, margin: '0 0 18px' }}>Kimin, ne zaman, hangi danışanla görüşeceği net olsun.</p>
    {loadError && <div role="alert" style={{ padding: 12, border: '1px solid #F3C4C0', background: '#FFF5F3', color: '#B83B34', borderRadius: 10, marginBottom: 14, fontSize: 13 }}>{loadError} Yeni takip işlemleri kapalı; kurulum/bağlantı düzeldikten sonra paneli yenileyin.</div>}
    {notice && <div role="status" style={{ padding: 12, background: T.greenBg, color: T.green, borderRadius: 10, marginBottom: 14, fontSize: 13 }}>{notice} <button type="button" onClick={() => setNotice('')} style={buttonStyle}>Kapat</button></div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: 10, marginBottom: 16 }}>
      {tiles.map(tile => <button key={tile.key} onClick={() => { setFilter(tile.key); setSearch(''); clearInspection() }} style={{ ...buttonStyle, textAlign: 'left', padding: 14, borderColor: !hasInspection && filter === tile.key ? tile.color : T.border }}><span style={{ display: 'block', color: T.textSoft, fontSize: 12 }}>{tile.label}</span><strong style={{ display: 'block', fontSize: 25, color: tile.color, marginTop: 5 }}>{counts[tile.key]}</strong></button>)}
    </div>
    {report && <FollowUpPerformance report={report} period={period} onPeriodChange={value => { setPeriod(value); clearInspection() }} branchName={branchName} showBranch={showBranch} inspection={inspection} onInspect={(rowKey, metric) => { setInspection({ rowKey, metric }); setConversionInspection(null); setOwnerFilter('all'); setSelection(null); setSearch('') }} />}
    {conversions && <FollowUpConversionSummary report={conversions} canSeeRevenue={canSeeRevenue} inspection={activeConversionInspection} onInspect={metric => { setConversionInspection(metric); setInspection(null); setOwnerFilter('all'); setSelection(null); setSearch('') }} />}
    <section ref={queueRef} aria-label="Takip sırası" style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 22 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Takip sırası</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button onClick={() => { setFilter('open'); setSearch(''); clearInspection() }} style={{ ...buttonStyle, color: !hasInspection && filter === 'open' ? T.primary : T.textSoft }}>Tüm açık takipler · {counts.open}</button>
          <select aria-label="Sorumlu filtresi" value={ownerFilter} onChange={e => { setOwnerFilter(e.target.value); clearInspection() }} style={{ ...fieldStyle, width: 'auto' }}><option value="all">Tüm sorumlular</option><option value="mine">Bana atanan</option><option value="unassigned">Atanmayan</option>{report?.rows.filter(row => row.personId).map(row => <option key={row.key} value={row.key}>{row.name}{showBranch ? ` · ${branchName(row.branchId)}` : ''}</option>)}</select>
        </div>
      </div>
      {hasInspection && <div role="status" style={{ background: T.primaryLight, borderRadius: 9, padding: 10, marginBottom: 12, fontSize: 12.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}><span>{activeConversionInspection ? <><strong>Takip sonrası sonuçlar</strong> · {activeConversionInspection === 'appointments' ? 'Yeniden randevu alanlar' : 'Satışa dönüşenler'} · {conversions.range.label}</> : <><strong>{inspectionRow?.name || 'Personel'}</strong>{showBranch && inspectionRow ? ` · ${branchName(inspectionRow.branchId)}` : ''} · {{ open: 'Açık takipler', overdue: 'Geciken takipler', today: 'Bugünkü takipler', contacted: 'Dönemde sonuç girilen takipler' }[inspection.metric]}{inspection.metric === 'contacted' && ` · ${report?.range.label}`}</>} · {rows.length} danışan</span><button type="button" style={buttonStyle} onClick={() => { clearInspection(); setSearch('') }}>Performans filtresini kaldır</button></div>}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Search size={16} color={T.textSoft} /><input aria-label="Takip için danışan ara" placeholder="İsim veya hizmet ara; yeni takip de planlayabilirsiniz" value={search} onChange={e => setSearch(e.target.value)} style={fieldStyle} /></label>
      <p style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.5 }}>Planlanmamış kayıtlarda mevcut hatırlatma kuralları korunur. Arama tüm danışanları getirir; kapalı veya henüz takip beklemeyen bir kaydı da bulabilirsiniz.</p>
      <div ref={editorRef}>{selectedLead && !loadError && canManageFollowUp(selectedLead, currentUser, canEditAny, users) && (['appointment', 'sale'].includes(selection.action)
        ? canEditLead(selectedLead) && <FollowUpConversionEditor key={`${selectedLead.id}:${selection.action}`} lead={selectedLead} action={selection.action} onSave={saveSelection} onCancel={() => setSelection(null)} events={events.filter(event => event.lead_id === selectedLead.id)} />
        : <FollowUpEditor key={`${selectedLead.id}:${selection.action}`} lead={selectedLead} action={selection.action} users={users} currentUser={currentUser} canEditAny={canEditAny} onSave={saveSelection} onCancel={() => setSelection(null)} />)}</div>
      {rows.length === 0 && <p style={{ color: T.textSoft, fontSize: 13 }}>Bu görünümde kayıt yok. Yeni takip planlamak için danışanı adıyla arayın.</p>}
      {rows.map(({ lead, state }) => {
        const owner = users.find(user => user.id === lead.followup?.owner_id)
        const closed = state?.bucket === 'closed'
        const manageable = !loadError && canManageFollowUp(lead, currentUser, canEditAny, users)
        const waUrl = canSeePhone && !closed ? buildWhatsappUrl(lead) : null
        const latest = (latestNotes[lead.id]?.note || lead.note || '').replace(/\s+/g, ' ').trim()
        const label = closed ? `Kapalı · ${lead.followup.close_reason}` : state?.scheduled ? `${state.bucket === 'overdue' ? `${state.dueDays} gün gecikmiş · ` : state.bucket === 'today' ? 'Bugün · ' : 'Planlandı · '}${formatTime(state.at)}` : state ? `${state.dueDays ? `${state.dueDays} gün gecikmiş` : 'Bugün takip'} · ${state.reminderNumber}. temas` : 'Henüz takip planı yok'
        return <article key={lead.id} style={{ padding: '15px 0', borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: '1 1 240px' }}><strong style={{ fontSize: 14.5 }}>{lead.name}</strong><p style={{ fontSize: 12.5, color: T.textSoft, margin: '4px 0' }}>{lead.service} · {lead.result}{showBranch && ` · ${branchName(lead.branch_id)}`}</p>{canSeePhone && <p style={{ fontSize: 12.5, color: T.textSoft, margin: '4px 0' }}>{lead.phone}</p>}<p style={{ fontSize: 12, margin: '6px 0', color: owner ? T.text : T.orange }}>Sorumlu: {owner ? `${owner.full_name || owner.email}${owner.active === false ? ' (pasif; yeniden atayın)' : ''}` : lead.followup?.owner_id ? 'Sorumlu kişi bilgisi görüntülenemiyor' : 'Henüz atanmadı'}</p>{lead.followup?.last_outcome && <p style={{ fontSize: 12, color: T.textSoft, margin: '4px 0' }}>Son takip sonucu: {lead.followup.last_outcome}</p>}</div>
            <span style={{ alignSelf: 'flex-start', padding: '6px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, color: state?.bucket === 'overdue' ? '#C2413B' : closed ? T.textSoft : T.primary, background: state?.bucket === 'overdue' ? '#FFF0ED' : closed ? '#F3F3F3' : T.primaryLight }}>{label}</span>
          </div>
          {latest && <p style={{ fontSize: 12.5, lineHeight: 1.45, color: T.textSoft, margin: '6px 0 10px', overflowWrap: 'anywhere' }}><strong>Son not:</strong> {latest.length > 160 ? `${latest.slice(0, 160)}…` : latest}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {waUrl && <a href={waUrl} target="_blank" rel="noreferrer" style={{ ...buttonStyle, color: '#16845B', borderColor: '#16845B', textDecoration: 'none' }}>WhatsApp</a>}
            {manageable && (closed ? <button onClick={() => setSelection({ id: lead.id, action: 'reopen' })} style={buttonStyle}>Yeniden aç</button> : <>
              <button onClick={() => setSelection({ id: lead.id, action: 'contact' })} style={{ ...buttonStyle, background: T.primary, borderColor: T.primary, color: '#fff' }}><ClipboardList size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Takip sonucu</button>
              <button onClick={() => setSelection({ id: lead.id, action: 'plan' })} style={buttonStyle}><CalendarDays size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Planla / ata</button>
              {canEditLead(lead) && lead.result !== 'Müşteri oldu' && <>
                <button onClick={() => { setSelection({ id: lead.id, action: 'appointment' }); setNotice('') }} style={{ ...buttonStyle, color: T.blue }}>Yeni randevu oluştur</button>
                <button onClick={() => { setSelection({ id: lead.id, action: 'sale' }); setNotice('') }} style={{ ...buttonStyle, color: T.green }}>Satış kaydet</button>
              </>}
              <button onClick={() => setSelection({ id: lead.id, action: 'close' })} style={{ ...buttonStyle, color: '#B83B34' }}>Takibi kapat</button>
            </>)}
            {canEditLead(lead) && <button onClick={() => onOpenLead(lead)} style={buttonStyle}>Danışan detayı</button>}
          </div>
          {!manageable && !loadError && <p style={{ fontSize: 11.5, color: T.textSoft, margin: '6px 0 0' }}>Bu takibi sorumlusu, kaydı oluşturan personel veya yetkili yönetici düzenleyebilir.</p>}
          <FollowUpHistory events={events.filter(event => event.lead_id === lead.id && event.branch_id === lead.branch_id)} users={users} canSeeRevenue={canSeeRevenue} />
        </article>
      })}
    </section>
  </div>
}
