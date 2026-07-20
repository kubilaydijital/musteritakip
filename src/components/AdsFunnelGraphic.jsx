// Hero bölümünde gösterilen, reklamdan satışa kadar olan zinciri gösteren akış grafiği.
// Bu rakamlar Kubilay Dijital'in Meta Ads danışmanlığı verdiği gerçek bir işletmeye aittir
// (gizlilik nedeniyle işletme adı paylaşılmamıştır). Panelin ürettiği bir veri değildir.
const STEPS = [
  { label: 'Meta Mesajı', value: '482', sub: 'Reklamdan gelen talep' },
  { label: 'Sisteme Kayıt', value: '361', sub: 'Personel girişi' },
  { label: 'Randevu', value: '214', sub: 'Oluşturulan randevu' },
  { label: 'Satış', value: '97', sub: 'Tamamlanan satış' },
]

export default function AdsFunnelGraphic() {
  return (
    <div className="funnel-card">
      <div className="funnel-steps">
        {STEPS.map((step, i) => (
          <div className="funnel-step" key={step.label}>
            <div className="funnel-step-box">
              <span className="funnel-step-value">{step.value}</span>
              <span className="funnel-step-label">{step.label}</span>
              <span className="funnel-step-sub">{step.sub}</span>
            </div>
            {i < STEPS.length - 1 && <span className="funnel-arrow">↓</span>}
          </div>
        ))}
      </div>
      <div className="funnel-total">
        <span>Toplam Ciro</span>
        <b>₺1.284.000</b>
      </div>
      <p className="funnel-caption">Gerçek müşteri verisi · Kubilay Dijital reklam danışmanlığı kapsamında, gizlilik nedeniyle işletme adı paylaşılmamıştır.</p>
    </div>
  )
}
