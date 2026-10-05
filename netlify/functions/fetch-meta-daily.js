import { createMetaSync, shiftDay, turkeyDay } from './_meta-sync.js'

// Türkiye saatiyle 06:00: bugün ve önceki iki günü yeniden doğrular.
// Bugünkü sonuçlar geçicidir; sonraki çekimlerde güncellenir.
export default async () => {
  const results = { processed: 0, failed: 0, details: [] }
  try {
    const api = createMetaSync({ serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY })
    const today = turkeyDay(), since = shiftDay(today, -2)
    for (const connection of await api.connections()) {
      try {
        const saved = await api.sync(connection, since, today)
        results.processed++
        results.details.push({ branch_id: connection.branch_id, inserted: saved.inserted })
      } catch (error) {
        results.failed++
        results.details.push({ branch_id: connection.branch_id, code: error.code, error: error.message })
      }
    }
    return Response.json({ ok: results.failed === 0, ...results }, { status: results.failed ? 502 : 200 })
  } catch (error) {
    return Response.json({ ok: false, error: error.message, code: error.code }, { status: 500 })
  }
}
export const config = { schedule: '0 3 * * *' }
