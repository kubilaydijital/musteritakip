import { requireAuthorizedUser } from './_auth.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rngahpybhgdqabbkldrr.supabase.co'

function badRequest(error) {
  return { statusCode: 400, body: JSON.stringify({ error }) }
}

async function updateAppUser(userId, changes, serviceRoleKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(changes),
  })
  const data = await res.json()
  if (!res.ok || !data[0]) throw new Error('Kullanıcı güncellenemedi')
  return data[0]
}

// Kullanıcı hesabını değiştiren her işlem, tarayıcı yerine burada yetkilendirilir.
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return badRequest('Geçersiz istek gövdesi')
  }

  const { action, userId } = payload
  if (!action || !userId) return badRequest('action ve userId gerekli')

  const authorization = await requireAuthorizedUser(event, { superAdminOnly: true })
  if (authorization.error) return authorization.error
  const { serviceRoleKey } = authorization

  try {
    let user

    if (action === 'set_active') {
      if (typeof payload.active !== 'boolean') return badRequest('active alanı gerekli')
      user = await updateAppUser(userId, { active: payload.active }, serviceRoleKey)
    } else if (action === 'extend_trial') {
      const targetRes = await fetch(`${SUPABASE_URL}/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}&select=trial_ends_at`, {
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      })
      const targets = await targetRes.json()
      const currentEnd = Array.isArray(targets) ? targets[0]?.trial_ends_at : null
      const base = currentEnd && new Date(currentEnd) > new Date() ? new Date(currentEnd) : new Date()
      const trialEndsAt = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      user = await updateAppUser(userId, { is_trial: true, trial_ends_at: trialEndsAt }, serviceRoleKey)
    } else if (action === 'grant_unlimited') {
      user = await updateAppUser(userId, { is_trial: false, trial_ends_at: null }, serviceRoleKey)
    } else if (action === 'change_name') {
      const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim().slice(0, 100) : ''
      if (!fullName) return badRequest('Ad soyad gerekli')
      user = await updateAppUser(userId, { full_name: fullName }, serviceRoleKey)
    } else if (action === 'change_email') {
      const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
      if (!/^\S+@\S+\.\S+$/.test(email)) return badRequest('Geçerli bir e-posta adresi gerekli')

      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, email_confirm: true }),
      })
      if (!authRes.ok) throw new Error('Giriş e-postası güncellenemedi')
      user = await updateAppUser(userId, { email }, serviceRoleKey)
    } else {
      return badRequest('Bilinmeyen işlem')
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, user }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Kullanıcı güncellenemedi' }) }
  }
}
