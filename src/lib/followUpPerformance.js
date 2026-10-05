import { addBookingDays, turkeyDateString } from './booking.js'

export const FOLLOW_UP_PERFORMANCE_PERIODS = [
  { key: 'month', label: 'Bu ay' },
  { key: 'today', label: 'Bugün' },
  { key: 'week', label: 'Son 7 gün' },
  { key: 'previousMonth', label: 'Geçen ay' },
]

export function followUpPersonKey(branchId, personId) {
  return JSON.stringify([branchId, personId || null])
}

export function followUpPerformancePeriod(key = 'month', now = new Date()) {
  const today = turkeyDateString(now)
  let firstDay = today.slice(0, 7) + '-01'
  let lastDay = today
  if (key === 'today') firstDay = today
  else if (key === 'week') firstDay = addBookingDays(today, -6)
  else if (key === 'previousMonth') {
    lastDay = addBookingDays(firstDay, -1)
    firstDay = lastDay.slice(0, 7) + '-01'
  }
  const format = day => day.split('-').reverse().join('.')
  return {
    firstDay, lastDay,
    start: new Date(`${firstDay}T00:00:00+03:00`).getTime(),
    end: new Date(`${addBookingDays(lastDay, 1)}T00:00:00+03:00`).getTime(),
    label: firstDay === lastDay ? format(firstDay) : `${format(firstDay)} – ${format(lastDay)}`,
  }
}

// İş yükü sorumluya, girilen sonuç işlemi yapan UUID'ye aittir.
// Eski serbest notlardan isim eşleştirerek performans tahmin edilmez.
export function buildFollowUpPerformance({ items = [], users = [], events = [], branchIds = [], period = 'month', now = new Date() }) {
  const scope = new Set(branchIds)
  const scopedItems = items.filter(item => scope.has(item.lead.branch_id) && !item.lead.followupUnavailable)
  const leadById = new Map(scopedItems.map(item => [item.lead.id, item.lead]))
  const profileById = new Map(users.map(user => [user.id, user]))
  const range = followUpPerformancePeriod(period, now)
  const rows = new Map()

  function person(branchId, personId, historicalName, historicalAt = 0) {
    const key = followUpPersonKey(branchId, personId)
    if (!rows.has(key)) {
      const profile = profileById.get(personId)
      const sameBranch = profile?.branch_id === branchId
      const expired = profile?.is_trial && profile.trial_ends_at && new Date(profile.trial_ends_at) < now && profile.role !== 'super_admin'
      rows.set(key, {
        key, branchId, personId: personId || null,
        name: !personId ? 'Sorumlu atanmamış' : sameBranch ? (profile.full_name || profile.email || historicalName || 'Personel') : (historicalName || 'Personel bilgisi görüntülenemiyor'),
        status: !personId ? 'unassigned' : !profile ? 'unavailable' : !sameBranch ? 'moved' : profile.active === false || expired ? 'inactive' : 'active',
        openLeadIds: new Set(), overdueLeadIds: new Set(), todayLeadIds: new Set(), contactLeadIds: new Set(),
        contactEvents: 0, lastContactAt: null, historicalNameAt: historicalName ? historicalAt : -Infinity,
      })
    } else if (historicalName && ['unavailable', 'moved'].includes(rows.get(key).status) && historicalAt >= rows.get(key).historicalNameAt) {
      rows.get(key).name = historicalName
      rows.get(key).historicalNameAt = historicalAt
    }
    return rows.get(key)
  }

  // Hiç işi olmayan aktif personel de tabloda görünür; boş şubeler kaybolmaz.
  for (const user of users) {
    if (user.id && scope.has(user.branch_id) && user.active !== false) person(user.branch_id, user.id)
  }
  for (const { lead, state } of scopedItems) {
    if (!state || state.bucket === 'closed') continue
    const row = person(lead.branch_id, lead.followup?.owner_id)
    row.openLeadIds.add(lead.id)
    if (state.bucket === 'overdue') row.overdueLeadIds.add(lead.id)
    if (state.bucket === 'today') row.todayLeadIds.add(lead.id)
  }

  const seenEvents = new Set()
  const contactedLeadIds = new Set()
  for (const event of events) {
    const lead = leadById.get(event.lead_id)
    const at = new Date(event.created_at).getTime()
    if (!lead || event.branch_id !== lead.branch_id || event.action !== 'contact' || !event.actor_id ||
        !Number.isFinite(at) || at < range.start || at >= range.end) continue
    if (event.id != null) {
      const id = String(event.id)
      if (seenEvents.has(id)) continue
      seenEvents.add(id)
    }
    const row = person(event.branch_id, event.actor_id, event.actor_name, at)
    row.contactLeadIds.add(event.lead_id)
    row.contactEvents++
    contactedLeadIds.add(event.lead_id)
    if (!row.lastContactAt || at > new Date(row.lastContactAt).getTime()) row.lastContactAt = event.created_at
  }

  const resultRows = [...rows.values()].map(row => ({ ...row,
    openLeadIds: [...row.openLeadIds], overdueLeadIds: [...row.overdueLeadIds],
    todayLeadIds: [...row.todayLeadIds], contactLeadIds: [...row.contactLeadIds],
    open: row.openLeadIds.size, overdue: row.overdueLeadIds.size,
    today: row.todayLeadIds.size, contacted: row.contactLeadIds.size,
  })).sort((a, b) => b.overdue - a.overdue || b.today - a.today ||
    Number(b.status === 'unassigned') - Number(a.status === 'unassigned') ||
    b.open - a.open || b.contacted - a.contacted || a.name.localeCompare(b.name, 'tr') || a.key.localeCompare(b.key))
  return {
    rows: resultRows, range,
    contacted: contactedLeadIds.size,
    contactEvents: resultRows.reduce((sum, row) => sum + row.contactEvents, 0),
    unassigned: resultRows.filter(row => row.status === 'unassigned').reduce((sum, row) => sum + row.open, 0),
  }
}
