import { requireAuthorizedUser } from './_auth.js'
import { createMetaSync, rangeError, shiftDay, turkeyDay } from './_meta-sync.js'

export async function handler(event) {
  const reply = (statusCode, data) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' })
  let payload
  try { payload = JSON.parse(event.body || '{}') } catch { return reply(400, { error: 'Geçersiz istek gövdesi.' }) }
  if (!payload || typeof payload.branch_id !== 'string' || !payload.branch_id.trim()) return reply(400, { error: 'Şube seçin.' })
  const today = turkeyDay(), since = payload.since || shiftDay(today, -6), until = payload.until || today
  const invalid = rangeError(since, until)
  if (invalid) return reply(400, { error: invalid })
  const auth = await requireAuthorizedUser(event, { permission: 'can_enter_ads_data', branchId: payload.branch_id })
  if (auth.error) return auth.error
  try {
    const api = createMetaSync({ serviceKey: auth.serviceRoleKey })
    const connections = await api.connections(payload.branch_id)
    if (connections.length !== 1 || !connections[0].ad_account_id) return reply(404, { error: 'Bu şube için Meta reklam hesabı bağlı değil.' })
    return reply(200, await api.sync(connections[0], since, until))
  } catch (error) {
    return reply(error.code === 'TOKEN_EXPIRED' ? 401 : 502, { error: error.message, code: error.code })
  }
}
