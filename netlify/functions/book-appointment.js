// Netlify Function: Müşterinin herkese açık randevu sayfasından gönderdiği bilgiyi alır,
// seçilen saatin hâlâ boş olduğunu TEKRAR kontrol eder (iki kişi aynı anda aynı saati
// seçmeye çalışırsa ikincisi reddedilir), ve leads tablosuna otomatik bir kayıt oluşturur.
//
// Çakışma koruması: Bu kontrol burada (sunucu tarafında, kayıt anında) tekrar yapılıyor,
// çünkü müşterinin tarayıcısındaki "boş slot" listesi birkaç saniye/dakika eskimiş olabilir.

const SUPABASE_URL = 'https://rngahpybhgdqabbkldrr.supabase.co'
const SUPABASE_KEY = 'sb_publishable_IzGAUw3EEdYfsPVT4VZOtA_PH3cVJmy'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }

const PHONE_RE = /^\+905\d{9}$/

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

  const { branch_id, name, phone, service, date, time } = payload

  if (!branch_id || !name || !phone || !date || !time) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Eksik bilgi: isim, telefon, tarih ve saat gerekli' }) }
  }
  if (!PHONE_RE.test(phone.trim())) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Geçerli bir telefon numarası girin (örn. +905551234567)' }) }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Geçersiz tarih/saat formatı' }) }
  }

  try {
    // 1) Şube var ve aktif mi kontrol et
    const branchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/branches?id=eq.${encodeURIComponent(branch_id)}&select=id,name,active`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    const branches = await branchRes.json()
    if (!Array.isArray(branches) || branches.length === 0 || branches[0].active === false) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Şube bulunamadı' }) }
    }

    // 2) Seçilen saatin appointment_at değerini hesapla (Türkiye saati -> UTC).
    // Panel de aynı mantıkla kaydediyor: new Date('YYYY-MM-DDTHH:mm').toISOString()
    // tarayıcı Türkiye saat diliminde çalıştığında otomatik UTC'ye çevirir. Sunucu
    // tarafında bunu manuel yapıyoruz: Türkiye saati - 3 saat = UTC.
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)
    const appointmentUtc = new Date(Date.UTC(year, month - 1, day, hour - 3, minute, 0))
    const appointmentIso = appointmentUtc.toISOString()

    // 3) ÇAKIŞMA KONTROLÜ: bu saat hâlâ boş mu? (race condition koruması)
    // appointment_at tam olarak bu zamana eşit bir kayıt var mı diye bakıyoruz.
    const conflictRes = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?branch_id=eq.${encodeURIComponent(branch_id)}&appointment_at=eq.${appointmentIso}&select=id`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    const conflicts = await conflictRes.json()
    if (Array.isArray(conflicts) && conflicts.length > 0) {
      return { statusCode: 409, body: JSON.stringify({ error: 'Bu saat az önce başka biri tarafından alındı. Lütfen başka bir saat seçin.' }) }
    }

    // 4) Kaydı oluştur
    const leadId = uid()
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        id: leadId, branch_id, name: name.trim(), phone: phone.trim(),
        channel: 'Online Randevu', service: service || null,
        result: 'Randevu aldı', appointment_at: appointmentIso,
        entered_by: 'Online Randevu Sistemi', date: new Date().toISOString(),
        last_note_at: new Date().toISOString(),
      }),
    })

    if (!insertRes.ok) {
      const errText = await insertRes.text()
      return { statusCode: 502, body: JSON.stringify({ error: 'Randevu kaydedilemedi', detail: errText }) }
    }

    // 5) İlk not kaydı (lead_notes) - panelin not geçmişi sisteminde görünmesi için
    await fetch(`${SUPABASE_URL}/rest/v1/lead_notes`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        id: uid(), lead_id: leadId, note: 'Müşteri online randevu sayfasından kendisi randevu oluşturdu.',
        created_by: 'Online Randevu Sistemi', result_at_time: 'Randevu aldı',
      }),
    })

    return { statusCode: 200, body: JSON.stringify({ ok: true, branch_name: branches[0].name }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
