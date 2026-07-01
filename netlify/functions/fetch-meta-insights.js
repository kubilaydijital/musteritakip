// Netlify Function: Bağlı bir şubenin Meta reklam hesabından son 7 günün günlük
// harcama/gösterim/mesaj verisini çeker ve ads_data tablosuna yazar.
// Panelden "Meta Verilerini Çek" butonuyla manuel tetiklenir.

const SUPABASE_URL = 'https://rngahpybhgdqabbkldrr.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GRAPH_VERSION = 'v21.0'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Geçersiz istek gövdesi' }) }
  }

  const { branch_id } = payload
  if (!branch_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'branch_id gerekli' }) }
  }

  try {
    // 1) Bağlantı bilgisini çek
    const connRes = await fetch(
      `${SUPABASE_URL}/rest/v1/meta_connections?branch_id=eq.${encodeURIComponent(branch_id)}&select=access_token,ad_account_id`,
      { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
    )
    const conns = await connRes.json()
    if (!Array.isArray(conns) || conns.length === 0 || !conns[0].ad_account_id) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Bu şube için Meta reklam hesabı bağlı değil' }) }
    }
    const { access_token: accessToken, ad_account_id: adAccountId } = conns[0]

    // 2) Meta Insights API'den son 7 günün GÜNLÜK kırılımını çek.
    // messaging_conversation_started_7d: Messenger/Instagram'da başlatılan mesajlaşma sayısı.
    const insightsUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${adAccountId}/insights` +
      `?fields=spend,impressions,actions` +
      `&date_preset=last_7d&time_increment=1&access_token=${accessToken}`
    const insightsRes = await fetch(insightsUrl)
    const insightsData = await insightsRes.json()
    if (!insightsRes.ok) {
      throw new Error(insightsData.error?.message || 'Meta verisi alınamadı')
    }

    const rows = insightsData.data || []
    if (rows.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, inserted: 0, message: 'Son 7 günde veri bulunamadı' }) }
    }

    // 3) Her günü ads_data satırına çevir (channel: 'Meta (Otomatik)' olarak işaretlenir,
    // manuel girilen kayıtlarla karışmasın diye).
    const toInsert = rows.map(row => {
      const messagesAction = (row.actions || []).find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')
      return {
        id: uid(),
        branch_id,
        channel: 'Meta (Otomatik)',
        spend: Number(row.spend) || 0,
        impressions: Number(row.impressions) || 0,
        messages: messagesAction ? Number(messagesAction.value) : 0,
        date: row.date_start,
      }
    })

    // 4) Aynı gün için daha önce otomatik çekilmiş kayıt varsa, üzerine yazmak yerine
    // önce onları silip yeniden ekliyoruz (idempotent - tekrar tekrar çekmek güvenli).
    const dates = toInsert.map(r => r.date)
    await fetch(
      `${SUPABASE_URL}/rest/v1/ads_data?branch_id=eq.${encodeURIComponent(branch_id)}&channel=eq.${encodeURIComponent('Meta (Otomatik)')}&date=in.(${dates.join(',')})`,
      { method: 'DELETE', headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
    )

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/ads_data`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify(toInsert),
    })
    if (!insertRes.ok) {
      const errText = await insertRes.text()
      throw new Error('Veri yazılamadı: ' + errText)
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, inserted: toInsert.length }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
