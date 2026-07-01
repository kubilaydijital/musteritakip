// Netlify Function: Yeni personel/admin kullanıcısı oluşturur.
// Supabase'in admin.createUser API'si SADECE service role key ile çalışır,
// bu yüzden bu işlem tarayıcıda değil, güvenli sunucu tarafında yapılmalı.

const SUPABASE_URL = 'https://rngahpybhgdqabbkldrr.supabase.co'
// Service role key, Netlify environment variable olarak saklanıyor (asla kod içine yazılmaz).
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  if (!SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Sunucu yapılandırma hatası: SUPABASE_SERVICE_ROLE_KEY tanımlı değil' }) }
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Geçersiz istek gövdesi' }) }
  }

  const { email, password, full_name, branch_id, role, permission_template_id } = payload

  if (!email || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'E-posta ve şifre gerekli' }) }
  }

  try {
    // 1) Supabase Auth admin API ile kullanıcı oluştur (email_confirm: true -> doğrulama beklemeden aktif)
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
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
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        branch_id: branch_id || null,
        role: role || 'staff',
        permission_template_id: permission_template_id || null,
        is_trial: false,
        trial_ends_at: null,
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
