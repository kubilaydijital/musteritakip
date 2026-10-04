export const BOOKING_TIME_ZONE = 'Europe/Istanbul'
export const BOOKING_ADVANCE_DAYS = 14
export const BOOKING_SLOT_MINUTES = 30

const DAY_MS = 24 * 60 * 60 * 1000
const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// Randevu tarihleri müşterinin cihazından değil, şubenin Türkiye saatinden alınır.
export function turkeyDateString(now = new Date()) {
  return new Date(now.getTime() + TURKEY_OFFSET_MS).toISOString().slice(0, 10)
}

export function isValidBookingDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function addBookingDays(value, days) {
  if (!isValidBookingDate(value) || !Number.isInteger(days)) throw new Error('Geçersiz tarih')
  return new Date(new Date(`${value}T00:00:00.000Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

export function bookingDateWindow(now = new Date()) {
  const minDate = turkeyDateString(now)
  return { minDate, maxDate: addBookingDays(minDate, BOOKING_ADVANCE_DAYS) }
}

export function isValidBookingTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function bookingAppointmentIso(date, time) {
  if (!isValidBookingDate(date) || !isValidBookingTime(time)) throw new Error('Geçersiz tarih/saat')
  return new Date(`${date}T${time}:00+03:00`).toISOString()
}

export function bookingDayBounds(date) {
  if (!isValidBookingDate(date)) throw new Error('Geçersiz tarih')
  const start = new Date(`${date}T00:00:00+03:00`)
  return { start: start.toISOString(), end: new Date(start.getTime() + DAY_MS).toISOString() }
}

export function bookingDayHours(date, workingHours) {
  if (!isValidBookingDate(date)) return null
  const dayKey = WEEKDAY_KEYS[new Date(`${date}T12:00:00.000Z`).getUTCDay()]
  const hours = workingHours?.[dayKey]
  if (!isValidBookingTime(hours?.open) || !isValidBookingTime(hours?.close)) return null
  return hours.open < hours.close ? hours : null
}

export function availableBookingSlots({ date, hours, appointments = [], now = new Date() }) {
  if (!isValidBookingDate(date) || !isValidBookingTime(hours?.open) || !isValidBookingTime(hours?.close)) return []
  const { minDate, maxDate } = bookingDateWindow(now)
  if (date < minDate || date > maxDate) return []

  const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
  const slotMs = BOOKING_SLOT_MINUTES * 60 * 1000
  const occupied = appointments.map(appointment => new Date(appointment.appointment_at).getTime())
  const slots = []
  for (let minute = minutes(hours.open); minute + BOOKING_SLOT_MINUTES <= minutes(hours.close); minute += BOOKING_SLOT_MINUTES) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
    const start = new Date(bookingAppointmentIso(date, time)).getTime()
    // Şimdilik mevcut 30 dakikalık model korunur; ara saatteki panel kaydı da çakışmayı engeller.
    if (start <= now.getTime() || occupied.some(booked => booked < start + slotMs && booked + slotMs > start)) continue
    slots.push(time)
  }
  return slots
}
