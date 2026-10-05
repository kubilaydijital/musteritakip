import { isValidBookingDate, turkeyDateString } from './booking.js'

export const CUSTOMER_RESULT = 'Müşteri oldu'

export const MAX_SALE_AMOUNT = 999999999.99

// Veritabanındaki tutar ham sayı/ondalık metindir; formdaki Türkçe tutar ise
// ayrı ayrıştırılır. Boşluk, sıfır, NaN ve kesirli kuruş geçerli satış değildir.
export function isValidSaleAmount(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return false
  if (typeof value === 'string' && !/^\d+(?:\.\d{1,2}0*)?$/.test(value.trim())) return false
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_SALE_AMOUNT) return false
  const cents = amount * 100
  return Math.abs(cents - Math.round(cents)) <= Number.EPSILON * Math.max(1, Math.abs(cents)) * 2
}

export function parseSaleAmountInput(value) {
  const text = String(value ?? '').trim()
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) return null
  const amount = Number(text.replace(/\./g, '').replace(',', '.'))
  return isValidSaleAmount(amount) ? amount : null
}

export function saleAmountError(result, value) {
  if (result !== CUSTOMER_RESULT || isValidSaleAmount(value)) return ''
  return 'Müşteri oldu kaydı tamamlanamadı. Sıfırdan büyük satış tutarı girin; en fazla iki kuruş hanesi kullanın. Örnek: 15.000 veya 15.000,50 TL. En fazla 999.999.999,99 TL kabul edilir.'
}

export function hasMissingSaleAmount(lead) {
  return lead?.result === CUSTOMER_RESULT && !isValidSaleAmount(lead.sale_amount)
}

function validTimestamp(value) {
  return value != null && value !== '' && Number.isFinite(new Date(value).getTime())
}

export function turkeyDayStart(day) {
  return new Date(`${day}T00:00:00+03:00`)
}

export function reportingDayKey(value) {
  if (!validTimestamp(value)) return null
  return turkeyDateString(new Date(value))
}

export function isInReportPeriod(value, start, endExclusive) {
  if (!validTimestamp(value)) return false
  const time = new Date(value).getTime()
  return time >= start.getTime() && time < endExclusive.getTime()
}

// Eski satışların gerçek tarihini tahmin etmiyoruz. Tarihi henüz doğrulanmamış
// kayıtlar, önceki raporlardaki kayıt tarihiyle ve açık bir uyarıyla hesaplanır.
export function effectiveSaleAt(lead) {
  if (lead.result !== CUSTOMER_RESULT) return null
  if (validTimestamp(lead.sold_at)) return lead.sold_at
  return validTimestamp(lead.date) ? lead.date : null
}

export function salesInPeriod(leads, start, endExclusive) {
  return leads.filter(lead => isInReportPeriod(effectiveSaleAt(lead), start, endExclusive))
}

export function summarizeSales(sales) {
  const withAmount = sales.filter(lead => Number.isFinite(Number(lead.sale_amount)) && Number(lead.sale_amount) > 0)
  const revenue = withAmount.reduce((sum, lead) => sum + Number(lead.sale_amount), 0)
  const metaSales = sales.filter(lead => ['Instagram', 'WhatsApp'].includes(lead.channel))
  const metaRevenue = withAmount.filter(lead => ['Instagram', 'WhatsApp'].includes(lead.channel))
    .reduce((sum, lead) => sum + Number(lead.sale_amount), 0)
  return {
    count: sales.length, revenue, withAmountCount: withAmount.length,
    avgTicket: withAmount.length ? Math.round(revenue / withAmount.length) : 0,
    metaSalesCount: metaSales.length, metaRevenue,
    legacyCount: sales.filter(lead => !validTimestamp(lead.sold_at)).length,
  }
}

export function saleDateError(result, day, editing = null, now = new Date()) {
  if (result !== CUSTOMER_RESULT) return ''
  // Mevcut, tarihsiz bir satışa yalnızca not eklemek tarihi uydurmamalı.
  const isLegacySale = editing?.result === CUSTOMER_RESULT && !validTimestamp(editing.sold_at)
  if (!day && isLegacySale) return ''
  if (!isValidBookingDate(day)) return 'Satışın gerçekleştiği tarihi seçin.'
  if (day > turkeyDateString(now)) return 'Satış tarihi gelecekte olamaz. Satışın gerçekleştiği günü seçin.'
  return ''
}

export function savedSaleAt(result, day, editing = null) {
  if (result !== CUSTOMER_RESULT || !day) return null
  // Not veya randevu düzenlemesinde mevcut satış saatini de koru.
  if (editing?.result === CUSTOMER_RESULT && reportingDayKey(editing.sold_at) === day) return editing.sold_at
  // Form bir iş günü toplar, satışın kesin saatini iddia etmez. Türkiye öğleni.
  return new Date(`${day}T12:00:00+03:00`).toISOString()
}

export function leadWriteError(error) {
  const details = `${error?.message || ''} ${error?.details || ''}`
  if (error?.code === '23514' && details.includes('leads_customer_requires_sale_amount')) {
    return saleAmountError(CUSTOMER_RESULT, null)
  }
  if (details.includes('sold_at') && ['42703', 'PGRST204'].includes(error?.code)) {
    return 'Satış tarihi güncellemesi veritabanında henüz kurulmamış. Yönetici önce satış tarihi SQL dosyasını çalıştırmalı. Kayıt kaydedilmedi.'
  }
  if (details.includes('SALE_DATE_INVALID')) return 'Satış tarihi geçersiz. Bugün veya geçmişteki gerçek satış gününü seçin.'
  return 'Kayıt kaydedilemedi. Bağlantınızı ve kayıt düzenleme yetkinizi kontrol edip tekrar deneyin.'
}

// Bu karşılaştırma müşteri/mesaj eşleştirmesi DEĞİLDİR. Organik dahil tüm panel
// kayıtları sayılır; Meta dışı reklam verileri bu Meta karşılaştırmasına girmez.
export function buildMessageComparison(adsData, leads) {
  const messagesByDay = new Map()
  const recordsByDay = new Map()
  adsData.filter(ad => ad.channel === 'Meta (Otomatik)').forEach(ad => {
    const day = reportingDayKey(ad.date)
    if (!day) return
    const current = messagesByDay.get(day) || { messages: 0, manualAdjustment: 0 }
    current.messages += Number(ad.messages) || 0
    current.manualAdjustment += Number(ad.manual_adjustment) || 0
    messagesByDay.set(day, current)
  })
  leads.forEach(lead => {
    const day = reportingDayKey(lead.date)
    if (day) recordsByDay.set(day, (recordsByDay.get(day) || 0) + 1)
  })
  const days = new Set([...messagesByDay.keys(), ...recordsByDay.keys()])
  const rows = [...days].map(day => {
    const meta = messagesByDay.get(day) || { messages: 0, manualAdjustment: 0 }
    const records = recordsByDay.get(day) || 0
    const adjustedRecords = Math.max(0, records + meta.manualAdjustment)
    return { day, ...meta, records, adjustedRecords, gap: Math.max(0, meta.messages - adjustedRecords) }
  }).sort((a, b) => b.day.localeCompare(a.day))
  const messages = rows.reduce((sum, row) => sum + row.messages, 0)
  const records = rows.reduce((sum, row) => sum + row.records, 0)
  const adjustedRecords = rows.reduce((sum, row) => sum + row.adjustedRecords, 0)
  const gap = rows.reduce((sum, row) => sum + row.gap, 0)
  return {
    rows, messages, records, adjustedRecords, gap,
    ratio: messages > 0 ? Math.round((adjustedRecords / messages) * 100) : null,
    hasMetaData: messagesByDay.size > 0,
    issues: rows.filter(row => row.gap > 0),
  }
}
