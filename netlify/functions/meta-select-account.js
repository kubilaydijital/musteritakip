// Netlify Function: Kullanıcının seçtiği Meta reklam hesabını, şubenin bağlantı kaydına yazar.

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

  const { branch_id, ad_account_id, ad_account_name } = payload
  if (!branch_id || !ad_account_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'branch_id ve ad_account_id gerekli' }) }
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/meta_connections?branch_id=eq.${encodeURIComponent(branch_id)}`, {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=representation',
      },
      body: JSON.stringify({ ad_account_id, ad_account_name, updated_at: new Date().toISOString() }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(JSON.stringify(data))
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
