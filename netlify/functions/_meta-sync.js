// Ortak manuel/zamanlanmış çekim: tamamı doğrulanmadan reklam verisine dokunmaz.
export const SUPABASE_URL = 'https://rngahpybhgdqabbkldrr.supabase.co'
const GRAPH_VERSION = 'v21.0'
const DAY_MS = 86400000
export const META_ERRORS = {
  TOKEN_EXPIRED: 'Meta bağlantısının süresi dolmuş veya erişimi kaldırılmış. Reklam Kaynakları bölümünden bağlantıyı yenileyin.',
  NOT_CONNECTED: 'Bu şube için Meta reklam hesabı bağlı değil.',
  ACCOUNT_SETTINGS: 'Reklam hesabının para birimi veya saat dilimi bu raporla uyumlu değil. TRY ve Europe/Istanbul ayarlarını kontrol edin.',
  META_FAILED: 'Meta verisi alınamadı. Erişim izinlerini kontrol edip tekrar deneyin.',
  INVALID_DATA: 'Meta yanıtı eksik veya beklenen biçimde değil. Önceki veriler korundu; tekrar deneyin.',
  DATABASE_FAILED: 'Veri kaydı doğrulanamadı. Güncelleme 6 SQL dosyasını kontrol edip tekrar deneyin; reklam verileri kısmen silinmez.',
  SYNC_CONFLICT: 'Başka bir çekim başladı veya reklam hesabı değişti. Tekrar deneyin.',
}
export class MetaSyncError extends Error {
  constructor(code) { super(META_ERRORS[code] || META_ERRORS.META_FAILED); this.code = code }
}
export function turkeyDay(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export function shiftDay(day, offset) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + offset * DAY_MS).toISOString().slice(0, 10)
}
export function validDay(day) {
  return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`)) && shiftDay(day, 0) === day
}
export function rangeError(since, until, now = new Date()) {
  if (!validDay(since) || !validDay(until)) return 'Tarihleri YYYY-AA-GG biçiminde girin.'
  if (since > until) return 'Başlangıç tarihi bitiş tarihinden sonra olamaz.'
  if (until > turkeyDay(now)) return 'İleri bir tarih için Meta verisi çekilemez.'
  if ((Date.parse(until) - Date.parse(since)) / DAY_MS >= 92) return 'Tek seferde en fazla 92 günlük veri çekebilirsiniz.'
  return null
}
function metric(value, integer = false) {
  if (value === null || value === undefined || value === '' || !['number', 'string'].includes(typeof value)) throw new MetaSyncError('INVALID_DATA')
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || (integer && !Number.isSafeInteger(n))) throw new MetaSyncError('INVALID_DATA')
  return n
}
async function jsonResponse(response, fallback) {
  let data
  try { data = await response.json() } catch { throw new MetaSyncError(fallback) }
  if (!response.ok || data?.error) {
    if (data?.error?.code === 190) throw new MetaSyncError('TOKEN_EXPIRED')
    if (data?.message?.includes('META_SYNC_CONFLICT')) throw new MetaSyncError('SYNC_CONFLICT')
    throw new MetaSyncError(fallback)
  }
  return data
}
export async function collectMetaDays({ accountId, token, since, until, fetchImpl = fetch }) {
  if (!/^act_[0-9]+$/.test(accountId) || typeof token !== 'string' || !token) throw new MetaSyncError('NOT_CONNECTED')
  const options = { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }
  const account = await jsonResponse(await fetchImpl(`https://graph.facebook.com/${GRAPH_VERSION}/${accountId}?fields=currency,timezone_name`, options), 'META_FAILED')
  if (account.currency !== 'TRY' || account.timezone_name !== 'Europe/Istanbul') throw new MetaSyncError('ACCOUNT_SETTINGS')
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/insights`)
  url.searchParams.set('fields', 'spend,impressions,actions,date_start,date_stop')
  url.searchParams.set('time_range', JSON.stringify({ since, until }))
  url.searchParams.set('time_increment', '1')
  url.searchParams.set('limit', '100')
  const byDay = new Map(), cursors = new Set()
  for (let page = 0; page < 20; page++) {
    const result = await jsonResponse(await fetchImpl(url.toString(), options), 'META_FAILED')
    if (!Array.isArray(result?.data)) throw new MetaSyncError('INVALID_DATA')
    for (const row of result.data) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new MetaSyncError('INVALID_DATA')
      if (!validDay(row.date_start) || row.date_start < since || row.date_start > until || row.date_stop !== row.date_start || byDay.has(row.date_start)) throw new MetaSyncError('INVALID_DATA')
      if (row.actions !== undefined && !Array.isArray(row.actions)) throw new MetaSyncError('INVALID_DATA')
      const actions = (row.actions || []).filter(a => a?.action_type === 'onsite_conversion.messaging_conversation_started_7d')
      if (actions.length > 1) throw new MetaSyncError('INVALID_DATA')
      byDay.set(row.date_start, { date: row.date_start, spend: metric(row.spend), impressions: metric(row.impressions, true), messages: actions.length ? metric(actions[0].value, true) : 0 })
    }
    if (!result.paging?.next) {
      const days = []
      // Yalnızca TAM başarılı yanıtın atladığı günleri sıfırla tamamla.
      for (let day = since; day <= until; day = shiftDay(day, 1)) days.push(byDay.get(day) || { date: day, spend: 0, impressions: 0, messages: 0 })
      return days
    }
    const after = result.paging?.cursors?.after
    if (typeof after !== 'string' || !after || cursors.has(after)) throw new MetaSyncError('INVALID_DATA')
    cursors.add(after)
    // paging.next URL'sini takip etme: erişim anahtarı başka sunucuya gitmesin.
    url.searchParams.set('after', after)
  }
  throw new MetaSyncError('INVALID_DATA')
}
export function createMetaSync({ serviceKey, fetchImpl = fetch } = {}) {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
  async function db(path, options = {}) {
    if (!serviceKey) throw new MetaSyncError('DATABASE_FAILED')
    try {
      return await jsonResponse(await fetchImpl(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers, signal: AbortSignal.timeout(15000) }), 'DATABASE_FAILED')
    } catch (error) { throw error instanceof MetaSyncError ? error : new MetaSyncError('DATABASE_FAILED') }
  }
  const rpc = (name, params) => db(`rpc/${name}`, { method: 'POST', body: JSON.stringify(params) })
  async function connections(branchId) {
    const filter = branchId ? `branch_id=eq.${encodeURIComponent(branchId)}` : 'ad_account_id=not.is.null'
    const rows = []
    for (let offset = 0; ;) {
      const page = await db(`meta_connections?${filter}&select=branch_id,access_token,ad_account_id&order=branch_id&limit=500&offset=${offset}`)
      if (!Array.isArray(page)) throw new MetaSyncError('DATABASE_FAILED')
      rows.push(...page)
      if (page.length === 0) return rows
      offset += page.length
    }
  }
  async function sync(connection, since, until) {
    let runId
    try {
      runId = await rpc('begin_meta_sync', { p_branch_id: connection.branch_id, p_account_id: connection.ad_account_id, p_since: since, p_until: until })
      if (typeof runId !== 'string') throw new MetaSyncError('DATABASE_FAILED')
      const days = await collectMetaDays({ accountId: connection.ad_account_id, token: connection.access_token, since, until, fetchImpl })
      const saved = await rpc('complete_meta_sync', { p_branch_id: connection.branch_id, p_run_id: runId, p_days: days })
      if (saved?.ok !== true) throw new MetaSyncError('DATABASE_FAILED')
      return { ...saved, since, until }
    } catch (error) {
      const safe = error instanceof MetaSyncError ? error : new MetaSyncError('META_FAILED')
      if (runId) {
        try { await rpc('fail_meta_sync', { p_branch_id: connection.branch_id, p_run_id: runId, p_code: safe.code }) } catch { /* Önceki başarı zamanı değiştirilmez. */ }
      }
      throw safe
    }
  }
  return { connections, sync }
}
