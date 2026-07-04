// Netlify Scheduled Function: Her gün otomatik olarak, Meta bağlantısı olan
// TÜM şubelerin son günlerin harcama/gösterim/mesaj verisini çeker.
// Kullanıcı hiçbir şey yapmaz - veri kendiliğinden güncellenir.
//
// Zamanlama: her gün Türkiye saatiyle 06:00 (UTC 03:00) - Meta'nın önceki günün
// verisini tam olarak kapatmış olması için sabahı seçtik, gece yarısı hemen sonrası
// veriler bazen eksik/geçici olabiliyor.

const SUPABASE_URL = 'https://rngahpybhgdqabbkldrr.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GRAPH_VERSION = 'v21.0'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }

async function fetchBranchInsights(branchId, accessToken, adAccountId) {
  // Son 3 günü çekiyoruz (sadece dün değil) - Meta'nın verisi bazen 1 gün gecikmeli
  // kesinleşiyor, bu şekilde önceki gün eksik/yanlış gelmişse otomatik düzelir.
  const insightsUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${adAccountId}/insights` +
    `?fields=spend,impressions,actions&date_preset=last_3d&time_increment=1&access_token=${accessToken}`
  const res = await fetch(insightsUrl)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Meta verisi alınamadı')

  const rows = data.data || []
  return rows.map(row => {
    const messagesAction = (row.actions || []).find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')
    return {
      id: uid(), branch_id: branchId, channel: 'Meta (Otomatik)',
      spend: Number(row.spend) || 0, impressions: Number(row.impressions) || 0,
      messages: messagesAction ? Number(messagesAction.value) : 0,
      date: row.date_start,
    }
  })
}

export default async () => {
  const results = { processed: 0, failed: 0, details: [] }

  try {
    // 1) Reklam hesabı seçilmiş TÜM bağlantıları çek
    const connRes = await fetch(
      `${SUPABASE_URL}/rest/v1/meta_connections?ad_account_id=not.is.null&select=branch_id,access_token,ad_account_id`,
      { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
    )
    const connections = await connRes.json()

    if (!Array.isArray(connections) || connections.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'Bağlı şube yok' }), { status: 200 })
    }

    // 2) Her şube için ayrı ayrı veri çek (biri hata verirse diğerleri etkilenmesin)
    for (const conn of connections) {
      try {
        const rows = await fetchBranchInsights(conn.branch_id, conn.access_token, conn.ad_account_id)
        if (rows.length > 0) {
          const dates = rows.map(r => r.date)
          // Aynı güne ait önceki otomatik kayıtları temizleyip yeniden yaz (idempotent)
          await fetch(
            `${SUPABASE_URL}/rest/v1/ads_data?branch_id=eq.${encodeURIComponent(conn.branch_id)}&channel=eq.${encodeURIComponent('Meta (Otomatik)')}&date=in.(${dates.join(',')})`,
            { method: 'DELETE', headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
          )
          await fetch(`${SUPABASE_URL}/rest/v1/ads_data`, {
            method: 'POST',
            headers: {
              apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json', Prefer: 'return=minimal',
            },
            body: JSON.stringify(rows),
          })
        }
        results.processed++
        results.details.push({ branch_id: conn.branch_id, inserted: rows.length })
      } catch (err) {
        results.failed++
        results.details.push({ branch_id: conn.branch_id, error: err.message })
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 })
  }
}

export const config = {
  schedule: '0 3 * * *',
}
