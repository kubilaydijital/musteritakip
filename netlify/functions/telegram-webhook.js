// Netlify Function: Telegram Bot Webhook
//
// İşleyiş: İşletme sahibi https://t.me/<bot_kullanici_adi>?start=<branch_id>
// linkine tıklayıp "BAŞLAT" butonuna bastığında, Telegram bu fonksiyonu
// { message: { chat: { id }, text: "/start <branch_id>" } } şeklinde çağırır.
// Biz de branch_id'yi ayıklayıp o şubenin telegram_chat_id alanına yazarız.
// Kullanıcı hiçbir kod/ID görmez veya kopyalamaz - tamamen otomatik.

const SUPABASE_URL = 'https://rngahpybhgdqabbkldrr.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  let update
  try {
    update = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 200, body: 'ok' } // Telegram'a her zaman 200 dön, aksi halde tekrar tekrar dener
  }

  const message = update.message
  if (!message || !message.text) {
    return { statusCode: 200, body: 'ok' }
  }

  const chatId = message.chat.id
  const text = message.text.trim()

  // "/start <branch_id>" formatını yakala
  const match = text.match(/^\/start\s+(.+)$/)
  if (!match) {
    return { statusCode: 200, body: 'ok' }
  }

  const branchId = match[1].trim()

  try {
    // Şubeyi bul ve doğrula
    const branchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/branches?id=eq.${encodeURIComponent(branchId)}&select=id,name`,
      { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
    )
    const branches = await branchRes.json()
    const branch = branches[0]

    if (!branch) {
      await sendMessage(chatId, '⚠️ Bu bağlantı geçersiz görünüyor. Lütfen Müşteri Takip ekibiyle iletişime geçin.')
      return { statusCode: 200, body: 'ok' }
    }

    // chat_id'yi şubeye kaydet
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/branches?id=eq.${encodeURIComponent(branchId)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ telegram_chat_id: String(chatId) }),
      }
    )

    if (!updateRes.ok) {
      throw new Error('Şube güncellenemedi: ' + (await updateRes.text()))
    }

    await sendMessage(
      chatId,
      `✅ Bağlantı tamamlandı!\n\n<b>${branch.name}</b> şubesinin günlük performans raporlarını artık buradan alacaksınız.`
    )

    return { statusCode: 200, body: 'ok' }
  } catch (err) {
    return { statusCode: 200, body: 'ok' } // Hata olsa bile Telegram'a 200 dönmek gerekir
  }
}
