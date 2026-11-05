import { addBookingDays, turkeyDateString } from './booking.js'
import { reportingDayKey } from './salesReporting.js'

export const EMPTY_META_HEALTH = { connections: [], statuses: [], days: [], error: 'Meta veri durumu henüz kontrol edilmedi.' }
const PAGE_SIZE = 500
export async function fetchMetaRows(client, table) {
  if (!['ads_data', 'meta_sync_status', 'meta_sync_days'].includes(table)) throw new Error('Geçersiz tablo')
  const rows = []
  try {
    for (let offset = 0; ;) {
      let query = client.from(table).select('*').order('branch_id')
      if (table !== 'meta_sync_status') query = query.order('date')
      if (table === 'ads_data') query = query.order('id')
      const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1)
      if (error || !Array.isArray(data)) return { data: null, error: error || new Error('Eksik yanıt') }
      rows.push(...data)
      if (data.length === 0) return { data: rows, error: null }
      offset += data.length
    }
  } catch (error) { return { data: null, error } }
}
export async function fetchMetaHealth(client) {
  try {
    const [connections, statuses, days] = await Promise.all([
      client.rpc('get_meta_connection_health'), fetchMetaRows(client, 'meta_sync_status'), fetchMetaRows(client, 'meta_sync_days'),
    ])
    if (connections.error || statuses.error || days.error || !Array.isArray(connections.data)) throw new Error('Eksik kurulum veya bağlantı')
    return { connections: connections.data, statuses: statuses.data, days: days.data, error: '' }
  } catch {
    return { ...EMPTY_META_HEALTH, error: 'Meta veri sağlığı okunamadı. Güncelleme 6 SQL kurulumunu ve bağlantıyı kontrol edip paneli yenileyin.' }
  }
}
export function metaPeriodHealth({ health = EMPTY_META_HEALTH, branches = [], ads = [], start, end, now = new Date(), adsError = '' }) {
  const today = turkeyDateString(now)
  const since = reportingDayKey(start), last = reportingDayKey(new Date(new Date(end).getTime() - 1))
  const until = last && last > today ? today : last
  const keys = []
  if (since && until && since <= until) {
    // Aşırı uzun/bozuk aralık tarayıcıyı kilitlemez; bilinmeyen kapsam güvenilir sayılmaz.
    for (let day = since; day <= until && keys.length <= 10000; day = addBookingDays(day, 1)) keys.push(day)
  }
  const scopes = [...new Map(branches.map(b => [b.id, b])).values()]
  const coverage = new Map(health.days.map(d => [`${d.branch_id}:${d.date}`, d]))
  const stored = new Map()
  for (const row of ads.filter(a => a.channel === 'Meta (Otomatik)')) {
    const key = `${row.branch_id}:${reportingDayKey(row.date)}`
    stored.set(key, [...(stored.get(key) || []), row])
  }
  const details = scopes.map(branch => {
    const connection = health.connections.find(c => c.branch_id === branch.id)
    const status = health.statuses.find(s => s.branch_id === branch.id && s.ad_account_id === connection?.ad_account_id)
    const missing = keys.filter(day => {
      const checked = coverage.get(`${branch.id}:${day}`), rows = stored.get(`${branch.id}:${day}`) || []
      return !connection?.ad_account_id || checked?.ad_account_id !== connection.ad_account_id || !Number.isFinite(Date.parse(checked?.verified_at)) || rows.length !== 1
        || ['spend', 'messages', 'impressions'].some(field => rows[0][field] == null || checked?.[field] == null || !Number.isFinite(Number(rows[0][field])) || Number(rows[0][field]) < 0 || Number(rows[0][field]) !== Number(checked[field]))
    })
    const expires = Date.parse(connection?.token_expires_at)
    const expired = Number.isFinite(expires) && expires <= now.getTime()
    const expiring = !expired && Number.isFinite(expires) && expires - now.getTime() <= 7 * 86400000
    const successTime = Date.parse(status?.last_success_at)
    const stale = keys.includes(today) && (!Number.isFinite(successTime) || now.getTime() - successTime > 36 * 3600000)
    return { ...branch, connected: Boolean(connection?.ad_account_id), status, missing, expired, expiring, stale }
  })
  const error = adsError || health.error
  const ready = !error && keys.length > 0 && keys.length <= 10000 && details.length > 0 && details.every(d => !d.missing.length && !d.stale)
  const provisional = ready && keys.includes(today)
  return { ready, provisional, since, until, days: keys.length, details, error,
    missingDays: details.reduce((sum, d) => sum + d.missing.length, 0),
    needsAttention: !ready || details.some(d => d.expired || d.expiring || d.status?.last_result !== 'success'),
  }
}
export function maskMetaPerformance(performance, report) {
  return report.ready ? performance : { ...performance, metaRoas: null, appointmentRate: null }
}

export function metaMessageBreakdown({ health = EMPTY_META_HEALTH, branches = [], start, end }) {
  const since = reportingDayKey(start)
  const until = reportingDayKey(new Date(new Date(end).getTime() - 1))
  const branchIds = new Set(branches.map(branch => branch.id))
  const result = { dm: 0, profile: 0, other: 0, unclassified: 0, total: 0, classified: 0 }
  if (!since || !until || since > until || branchIds.size === 0) return result
  for (const row of health.days || []) {
    const day = reportingDayKey(row.date)
    if (!branchIds.has(row.branch_id) || !day || day < since || day > until) continue
    const total = Math.max(0, Number(row.messages) || 0)
    const source = row.message_breakdown && typeof row.message_breakdown === 'object' ? row.message_breakdown : {}
    const dm = Math.max(0, Number(source.dm) || 0)
    const profile = Math.max(0, Number(source.profile) || 0)
    const other = Math.max(0, Number(source.other) || 0)
    const classified = Math.min(total, dm + profile + other)
    result.dm += dm
    result.profile += profile
    result.other += other
    result.unclassified += Math.max(0, total - classified)
    result.total += total
    result.classified += classified
  }
  return result
}
