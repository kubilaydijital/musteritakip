import { useState } from 'react'
import { T } from './theme'

const ERROR_TEXT = {
  TOKEN_EXPIRED: 'Bağlantıyı yenileyin.', ACCOUNT_SETTINGS: 'Meta hesabının para birimi TRY ve saat dilimi Europe/Istanbul olmalı.',
  DATABASE_FAILED: 'Veri kaydı doğrulanamadı; SQL kurulumu ve bağlantıyı kontrol edin.',
  INVALID_DATA: 'Eksik Meta yanıtı kaydedilmedi.', SYNC_CONFLICT: 'Hesap/çekim değişti; tekrar deneyin.',
  META_FAILED: 'Meta isteği başarısız; erişim izinlerini kontrol edin.', NOT_CONNECTED: 'Reklam hesabını bağlayın.',
}
function time(value) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }) : 'Henüz yok'
}
export function MetaDataHealth({ report, onReview, expanded = false }) {
  const [open, setOpen] = useState(expanded)
  const warn = report.needsAttention
  return <section aria-label="Meta veri sağlığı" style={{ background: warn ? '#FFF8EA' : '#F0F8F5', border: `1px solid ${warn ? '#EAD3A5' : '#BDDDCF'}`, borderRadius: 12, padding: '12px 15px', marginBottom: 16, color: T.text, overflowWrap: 'anywhere' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 260px' }}>
        <strong style={{ fontSize: 13.5 }}>{!report.ready ? 'Meta verisi eksik / doğrulanmadı' : warn ? 'Dönem verisi doğrulandı · bağlantıyı kontrol edin' : report.provisional ? 'Meta verisi güncel · bugün geçici' : 'Meta dönem verisi doğrulandı'}</strong>
        <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.6, color: T.textSoft }}>
          {report.error || (!report.ready
            ? 'Eksik veri sıfır sonuç değildir. Meta mesajı, ROAS ve mesaj–kayıt karşılaştırması doğrulama tamamlanana kadar gösterilmez; satış ve ciro kayıtlarınız etkilenmez.'
            : report.provisional ? 'Bugünkü Meta sonuçları son çekim anına kadardır; mesaj, harcama ve ROAS gün içinde değişebilir.' : 'Seçili aralıktaki tüm günler kontrol edildi. Sıfır sonuçlu günler de kapsamda.')}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} style={{ border: `1px solid ${T.border}`, borderRadius: 8, background: '#fff', padding: '7px 10px', color: T.text, fontSize: 12, cursor: 'pointer' }}>{open ? 'Detayları kapat' : 'Veri detayları'}</button>
        {onReview && <button type="button" onClick={onReview} style={{ border: 'none', borderRadius: 8, background: T.primary, color: '#fff', padding: '7px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Reklam Kaynakları</button>}
      </div>
    </div>
    {open && <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
      {report.details.length === 0 && <p style={{ fontSize: 12, margin: 0 }}>Şube kapsamı bulunamadı.</p>}
      {report.details.map(d => <div key={d.id} style={{ padding: '10px 12px', borderRadius: 9, background: 'rgba(255,255,255,.8)', fontSize: 12, lineHeight: 1.7 }}>
        <strong>{d.name}</strong> · {d.connected ? `${report.since} – ${report.until}: ${report.days - d.missing.length}/${report.days} gün doğrulandı` : 'Meta reklam hesabı seçilmedi'}
        <div>Son başarılı çekim: {time(d.status?.last_success_at)}{d.status?.last_success_since && ` · ${d.status.last_success_since} – ${d.status.last_success_until}`}</div>
        {d.missing.length > 0 && <div>Eksik/doğrulanmamış: {d.missing.length} gün. İlk eksik gün: {d.missing[0]}. Bu aralığı yeniden çekin.</div>}
        {d.stale && <div>Son çekim güncel değil; seçili dönemi yeniden çekin.</div>}
        {(d.expired || d.expiring) && <div>{d.expired ? 'Bağlantı süresi doldu.' : 'Bağlantı 7 gün içinde sona erecek.'} Reklam Kaynakları’ndan yenileyin.</div>}
        {d.status?.last_result === 'running' && <div>Son deneme: {time(d.status.last_attempt_at)} · Başarı henüz doğrulanmadı. İşlem bitmediyse yeniden çekin.</div>}
        {d.status?.last_result === 'error' && <div>Son deneme başarısız: {time(d.status.last_attempt_at)} · {ERROR_TEXT[d.status.error_code] || 'Çekimi tekrar deneyin.'} Önceki başarı zamanı değiştirilmedi.</div>}
      </div>)}
    </div>}
  </section>
}
