import { bookingAppointmentIso, isValidBookingDate, isValidBookingTime, turkeyDateString } from './booking.js'

export const FOLLOW_UP_OUTCOMES = ['Ulaşıldı', 'Cevap alınamadı', 'Karar bekleniyor', 'Yeni randevu planlanacak']
export const FOLLOW_UP_CLOSE_REASONS = ['Müşteri takip istemiyor', 'İletişim bilgisi hatalı', 'Tekrarlanan kayıt', 'Satış gerçekleşti', 'Diğer']

// Aynı kural yeni notlarda kullanılır; eski notlar yeniden doğrulanmaz.
export function followUpNoteError(value) {
  const words = String(value || '').trim().toLocaleLowerCase('tr-TR').match(/[\p{L}\p{N}]+/gu) || []
  const compact = words.join('')
  if (words.length < 2 || compact.length < 10) return 'En az 2 kelime ve 10 harf/rakamla yapılan işlemi açıklayın. Örnek: Müşteri arandı, yarın dönüş yapacak.'
  if (new Set([...compact]).size < 3 || new Set(words).size === 1) return 'Tekrarlanan veya anlamsız içerik kabul edilmez. Ne yaptığınızı ve sonucu kendi cümlelerinizle yazın.'
  if (String(value).length > 4000) return 'Açıklama en fazla 4.000 karakter olabilir.'
  return ''
}

export function followUpDateParts(value) {
  const date = new Date(value)
  if (!value || !Number.isFinite(date.getTime())) return { date: '', time: '' }
  const local = new Date(date.getTime() + 3 * 3600000).toISOString()
  return { date: local.slice(0, 10), time: local.slice(11, 16) }
}

export function followUpInputError({ action, date, time, outcome, reason, note, leadResult }, now = new Date()) {
  if (!['plan', 'contact', 'close', 'reopen'].includes(action)) return 'Geçersiz takip işlemi.'
  if (action !== 'close') {
    if (!isValidBookingDate(date) || !isValidBookingTime(time)) return 'Sonraki takip için tarih ve saat seçin.'
    if (new Date(bookingAppointmentIso(date, time)) <= now) return 'Takip zamanı gelecekte olmalı. Bugün için daha ileri bir saat veya başka bir gün seçin.'
  }
  if (action === 'contact' && !FOLLOW_UP_OUTCOMES.includes(outcome)) return 'Yapılan görüşmenin sonucunu seçin.'
  if (action === 'close' && !FOLLOW_UP_CLOSE_REASONS.includes(reason)) return 'Takibi neden kapattığınızı seçin.'
  if (action === 'close' && reason === 'Satış gerçekleşti' && leadResult !== 'Müşteri oldu') return 'Önce danışan kaydını “Müşteri oldu” olarak güncelleyin ve satış tutarını kaydedin.'
  if (['contact', 'close', 'reopen'].includes(action)) return followUpNoteError(note)
  return ''
}

export function followUpState(lead, legacyReminder = null, now = new Date()) {
  if (lead.followupUnavailable) return null
  const followUp = lead.followup
  if (followUp?.closed_at) return { bucket: 'closed', level: 'closed', days: 0, dueDays: 0 }
  if (followUp?.next_followup_at) {
    const target = new Date(followUp.next_followup_at)
    if (Number.isFinite(target.getTime())) {
      const day = turkeyDateString(target)
      const today = turkeyDateString(now)
      const overdueDays = Math.round((new Date(`${today}T00:00:00Z`) - new Date(`${day}T00:00:00Z`)) / 86400000)
      return {
        bucket: day < today ? 'overdue' : day === today ? 'today' : 'planned',
        level: overdueDays >= 3 ? 'critical' : 'warning',
        days: Math.max(0, overdueDays), dueDays: Math.max(0, overdueDays),
        scheduled: true, at: followUp.next_followup_at,
      }
    }
  }
  if (legacyReminder && legacyReminder.level !== 'cold') return { ...legacyReminder, bucket: legacyReminder.dueDays > 0 ? 'overdue' : 'today', scheduled: false }
  return null
}

export function activeFollowUpReminder(lead, legacyReminder, now = new Date()) {
  if (lead.followupUnavailable) return null
  const state = followUpState(lead, legacyReminder, now)
  if (state?.bucket === 'closed' || state?.bucket === 'planned') return null
  return state || legacyReminder
}

export function canManageFollowUp(lead, currentUser, canEditAny, users = []) {
  if (canEditAny) return true
  if (lead.followup?.owner_id === currentUser.id) return true
  const myName = currentUser.full_name || currentUser.email
  const ambiguousName = users.some(user => user.id !== currentUser.id && user.branch_id === lead.branch_id && (user.full_name || user.email) === myName)
  return !ambiguousName && lead.entered_by === myName
}

export function followUpWriteError(error) {
  const message = String(error?.message || '')
  if (error?.code === 'PGRST202' || error?.code === '42P01' || /schema cache|lead_followups|manage_lead_followup/.test(message)) return 'Takip Merkezi kurulumu eksik. Önce Güncelleme 3 SQL dosyasının tamamını Supabase’de çalıştırın, sonra paneli yenileyin.'
  const messages = {
    FOLLOWUP_FORBIDDEN: 'Bu takip için yetkiniz yok veya oturumunuz sona ermiş. Yetkili şube yöneticisine başvurun.',
    FOLLOWUP_CONFLICT: 'Bu takip başka bir kullanıcı tarafından değiştirildi. Paneli yenileyip son durumu kontrol edin; yazdığınız metin bu formda korunuyor.',
    FOLLOWUP_TIME_INVALID: 'Takip zamanı gelecekte olmalı. Tarih ve saati kontrol edin.',
    FOLLOWUP_NOTE_INVALID: 'Açıklama en az 2 farklı kelime ve 10 harf/rakam içermeli; yalnızca nokta veya tekrar kabul edilmez.',
    FOLLOWUP_OWNER_INVALID: 'Sorumlu kişi aktif ve bu şubeye ait olmalı. Atama için şube yöneticisine başvurun.',
    FOLLOWUP_CLOSED: 'Bu takip kapalı. Yeni işlem için önce “Yeniden aç” seçeneğini kullanın.',
    FOLLOWUP_SALE_REQUIRED: 'Satış gerçekleşti demeden önce danışan kaydını “Müşteri oldu” olarak güncelleyin.',
    FOLLOWUP_INVALID: 'Takip işlemi geçersiz. Gerekli alanları kontrol edin.',
  }
  return Object.entries(messages).find(([code]) => message.includes(code))?.[1] || 'Takip kaydedilemedi. Yazdıklarınız korunuyor; bağlantınızı kontrol edip tekrar deneyin.'
}

// Supabase'in tek sorgu satır sınırı eski/kapalı takipleri sessizce düşürmesin.
export async function fetchFollowUpRows(client, table) {
  if (!['lead_followups', 'lead_followup_events'].includes(table)) throw new Error('Geçersiz takip tablosu')
  const rows = []
  try {
    for (let offset = 0; ;) {
      const result = await client.from(table).select('*', { count: 'exact' })
        .order(table === 'lead_followups' ? 'lead_id' : 'id', { ascending: true }).range(offset, offset + 499)
      if (result.error) return { data: null, error: result.error }
      if (!Array.isArray(result.data)) return { data: null, error: { message: 'Takip verisi okunamadı' } }
      rows.push(...result.data)
      if (Number.isInteger(result.count)) {
        if (rows.length >= result.count) return { data: rows, error: null }
        if (result.data.length === 0) return { data: null, error: { message: 'Takip verisi eksik okundu' } }
      } else if (result.data.length < 500) return { data: rows, error: null }
      offset += result.data.length
    }
  } catch (error) {
    return { data: null, error }
  }
}
