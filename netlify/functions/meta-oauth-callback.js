// Netlify Function: Meta OAuth akışının geri dönüş (callback) adresi.
// Kullanıcı Meta'da izin verdikten sonra buraya bir "code" ile yönlendirilir.
// Bu Function, o kodu gerçek (uzun ömürlü) bir erişim anahtarına çevirip
// meta_connections tablosuna kaydeder.

const SUPABASE_URL = 'https://rngahpybhgdqabbkldrr.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const META_APP_ID = process.env.META_APP_ID
const META_APP_SECRET = process.env.META_APP_SECRET
const REDIRECT_URI = 'https://musteritakip.net/.netlify/functions/meta-oauth-callback'
const GRAPH_VERSION = 'v21.0'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }

export async function handler(event) {
  const { code, state, error: oauthError } = event.queryStringParameters || {}

  // Kullanıcı izni reddettiyse ya da hata döndüyse, panele bir hata mesajıyla geri gönder.
  if (oauthError) {
    return {
      statusCode: 302,
      headers: { Location: `https://musteritakip.net/giris?meta_error=${encodeURIComponent(oauthError)}` },
    }
  }

  if (!code || !state) {
    return { statusCode: 400, body: 'Eksik parametre (code veya state)' }
  }

  // "state" parametresi, bağlantıyı başlatan branch_id'yi taşıyor.
  const branchId = state

  try {
    // 1) Kısa ömürlü token al
    const tokenRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${META_APP_SECRET}&code=${code}`
    )
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error?.message || 'Token alınamadı')
    }

    // 2) Kısa ömürlü token'ı uzun ömürlü (60 gün) token'a çevir
    const longRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
    )
    const longData = await longRes.json()
    if (!longRes.ok || !longData.access_token) {
      throw new Error(longData.error?.message || 'Uzun ömürlü token alınamadı')
    }

    const expiresAt = new Date(Date.now() + (longData.expires_in || 5184000) * 1000).toISOString()

    // 3) Bağlantıyı veritabanına kaydet (henüz ad_account_id seçilmedi, panelden seçilecek)
    const connId = uid()
    const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/meta_connections?on_conflict=branch_id`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal, resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: connId, branch_id: branchId, access_token: longData.access_token,
        token_expires_at: expiresAt, updated_at: new Date().toISOString(),
      }),
    })

    if (!upsertRes.ok) {
      const errText = await upsertRes.text()
      throw new Error('Bağlantı kaydedilemedi: ' + errText)
    }

    // 4) Kullanıcıyı panelde, reklam hesabı seçme adımına yönlendir
    return {
      statusCode: 302,
      headers: { Location: `https://musteritakip.net/giris?meta_connected=1&branch=${branchId}` },
    }
  } catch (err) {
    return {
      statusCode: 302,
      headers: { Location: `https://musteritakip.net/giris?meta_error=${encodeURIComponent(err.message)}` },
    }
  }
}
