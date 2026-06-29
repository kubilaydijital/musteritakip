// Netlify Function: Bir şube ve tarih için boş randevu saatlerini (30 dakikalık slotlar)
// hesaplar. Şubenin working_hours'ına bakar, o güne ait mevcut randevularla (leads.appointment_at)
// çakışan slotları çıkarır, kalan boş slotları döndürür.
//
// Supabase'e REST API üzerinden bağlanılıyor (diğer Function'larla aynı yaklaşım, npm paketi gerekmez).

const SUPABASE_URL = 'https://rngahpybhgdqabbkldrr.supabase.co'
const SUPABASE_KEY = 'sb_publishable_IzGAUw3EEdYfsPVT4VZOtA_PH3cVJmy'

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const SLOT_MINUTES = 30

function timeStrToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTimeStr(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0')
  const m = (mins % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { branch_id, date } = event.queryStringParameters || {}
  if (!branch_id || !date) {
    return { statusCode: 400, body: JSON.stringify({ error: 'branch_id ve date parametreleri gerekli' }) }
  }

  // date formatı: YYYY-MM-DD bekleniyor
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Geçersiz tarih formatı, YYYY-MM-DD bekleniyor' }) }
  }

  try {
    // 1) Şubenin çalışma saatlerini al
    const branchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/branches?id=eq.${encodeURIComponent(branch_id)}&select=id,name,working_hours,active`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    const branches = await branchRes.json()
    if (!Array.isArray(branches) || branches.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Şube bulunamadı' }) }
    }
    const branch = branches[0]
    if (branch.active === false) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Şube aktif değil' }) }
    }
    if (!branch.working_hours) {
      return { statusCode: 200, body: JSON.stringify({ slots: [], reason: 'Bu şube için çalışma saatleri henüz ayarlanmamış' }) }
    }

    // 2) O günün haftanın hangi günü olduğunu bul, çalışma saatini al
    const dateObj = new Date(date + 'T00:00:00')
    const dayKey = WEEKDAY_KEYS[dateObj.getDay()]
    const dayHours = branch.working_hours[dayKey]

    if (!dayHours || !dayHours.open || !dayHours.close) {
      return { statusCode: 200, body: JSON.stringify({ slots: [], reason: 'Bu gün kapalı' }) }
    }

    // 3) O güne ait mevcut randevuları çek (appointment_at dolu olan leads)
    const dayStart = `${date}T00:00:00`
    const dayEnd = `${date}T23:59:59`
    const leadsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?branch_id=eq.${encodeURIComponent(branch_id)}&appointment_at=gte.${dayStart}&appointment_at=lte.${dayEnd}&select=appointment_at`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    const existingLeads = await leadsRes.json()
    const bookedTimes = new Set(
      (Array.isArray(existingLeads) ? existingLeads : [])
        .filter(l => l.appointment_at)
        .map(l => {
          const d = new Date(l.appointment_at)
          return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
        })
    )

    // 4) Çalışma saatlerini 30 dakikalık slotlara böl, dolu olanları çıkar
    const openMin = timeStrToMinutes(dayHours.open)
    const closeMin = timeStrToMinutes(dayHours.close)
    const slots = []
    for (let m = openMin; m < closeMin; m += SLOT_MINUTES) {
      const timeStr = minutesToTimeStr(m)
      if (!bookedTimes.has(timeStr)) {
        slots.push(timeStr)
      }
    }

    // 5) Geçmiş tarih/saat kontrolü: bugünse, şu andan önceki saatleri çıkar.
    // Türkiye saati UTC+3 (DST kullanmıyor, sabit) - sunucu UTC ile çalıştığı için
    // bunu açıkça hesaplıyoruz, yoksa "bugün" ve "şu an" karşılaştırması yanlış çıkar.
    const nowUtc = new Date()
    const nowTurkey = new Date(nowUtc.getTime() + 3 * 60 * 60 * 1000)
    const todayTurkeyStr = nowTurkey.toISOString().slice(0, 10)
    const isToday = date === todayTurkeyStr
    const nowMinutesTurkey = nowTurkey.getUTCHours() * 60 + nowTurkey.getUTCMinutes()
    const filteredSlots = isToday
      ? slots.filter(s => timeStrToMinutes(s) > nowMinutesTurkey)
      : slots

    return { statusCode: 200, body: JSON.stringify({ slots: filteredSlots, branch_name: branch.name }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
