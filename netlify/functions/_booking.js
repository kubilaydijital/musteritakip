import { availableBookingSlots, bookingDateWindow, bookingDayBounds, bookingDayHours, isValidBookingDate } from '../../src/lib/booking.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rngahpybhgdqabbkldrr.supabase.co'

export class BookingError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

export function bookingResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, max-age=0' },
    body: JSON.stringify(body),
  }
}

export function bookingFailure(error) {
  return bookingResponse(error instanceof BookingError ? error.statusCode : 503, {
    error: error instanceof BookingError ? error.message : 'Randevu bilgisi şu anda kontrol edilemiyor. Lütfen tekrar deneyin.',
  })
}

export function validateBookingRequest(branchId, date, now = new Date()) {
  if (typeof branchId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(branchId)) {
    throw new BookingError(400, 'Geçerli bir şube seçin.')
  }
  if (!isValidBookingDate(date)) throw new BookingError(400, 'Geçerli bir tarih seçin.')
  const window = bookingDateWindow(now)
  if (date < window.minDate || date > window.maxDate) {
    throw new BookingError(400, 'Bugünden itibaren 14 gün içindeki bir tarih seçin.')
  }
  return window
}

export async function bookingDatabaseRequest(path, { method = 'GET', body, array = false } = {}) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new BookingError(503, 'Online randevu şu anda kullanılamıyor. Lütfen işletmeyle iletişime geçin.')

  // RLS nedeniyle anonim kullanıcı mevcut randevuları göremeyebilir. Anahtar yalnızca
  // sunucuda kullanılır; herkese açık yanıtta isim/telefon/not veya anahtar bulunmaz.
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = await response.json()
  if (!response.ok) {
    if (data?.message === 'BOOKING_SLOT_TAKEN') throw new BookingError(409, 'Bu saat az önce başka biri tarafından alındı. Lütfen başka bir saat seçin.')
    if (data?.message === 'BOOKING_BRANCH_INACTIVE') throw new BookingError(404, 'Şube bulunamadı veya aktif değil.')
    if (data?.message === 'BOOKING_TIME_INVALID') throw new BookingError(400, 'Bu saat artık uygun değil. Lütfen müsait saatlerden birini seçin.')
    throw new BookingError(503, 'Randevu bilgisi şu anda kontrol edilemiyor. Lütfen tekrar deneyin.')
  }
  if (array && !Array.isArray(data)) throw new BookingError(503, 'Randevu bilgisi şu anda kontrol edilemiyor. Lütfen tekrar deneyin.')
  return data
}

export async function publicBookingState(branchId, date, now = new Date()) {
  const window = validateBookingRequest(branchId, date, now)
  const branches = await bookingDatabaseRequest(
    `branches?id=eq.${encodeURIComponent(branchId)}&select=id,name,working_hours,active`, { array: true },
  )
  const branch = branches[0]
  if (!branch || branch.active === false) throw new BookingError(404, 'Şube bulunamadı veya aktif değil.')
  const base = { branch, ...window }
  if (!branch.working_hours) return { ...base, slots: [], reason: 'Bu şube için çalışma saatleri henüz ayarlanmamış.' }
  const hours = bookingDayHours(date, branch.working_hours)
  if (!hours) return { ...base, slots: [], reason: 'Bu gün kapalı veya çalışma saatleri tanımlanmamış.' }

  const bounds = bookingDayBounds(date)
  const appointments = await bookingDatabaseRequest(
    `leads?branch_id=eq.${encodeURIComponent(branchId)}&appointment_at=gte.${bounds.start}&appointment_at=lt.${bounds.end}&select=appointment_at`,
    { array: true },
  )
  // Bir okuma hatası veya bozuk yanıt asla "bütün saatler boş" diye yorumlanmaz.
  if (appointments.some(appointment => !appointment || typeof appointment.appointment_at !== 'string' || !Number.isFinite(new Date(appointment.appointment_at).getTime()))) {
    throw new BookingError(503, 'Randevu bilgisi şu anda kontrol edilemiyor. Lütfen tekrar deneyin.')
  }
  return { ...base, slots: availableBookingSlots({ date, hours, appointments, now }) }
}
