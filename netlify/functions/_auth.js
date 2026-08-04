import { createHmac, timingSafeEqual } from 'node:crypto'

// Bu anahtar tarayıcıda da bulunabilen "publishable" anahtardır; gizli bir anahtar değildir.
// Kullanıcının gönderdiği oturum token'ını Supabase Auth'a doğrulatmak için kullanılır.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rngahpybhgdqabbkldrr.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IzGAUw3EEdYfsPVT4VZOtA_PH3cVJmy'

const ROLE_DEFAULTS = {
  super_admin: {
    can_see_all_branches: true,
    can_manage_users: true,
    can_manage_branches: true,
    can_enter_ads_data: true,
  },
  admin: {
    can_manage_users: true,
    can_manage_branches: true,
    can_enter_ads_data: true,
  },
  manager: {},
  staff: {},
}

function response(statusCode, error) {
  return { statusCode, body: JSON.stringify({ error }) }
}

function getBearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

function resolvePermissions(profile) {
  const defaults = ROLE_DEFAULTS[profile.role] || ROLE_DEFAULTS.staff
  const template = Array.isArray(profile.permission_templates)
    ? profile.permission_templates[0] || {}
    : profile.permission_templates || {}
  return {
    ...defaults,
    ...Object.fromEntries(Object.entries(template).filter(([, value]) => value !== undefined && value !== null)),
  }
}

// Netlify Function'larının tamamı için ortak güvenlik kapısı.
// Yalnızca ekranı gizlemek yerine, isteği sunucuda gerçekten yapan kişinin
// aktif bir kullanıcı ve gerekli yetkiye sahip olduğunu doğrular.
export async function requireAuthorizedUser(event, { permission, branchId, superAdminOnly = false } = {}) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { error: response(500, 'Sunucu yapılandırma hatası') }
  }

  const accessToken = getBearerToken(event)
  if (!accessToken) {
    return { error: response(401, 'Giriş yapmanız gerekiyor') }
  }

  try {
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    })
    const authUser = await authRes.json()
    if (!authRes.ok || !authUser?.id) {
      return { error: response(401, 'Oturumunuz geçersiz veya süresi dolmuş') }
    }

    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/app_users?id=eq.${encodeURIComponent(authUser.id)}&select=id,role,branch_id,active,permission_templates(*)`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
    )
    const profiles = await profileRes.json()
    const profile = Array.isArray(profiles) ? profiles[0] : null
    if (!profileRes.ok || !profile || profile.active === false) {
      return { error: response(403, 'Bu hesap bu işlemi yapamaz') }
    }

    const permissions = resolvePermissions(profile)
    const isSuperAdmin = Boolean(
      permissions.can_see_all_branches && permissions.can_manage_users && permissions.can_manage_branches
    )

    if (superAdminOnly && !isSuperAdmin) {
      return { error: response(403, 'Bu işlem yalnızca süper admin tarafından yapılabilir') }
    }
    if (permission && !permissions[permission]) {
      return { error: response(403, 'Bu işlem için yetkiniz yok') }
    }
    if (branchId && !isSuperAdmin && profile.branch_id !== branchId) {
      return { error: response(403, 'Başka bir şube için işlem yapamazsınız') }
    }

    return { authUser, profile, permissions, isSuperAdmin, serviceRoleKey }
  } catch {
    return { error: response(500, 'Yetki kontrolü yapılamadı') }
  }
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

// Meta yönlendirmesinde kullanılan state, şube bilgisinin dışarıdan değiştirilmesini engeller.
export function createMetaOAuthState({ branchId, userId }) {
  const secret = process.env.META_OAUTH_STATE_SECRET
  if (!secret) throw new Error('META_OAUTH_STATE_SECRET tanımlı değil')

  const payload = base64Url(JSON.stringify({ branchId, userId, exp: Date.now() + 10 * 60 * 1000 }))
  return `${payload}.${sign(payload, secret)}`
}

export function verifyMetaOAuthState(state) {
  const secret = process.env.META_OAUTH_STATE_SECRET
  if (!secret) throw new Error('META_OAUTH_STATE_SECRET tanımlı değil')

  const [payload, signature] = String(state || '').split('.')
  if (!payload || !signature) return null

  const expected = sign(payload, secret)
  const signatureBytes = Buffer.from(signature)
  const expectedBytes = Buffer.from(expected)
  if (signatureBytes.length !== expectedBytes.length || !timingSafeEqual(signatureBytes, expectedBytes)) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data.branchId || !data.userId || !Number.isFinite(data.exp) || data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}
