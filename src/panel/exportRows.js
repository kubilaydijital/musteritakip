import { effectiveSaleAt } from '../lib/salesReporting.js'

// Danışan kayıtlarını dışa aktarma formatına çevirir.
export function leadsToExportRows(leads, branchNameFn, showBranch) {
  return leads.map(l => ({
    'Ad Soyad': l.name,
    'Telefon': l.phone,
    ...(showBranch ? { 'Şube': branchNameFn(l.branch_id) } : {}),
    'Kanal': l.channel,
    'Hizmet': l.service || '',
    'Sonuç': l.result,
    'Tutar (TL)': l.sale_amount != null ? l.sale_amount : '',
    'Satış Tarihi': effectiveSaleAt(l) ? new Date(effectiveSaleAt(l)).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '',
    'Satış Tarihi Kaynağı': l.result === 'Müşteri oldu' ? (l.sold_at ? 'Satış tarihi' : 'Eski kayıt tarihi — doğrulanmamış') : '',
    'Randevu Tarihi': l.appointment_at ? new Date(l.appointment_at).toLocaleString('tr-TR') : '',
    'Not': l.note || '',
    'Kayıt Tarihi': l.date ? new Date(l.date).toLocaleDateString('tr-TR') : '',
  }))
}
