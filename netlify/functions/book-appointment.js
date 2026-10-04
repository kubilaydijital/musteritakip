import { bookingAppointmentIso, isValidBookingTime } from '../../src/lib/booking.js'
import { BookingError, bookingDatabaseRequest, bookingFailure, bookingResponse, publicBookingState } from './_booking.js'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }

export async function handler(event) {
  if (event.httpMethod !== 'POST') return bookingResponse(405, { error: 'Method not allowed' })
  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return bookingResponse(400, { error: 'Geçersiz istek gövdesi.' })
  }

  try {
    const { branch_id, name, phone, service, date, time } = payload || {}
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) throw new BookingError(400, 'Ad soyad girin (en fazla 120 karakter).')
    if (typeof phone !== 'string' || !/^\+905\d{9}$/.test(phone.trim())) throw new BookingError(400, 'Geçerli bir telefon numarası girin (örn. +905551234567).')
    if (service != null && (typeof service !== 'string' || service.trim().length > 180)) throw new BookingError(400, 'Geçerli bir hizmet bilgisi girin.')
    if (!isValidBookingTime(time)) throw new BookingError(400, 'Geçerli bir saat seçin.')

    const state = await publicBookingState(branch_id, date)
    if (!state.slots.includes(time)) throw new BookingError(409, 'Seçtiğiniz saat artık müsait değil. Lütfen başka bir saat seçin.')

    // Kontrol ve iki kayıt tek veritabanı işlemi içindedir. Aynı şube/gün için
    // eşzamanlı online talepler kilit altında tekrar kontrol edilir.
    // Gerekli fonksiyon: supabase/online_booking_atomic.sql (önce uygulanmalıdır).
    const result = await bookingDatabaseRequest('rpc/book_online_appointment', {
      method: 'POST',
      body: {
        p_lead_id: uid(), p_note_id: uid(), p_branch_id: branch_id,
        p_name: name.trim(), p_phone: phone.trim(), p_service: service?.trim() || null,
        p_appointment_at: bookingAppointmentIso(date, time),
      },
    })
    if (result?.ok !== true || typeof result.branch_name !== 'string') throw new BookingError(503, 'Randevu kaydı doğrulanamadı. Lütfen işletmeyle iletişime geçin.')
    return bookingResponse(200, { ok: true, branch_name: result.branch_name })
  } catch (error) {
    return bookingFailure(error)
  }
}
