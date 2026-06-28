// Netlify Function: "Şifremi unuttum" akışı.
// E-posta adresine kayıtlı kullanıcıyı Supabase'de bulur, yeni rastgele şifre üretir,
// veritabanında günceller ve Resend ile kullanıcıya mail gönderir.
// Supabase'e REST API üzerinden bağlanılıyor (npm paketi gerekmez, send-trial-email.js
// ile aynı yaklaşım).

const SUPABASE_URL = 'https://rngahpybhgdqabbkldrr.supabase.co'
const SUPABASE_KEY = 'sb_publishable_IzGAUw3EEdYfsPVT4VZOtA_PH3cVJmy'

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

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

  const { email } = payload
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'E-posta gerekli' }) }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Sunucu yapılandırma hatası' }) }
  }

  try {
    // 1) E-postaya kayıtlı kullanıcıyı bul
    const findRes = await fetch(
      `${SUPABASE_URL}/rest/v1/app_users?email=eq.${encodeURIComponent(email)}&select=username,email`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    const matches = await findRes.json()

    // Güvenlik: e-posta kayıtlı olmasa da aynı "200 OK" cevabı dönülür ki sistemde
    // hangi e-postaların kayıtlı olduğu dışarıdan anlaşılamasın (frontend zaten bunu
    // aynı mesajla gösteriyor).
    if (!Array.isArray(matches) || matches.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) }
    }

    const user = matches[0]
    const newPassword = generatePassword()

    // 2) Şifreyi güncelle
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/app_users?username=eq.${encodeURIComponent(user.username)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json', Prefer: 'return=minimal',
        },
        body: JSON.stringify({ password: newPassword }),
      }
    )
    if (!updateRes.ok) {
      const errText = await updateRes.text()
      return { statusCode: 502, body: JSON.stringify({ error: 'Şifre güncellenemedi', detail: errText }) }
    }

    // 3) Yeni şifreyi mail ile gönder
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #070D18; color: #ffffff; border-radius: 16px;">
        <h2 style="color: #7C5CFC; margin: 0 0 16px;">Şifreniz Sıfırlandı</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Müşteri Takip hesabınız için yeni şifreniz aşağıdadır:
        </p>
        <div style="background: rgba(255,255,255,0.06); border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
          <p style="font-size: 12px; color: #94A3B8; margin: 0 0 4px;">Kullanıcı adı</p>
          <p style="font-size: 16px; font-weight: 700; margin: 0 0 14px; color: #ffffff;">${user.username}</p>
          <p style="font-size: 12px; color: #94A3B8; margin: 0 0 4px;">Yeni şifre</p>
          <p style="font-size: 16px; font-weight: 700; margin: 0; color: #ffffff;">${newPassword}</p>
        </div>
        <a href="https://musteritakip.net/giris" style="display: inline-block; background: #7C5CFC; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px;">
          Panele Giriş Yap
        </a>
        <p style="font-size: 12.5px; color: #64748B; margin-top: 24px;">
          Bu talebi siz oluşturmadıysanız, bu e-postayı görmezden gelebilirsiniz; şifreniz yine de değiştiği için panelden tekrar "Şifremi unuttum" ile yeni bir şifre alabilirsiniz.
        </p>
      </div>
    `

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: 'Müşteri Takip <info@musteritakip.net>',
        to: [email],
        subject: 'Müşteri Takip - Yeni Şifreniz',
        html,
      }),
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text()
      return { statusCode: 502, body: JSON.stringify({ error: 'Mail gönderilemedi', detail: errText }) }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
