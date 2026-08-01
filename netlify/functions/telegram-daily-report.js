// Netlify Scheduled Function: Her akşam Türkiye saatiyle 20:00'de
// (UTC 17:00), Telegram bağlantısı olan HER şube için o günün özetini
// hesaplar ve Telegram'a otomatik mesaj olarak gönderir.
// Kullanıcı hiçbir şey yapmaz - rapor kendiliğinden gelir.

const SUPABASE_URL = 'https://rngahpybhgdqabbkldrr.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

function fmtTL(n) {
  return Math.round(n).toLocaleString('tr-TR') + ' TL'
}

// Türkiye saatiyle "bugün"ün başlangıç ve bitişini UTC'ye çevirir.
function todayRangeUTC() {
  const now = new Date()
  const trNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
  const y = trNow.getFullYear(), m = trNow.getMonth(), d = trNow.getDate()
  const startTR = new Date(y, m, d, 0, 0, 0)
  const endTR = new Date(y, m, d, 23, 59, 59, 999)
  // TR = UTC+3 sabit kabul ediyoruz (yaz saati uygulaması olmadığı için güvenli)
  const startUTC = new Date(startTR.getTime() - 3 * 60 * 60 * 1000)
  const endUTC = new Date(endTR.getTime() - 3 * 60 * 60 * 1000)
  return { startUTC, endUTC, label: startTR.toLocaleDateString('tr-TR') }
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

function buildReport(branchName, dateLabel, todayLeads, pendingCount) {
  const totalMsg = todayLeads.length
  const appointed = todayLeads.filter(l =>
    ['Randevu aldı', 'Randevuya gelmedi', 'Satın almadı', 'Müşteri oldu'].includes(l.result)
  ).length
  const arrived = todayLeads.filter(l => ['Satın almadı', 'Müşteri oldu'].includes(l.result)).length
  const customers = todayLeads.filter(l => l.result === 'Müşteri oldu')
  const revenue = customers.reduce((s, l) => s + (Number(l.sale_amount) || 0), 0)

  const lines = [
    `📊 <b>${branchName}</b> — ${dateLabel} Günlük Özet`,
    '',
    `💬 Bugün gelen mesaj/görüşme: <b>${totalMsg}</b>`,
    `📅 Bugün randevu verilen: <b>${appointed}</b>`,
    `✅ Bugün gelen randevu: <b>${arrived}</b>`,
    `💰 Bugünkü satış: <b>${customers.length}</b>${customers.length ? ` (${fmtTL(revenue)})` : ''}`,
  ]
  if (pendingCount > 0) {
    lines.push('', `🚨 Takip bekleyen (uzun süredir dönüş yapılmamış): <b>${pendingCount}</b> lead`)
  }
  return lines.join('\n')
}

export default async () => {
  const results = { sent: 0, failed: 0, details: [] }

  try {
    const branches = await sbGet('branches?telegram_chat_id=not.is.null&select=id,name,telegram_chat_id')

    if (branches.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'Telegram bağlantısı olan şube yok' }), { status: 200 })
    }

    const { startUTC, endUTC, label } = todayRangeUTC()

    for (const branch of branches) {
      try {
        const todayLeads = await sbGet(
          `leads?branch_id=eq.${branch.id}&date=gte.${startUTC.toISOString()}&date=lte.${endUTC.toISOString()}&select=result,sale_amount`
        )

        // "Takip bekleyen": son notu 3+ gün önce olan, hâlâ açık (Müşteri oldu
        // olmayan, cevap bekleyen/gelmeyen) kayıtlar - panel içindeki hatırlatma
        // kurallarının basitleştirilmiş bir yaklaşımı.
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        const pending = await sbGet(
          `leads?branch_id=eq.${branch.id}` +
          `&result=in.("Randevuya gelmedi","Cevap yazıldı, müşteriden dönüş gelmedi","Satın almadı")` +
          `&last_note_at=lt.${threeDaysAgo}&select=id`
        )

        const text = buildReport(branch.name, label, todayLeads, pending.length)
        await sendMessage(branch.telegram_chat_id, text)
        results.sent++
        results.details.push({ branch: branch.name, ok: true })
      } catch (err) {
        results.failed++
        results.details.push({ branch: branch.name, error: err.message })
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 })
  }
}

export const config = {
  schedule: '0 17 * * *', // Her gün UTC 17:00 = Türkiye saatiyle 20:00
}
