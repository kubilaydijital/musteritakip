import { bookingAppointmentIso, isValidBookingDate, isValidBookingTime, turkeyDateString } from './booking.js'
import { followUpNoteError } from './followUps.js'
import { followUpPerformancePeriod } from './followUpPerformance.js'

export function parseFollowUpAmount(value) {
  const text = String(value ?? '').trim()
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) return null
  const amount = Number(text.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(amount) && amount > 0 && amount <= 999999999.99 ? amount : null
}

export function followUpConversionError({ action, lead, date, time, saleDate, amount, note, sourceId, events = [], replaceAppointment }, now = new Date()) {
  if (!['appointment', 'sale'].includes(action)) return 'Geçersiz sonuç işlemi.'
  if (lead?.result === 'Müşteri oldu') return 'Bu kayıtta zaten satış var. Mevcut satışı düzeltmek için Danışan detayı bölümünü kullanın.'
  if (lead?.followup?.closed_at) return 'Bu takip kapalı. Önce açıklamayla yeniden açın.'
  const noteError = followUpNoteError(note)
  if (noteError) return noteError
  const source = sourceId ? events.find(event => String(event.id) === String(sourceId) && event.action === 'contact' && event.lead_id === lead.id && event.branch_id === lead.branch_id) : null
  if (sourceId && (!source || !Number.isFinite(new Date(source.created_at).getTime()) || new Date(source.created_at) > now)) return 'Bağlı takip görüşmesi bulunamadı. Paneli yenileyip yeniden seçin.'
  if (action === 'appointment') {
    if (!isValidBookingDate(date) || !isValidBookingTime(time)) return 'Randevu tarihi ve saati zorunludur.'
    const at = bookingAppointmentIso(date, time)
    if (new Date(at) <= now) return 'Yeni randevu zamanı gelecekte olmalı.'
    if (lead.appointment_at && new Date(lead.appointment_at).getTime() === new Date(at).getTime()) return 'Bu randevu zaten kayıtlı. Aynı tarih ve saat tekrar eklenemez.'
    if (new Date(lead.appointment_at) > now && !replaceAppointment) return 'Danışanın gelecekte bir randevusu var. Değiştirmek istiyorsanız aşağıdaki onayı işaretleyin.'
  } else {
    if (parseFollowUpAmount(amount) === null) return 'Pozitif satış tutarı girin. Örnek: 15.000 veya 15.000,50. En fazla 999.999.999,99 TL girilebilir.'
    if (!isValidBookingDate(saleDate) || saleDate > turkeyDateString(now)) return 'Satışın gerçekleştiği günü seçin; gelecekte olamaz.'
    const sourceDay = source ? turkeyDateString(new Date(source.created_at)) : turkeyDateString(now)
    if (saleDate < sourceDay) return 'Satış günü bağlı takip görüşmesinden önce olamaz. Geçmiş satış için o gün veya öncesindeki gerçek takip görüşmesini seçin.'
  }
  return ''
}

export function followUpConversionWriteError(error) {
  const text = `${error?.message || ''} ${error?.details || ''}`
  if (error?.code === 'PGRST202' || /complete_lead_followup|source_contact_id|appointment_at.*schema cache/.test(text)) return 'Güncelleme 5 kurulumu eksik. Yönetici önce follow_up_conversions.sql dosyasının tamamını Supabase’de çalıştırmalı. Hiçbir kayıt değiştirilmedi.'
  const messages = {
    FOLLOWUP_FORBIDDEN: 'Bu danışanın randevu/satış kaydını değiştirme yetkiniz yok. Yetkili şube yöneticisine başvurun.',
    FOLLOWUP_CONFLICT: 'Danışan veya takip başka bir kullanıcı tarafından değiştirildi. Yazdıklarınız formda duruyor; yenilemeden önce açıklamanızı kopyalayın, ardından paneli yenileyip son durumu kontrol edin.',
    FOLLOWUP_CLOSED: 'Takip kapalı. Önce açıklamayla yeniden açın.',
    FOLLOWUP_ALREADY_SOLD: 'Bu danışanda zaten satış kaydı var. İkinci kez sayılmaz; düzeltme için Danışan detayı bölümünü kullanın.',
    FOLLOWUP_NOTE_INVALID: 'Yapılan görüşmeyi/sonucu en az 2 farklı kelime ve 10 harf/rakamla açıklayın. Nokta ve tekrar kabul edilmez.',
    FOLLOWUP_SOURCE_INVALID: 'Bağlı takip görüşmesi geçersiz. Bu danışana ait gerçek bir takip görüşmesi seçin.',
    FOLLOWUP_SALE_DATE_INVALID: 'Satış günü gelecekte veya bağlı takip görüşmesinden önce olamaz.',
    FOLLOWUP_AMOUNT_INVALID: 'Satış tutarı pozitif olmalı ve en fazla iki ondalık içermeli.',
    FOLLOWUP_TIME_INVALID: 'Randevu zamanı gelecekte olmalı. Tarih ve saati kontrol edin.',
    FOLLOWUP_APPOINTMENT_EXISTS: 'Gelecekteki mevcut randevuyu değiştirmek için açık onay gerekiyor.',
    FOLLOWUP_APPOINTMENT_DUPLICATE: 'Aynı randevu zaten kayıtlı; tekrar sayılmaz.',
    BOOKING_SLOT_TAKEN: 'Şubede bu saat aralığında başka bir randevu var. En az 30 dakika boş olan başka bir saat seçin.',
    FOLLOWUP_INVALID: 'Geçersiz işlem. Gerekli alanları kontrol edin.',
  }
  return Object.entries(messages).find(([code]) => text.includes(code))?.[1] || 'Sonuç kaydedilemedi. Yazdıklarınız korunuyor; bağlantınızı kontrol edip tekrar deneyin.'
}

// Yakın tarihten, eski notlardan veya personel adından başarı tahmin edilmez.
// Yalnızca kontrollü RPC'nin açıkça ilişkilendirdiği sonuç olayları sayılır.
export function buildFollowUpConversions({ leads = [], events = [], branchIds = [], period = 'month', now = new Date() }) {
  const scope = new Set(branchIds)
  const byLead = new Map(leads.filter(lead => scope.has(lead.branch_id) && !lead.followupUnavailable).map(lead => [lead.id, lead]))
  const byEvent = new Map(events.filter(event => event.id != null).map(event => [String(event.id), event]))
  const range = followUpPerformancePeriod(period, now)
  const appointments = new Set(), sales = new Set()
  let revenue = 0
  const seen = new Set()
  for (const event of events) {
    if (event.id == null || seen.has(String(event.id))) continue
    seen.add(String(event.id))
    const lead = byLead.get(event.lead_id), source = byEvent.get(String(event.source_contact_id))
    const created = new Date(event.created_at).getTime(), sourceAt = new Date(source?.created_at).getTime()
    if (!lead || !event.created_at || event.source_contact_id == null || event.branch_id !== lead.branch_id || !source || !source.created_at || source.action !== 'contact' ||
        source.lead_id !== lead.id || source.branch_id !== lead.branch_id ||
        !Number.isFinite(created) || !Number.isFinite(sourceAt) || sourceAt > created || created > now.getTime()) continue
    if (event.action === 'appointment' && Number.isFinite(new Date(event.appointment_at).getTime()) && new Date(event.appointment_at).getTime() > created && created >= range.start && created < range.end) appointments.add(lead.id)
    if (event.action === 'sale' && lead.result === 'Müşteri oldu' && lead.sold_at && event.sold_at &&
        new Date(lead.sold_at).getTime() === new Date(event.sold_at).getTime()) {
      const sold = new Date(lead.sold_at).getTime(), amount = Number(lead.sale_amount)
      if (!Number.isFinite(sold) || !Number.isFinite(amount) || amount <= 0 || sold < range.start || sold >= range.end || turkeyDateString(new Date(sold)) > turkeyDateString(now) ||
          turkeyDateString(new Date(sold)) < turkeyDateString(new Date(sourceAt)) || sales.has(lead.id)) continue
      sales.add(lead.id); revenue += amount
    }
  }
  return { range, appointments: appointments.size, sales: sales.size, revenue,
    appointmentLeadIds: [...appointments], saleLeadIds: [...sales] }
}
