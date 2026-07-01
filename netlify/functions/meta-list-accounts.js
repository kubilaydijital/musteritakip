// Netlify Function: Bir şubenin Meta bağlantısına ait, seçilebilir reklam hesaplarını listeler.
// Panelde "Hangi reklam hesabını bağlamak istersiniz?" adımında kullanılır.

const SUPABASE_URL = 'https://rngahpybhgdqabbkldrr.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GRAPH_VERSION = 'v21.0'

export async function handler(event) {
  const { branch_id } = event.queryStringParameters || {}
  if (!branch_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'branch_id gerekli' }) }
  }

  try {
    // 1) Bu şubenin kayıtlı Meta bağlantısını (token'ını) çek
    const connRes = await fetch(
      `${SUPABASE_URL}/rest/v1/meta_connections?branch_id=eq.${encodeURIComponent(branch_id)}&select=access_token`,
      { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
    )
    const conns = await connRes.json()
    if (!Array.isArray(conns) || conns.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Bu şube için Meta bağlantısı bulunamadı' }) }
    }
    const accessToken = conns[0].access_token

    // 2) Meta Graph API'den kullanıcının erişebildiği reklam hesaplarını çek
    const adAccountsRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me/adaccounts?fields=id,name,account_status,currency&access_token=${accessToken}`
    )
    const adAccountsData = await adAccountsRes.json()
    if (!adAccountsRes.ok) {
      throw new Error(adAccountsData.error?.message || 'Reklam hesapları alınamadı')
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ accounts: adAccountsData.data || [] }),
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
