// Netlify Function: Yeni personel/admin kullanıcısı oluşturur.
// Supabase'in admin.createUser API'si SADECE service role key ile çalışır,
// bu yüzden bu işlem tarayıcıda değil, güvenli sunucu tarafında yapılmalı.

import { requireAuthorizedUser } from './_auth.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rngahpybhgdqabbkldrr.supabase.co'
// Service role key, Netlify environment variable olarak saklanıyor (asla kod içine yazılmaz).
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

  const { email, password, full_name, branch_id, role, permission_template_id, trial_days } = payload

  if (!email || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'E-posta ve şifre gerekli' }) }
  }

  // Kullanıcı açmak, tüm sisteme erişim verebildiği için yalnızca süper admin'e açıktır.
  const authorization = await requireAuthorizedUser(event, { superAdminOnly: true })
  if (authorization.error) return authorization.error
  const { serviceRoleKey } = authorization

  // Panelden açılan hesaplar da (self-servis kayıt gibi) varsayılan olarak deneme süresiyle başlar.
  // trial_days gönderilmezse varsayılan 7 gün. Kim çağırırsa çağırsın (tarayıcı arayüzü atlanıp
  // doğrudan bu uca istek gönderilse bile) süre en fazla 30 gün olabilir - bu üst sınır,
  // işletme sahiplerinin kendi kendine sınırsız/aşırı uzun deneme süresi vermesini engeller.
  const requestedDays = Number.isFinite(Number(trial_days)) && Number(trial_days) > 0 ? Number(trial_days) : 7
  const days = Math.min(requestedDays, 30)
  const trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

  try {
    // 1) Supabase Auth admin API ile kullanıcı oluştur (email_confirm: true -> doğrulama beklemeden aktif)
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || null },
      }),
    })

    const created = await createRes.json()

    if (!createRes.ok) {
      // Supabase genelde "already registered" gibi anlaşılır hatalar döndürür
      return { statusCode: createRes.status, body: JSON.stringify({ error: created.msg || created.error_description || 'Kullanıcı oluşturulamadı' }) }
    }

    const userId = created.id

    // 2) handle_new_user() trigger'ı otomatik olarak app_users'a bir satır ekledi (role='admin' varsayılan).
    // Bu satırı, panelden seçilen gerçek branch_id/role/permission_template_id ile güncelliyoruz.
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/app_users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        branch_id: branch_id || null,
        role: role || 'staff',
        permission_template_id: permission_template_id || null,
        is_trial: true,
        trial_ends_at: trialEndsAt,
      }),
    })

    const updated = await updateRes.json()

    if (!updateRes.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Kullanıcı oluşturuldu ama profil güncellenemedi', detail: updated }) }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, user: updated[0] }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
