// Netlify Function: 14 günlük deneme hesabı oluştuğunda, kullanıcıya giriş bilgilerini
// e-posta ile gönderir. Resend API key'i Netlify environment variable olarak saklanır
// (RESEND_API_KEY), frontend'e asla açık edilmez.

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

  const { email, contactName, businessName, username, password } = payload

  if (!email || !username || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Eksik alanlar' }) }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Sunucu yapılandırma hatası' }) }
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #070D18; color: #ffffff; border-radius: 16px;">
      <h2 style="color: #7C5CFC; margin: 0 0 16px;">Müşteri Takip'e Hoş Geldiniz!</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
        Merhaba ${contactName || ''},<br/><br/>
        <strong>${businessName || 'İşletmeniz'}</strong> için 14 günlük ücretsiz deneme hesabınız oluşturuldu. Giriş bilgileriniz aşağıdadır:
      </p>
      <div style="background: rgba(255,255,255,0.06); border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
        <p style="font-size: 12px; color: #94A3B8; margin: 0 0 4px;">Kullanıcı adı</p>
        <p style="font-size: 16px; font-weight: 700; margin: 0 0 14px; color: #ffffff;">${username}</p>
        <p style="font-size: 12px; color: #94A3B8; margin: 0 0 4px;">Şifre</p>
        <p style="font-size: 16px; font-weight: 700; margin: 0; color: #ffffff;">${password}</p>
      </div>
      <a href="https://musteritakip.net/giris" style="display: inline-block; background: #7C5CFC; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px;">
        Panele Giriş Yap
      </a>
      <p style="font-size: 12.5px; color: #64748B; margin-top: 24px;">
        Sorularınız için bu e-postayı yanıtlayabilir ya da WhatsApp üzerinden bize yazabilirsiniz.
      </p>
    </div>
  `

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Müşteri Takip <info@musteritakip.net>',
        to: [email],
        subject: 'Müşteri Takip - Deneme Hesabınız Hazır',
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
