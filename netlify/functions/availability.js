import { BOOKING_TIME_ZONE } from '../../src/lib/booking.js'
import { bookingFailure, bookingResponse, publicBookingState } from './_booking.js'

// Müşteriye yalnızca müsait saatler döner; özel danışan bilgileri sunucuda kalır.
export async function handler(event) {
  if (event.httpMethod !== 'GET') return bookingResponse(405, { error: 'Method not allowed' })
  try {
    const { branch_id, date } = event.queryStringParameters || {}
    const state = await publicBookingState(branch_id, date)
    return bookingResponse(200, {
      slots: state.slots, branch_name: state.branch.name,
      ...(state.reason ? { reason: state.reason } : {}),
      min_date: state.minDate, max_date: state.maxDate, time_zone: BOOKING_TIME_ZONE,
    })
  } catch (error) {
    return bookingFailure(error)
  }
}
