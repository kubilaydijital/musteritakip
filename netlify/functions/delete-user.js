// Netlify Function: Bir kullanıcıyı hem app_users tablosundan hem de gerçek
// Supabase Auth kaydından (giriş yapabilme yetkisi) tamamen siler.
// Auth kullanıcısını silmek admin API (service role key) gerektirdiği için
// bu işlem güvenli sunucu tarafında yapılıyor, tarayıcıda değil.

const SUPABASE_URL = 'https://rngahpybhgdqabbkldrr.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

  const { userId } = payload
  if (!userId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'userId gerekli' }) }
  }

  try {
    // 1) app_users tablosundan sil
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    })
    if (!dbRes.ok) {
      const errText = await dbRes.text()
      throw new Error('app_users silinemedi: ' + errText)
    }

    // 2) Supabase Auth kaydını sil (gerçek giriş yetkisini kaldırır)
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    })
    // Auth kaydı zaten yoksa (örn. daha önce silinmişse) 404 dönebilir, bunu hataya saymayalım.
    if (!authRes.ok && authRes.status !== 404) {
      const errText = await authRes.text()
      throw new Error('Auth kullanıcısı silinemedi: ' + errText)
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
