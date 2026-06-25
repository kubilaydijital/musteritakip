import { Link } from 'react-router-dom'
import { SiteHeader, SiteFooter } from './SiteLayout'
import { T, cardStyle, btnPrimary, btnSecondary, GLOBAL_CSS, PAGE_MAX } from './theme'

const FEATURES_PREVIEW = [
  { icon: '📅', title: 'Akıllı Randevu Yönetimi', desc: 'Çakışma yok, hatırlatma var. Zamanınızı verimli kullanın.' },
  { icon: '🔔', title: 'Otomatik Hatırlatmalar', desc: 'SMS, e-posta ve arama ile otomatik hatırlatma yapın.' },
  { icon: '👥', title: 'Müşteri Takibi', desc: 'Tüm müşteri bilgilerini tek yerde düzenli tutun.' },
  { icon: '🎯', title: 'Potansiyel Müşteri Uyarıları', desc: 'Kayıtlarda yer alan potansiyel müşteriler için uyarılar görün.' },
]

const FUNNEL_STAGES = [
  { label: 'Randevu Aldı\n(Geçti)', sub: '1g', icon: '📅' },
  { label: 'Randevuya Gelmedi', sub: '3g', icon: '👤' },
  { label: 'Cevap Yazdı\nDönüş Gelmedi', sub: '3g', icon: '💬' },
  { label: 'Satın Almadı', sub: '15g', icon: '🛒' },
  { label: 'Müşteri Oldu', sub: 'Takip Yok', icon: '✅' },
]

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, color: T.text, minHeight: '100vh' }}>
      <style>{GLOBAL_CSS}</style>
      <SiteHeader />

      {/* HERO */}
      <section style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '72px 20px 56px' }}>
        <div className="mt-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center' }}>
          <div>
            <p className="mt-fade-up" style={{ fontSize: 13, fontWeight: 700, color: T.primary, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 18px' }}>
              Randevu bazlı hizmet işletmeleri için
            </p>
            <h1 className="mt-fade-up" style={{ fontSize: 'clamp(32px, 4.4vw, 48px)', lineHeight: 1.12, fontWeight: 900, margin: '0 0 22px', letterSpacing: '-0.02em', animationDelay: '0.05s' }}>
              Kağıt defter devri bitti.<br />
              <span style={{ color: T.primary }}>Müşteriniz kaçmasın,</span><br />
              işiniz büyüsün.
            </h1>
            <p className="mt-fade-up" style={{ fontSize: 16.5, lineHeight: 1.65, color: T.textSoft, maxWidth: 480, margin: '0 0 32px', animationDelay: '0.1s' }}>
              Randevu alan, hatırlatma yapan, kaçan müşterinin peşinden giden tek sistem. Aradığınız her şeyi tek ekranda, tek yerde.
            </p>
            <div className="mt-fade-up" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, animationDelay: '0.15s' }}>
              <Link to="/deneme" className="mt-btn-primary" style={btnPrimary}>Ücretsiz 14 Gün Dene →</Link>
              <Link to="/demo" className="mt-btn-secondary" style={btnSecondary}>Demo Talep Et</Link>
            </div>
            <div className="mt-fade-up" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: T.textSoft, animationDelay: '0.2s' }}>
              <span>✓ 14 gün ücretsiz</span>
              <span>✓ Kredi kartı gerekmez</span>
              <span>✓ Kurulum gerektirmez</span>
            </div>
          </div>

          <div className="mt-fade-up" style={{ animationDelay: '0.1s' }}>
            <HeroPanelMock />
          </div>
        </div>
      </section>

      {/* ÖZELLİK ÖNİZLEME */}
      <section style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '32px 20px 64px' }}>
        <div className="mt-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          {FEATURES_PREVIEW.map(f => (
            <div key={f.title} style={{ ...cardStyle, padding: '22px 20px' }}>
              <span style={{ fontSize: 26, display: 'block', marginBottom: 12 }}>{f.icon}</span>
              <p style={{ fontSize: 14.5, fontWeight: 700, margin: '0 0 6px', color: T.text }}>{f.title}</p>
              <p style={{ fontSize: 13, color: T.textSoft, margin: 0, lineHeight: 1.55 }}>{f.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/ozellikler" style={{ fontSize: 14.5, fontWeight: 600, color: T.primary, textDecoration: 'none' }}>
            Tüm özellikleri gör →
          </Link>
        </div>
      </section>

      {/* NASIL ÇALIŞIR - HATIRLATMA SİSTEMİ */}
      <section style={{ background: T.card, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '64px 20px' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, margin: '0 0 14px', letterSpacing: '-0.01em' }}>
              Sistem sizi uyarır, siz de doğru kişiye ulaşırsınız
            </h2>
            <p style={{ fontSize: 15.5, color: T.textSoft, margin: 0, lineHeight: 1.6 }}>
              Müşterinizden gelen sonuca göre doğru zamanda hatırlatma yapar ve kaçan müşterinin peşinden gider. Unutmaz, unutturmaz, kazandırır.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 0, flexWrap: 'wrap', marginBottom: 36 }}>
            {FUNNEL_STAGES.map((stage, i) => (
              <div key={stage.label} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ ...cardStyle, padding: '18px 16px', width: 150, textAlign: 'center' }}>
                  <span style={{ fontSize: 22, display: 'block', marginBottom: 8 }}>{stage.icon}</span>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: T.textSoft, margin: '0 0 8px', whiteSpace: 'pre-line', lineHeight: 1.35 }}>{stage.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: T.primary, margin: 0 }}>{stage.sub}</p>
                </div>
                {i < FUNNEL_STAGES.length - 1 && (
                  <span style={{ color: T.textFaint, fontSize: 18, margin: '0 6px' }}>→</span>
                )}
              </div>
            ))}
          </div>

          <ReminderTable />
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '72px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, margin: '0 0 14px' }}>
          Hemen başlayın, işinizi kolaylaştırın!
        </h2>
        <p style={{ fontSize: 15.5, color: T.textSoft, maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.6 }}>
          14 gün ücretsiz deneyin, kredi kartı gerekmez. Sorularınız için doğrudan iletişime geçebilirsiniz.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/deneme" className="mt-btn-primary" style={btnPrimary}>Ücretsiz 14 Gün Dene →</Link>
          <Link to="/demo" className="mt-btn-secondary" style={btnSecondary}>Demo Talep Et</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

function ReminderTable() {
  const rows = [
    ['Randevu aldı (randevu geçti)', '1g', '+14g (~15g)', '+30g (~45g)', 'Soğuk'],
    ['Randevuya gelmedi', '3g', '+14g (~17g)', '+30g (~47g)', 'Soğuk'],
    ['Cevap yazdı, müşteriden dönüş gelmedi', '3g', '+14g (~17g)', '+30g (~47g)', 'Soğuk'],
    ['Satın almadı', '15g', '+30g (~45g)', '+60g (~105g)', 'Soğuk'],
    ['Müşteri oldu', 'takip yok', '—', '—', '—'],
  ]
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 640 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 1fr 1fr 0.8fr', gap: 8, padding: '10px 4px', borderBottom: `1px solid ${T.border}`, fontSize: 11.5, color: T.textFaint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Süre tabloları (gün)</span><span>1. hatırlatma</span><span>2. hatırlatma</span><span>3. hatırlatma</span><span>Sonrası</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 1fr 1fr 0.8fr', gap: 8, padding: '13px 4px', borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : 'none', fontSize: 13.5 }}>
            <span style={{ color: T.text, fontWeight: 600 }}>{r[0]}</span>
            <span style={{ color: T.textSoft }}>{r[1]}</span>
            <span style={{ color: T.textSoft }}>{r[2]}</span>
            <span style={{ color: T.textSoft }}>{r[3]}</span>
            <span style={{ color: r[4] === 'Soğuk' ? T.textFaint : T.textSoft, fontWeight: r[4] === 'Soğuk' ? 600 : 400 }}>{r[4]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeroPanelMock() {
  return (
    <div style={{ ...cardStyle, padding: 20, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: T.text }}>Genel Bakış</p>
        <span style={{ fontSize: 11, color: T.textFaint, background: T.cardSoft, padding: '3px 9px', borderRadius: 6 }}>Bu Ay</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Toplam mesaj', value: '24', color: T.primary },
          { label: 'Gelen müşteri', value: '18', color: T.green },
          { label: 'Satış', value: '7', color: T.orange },
          { label: 'Ciro', value: '12.450 TL', color: T.blue },
        ].map(s => (
          <div key={s.label} style={{ background: T.cardSoft, borderRadius: 10, padding: '10px 8px' }}>
            <p style={{ fontSize: 10.5, color: T.textFaint, margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
      <div style={{ background: T.cardSoft, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
        <p style={{ fontSize: 11.5, fontWeight: 700, color: T.textSoft, margin: '0 0 10px' }}>Hatırlatma Performansı</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          {[['1. hatırlatma', 14], ['2. hatırlatma', 30], ['3. hatırlatma', 60]].map(([label, val]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 2px', color: T.textFaint }}>{label}</p>
              <p style={{ margin: 0, fontWeight: 800, color: T.text }}>{val}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: T.cardSoft, borderRadius: 10, padding: '12px 14px' }}>
        <p style={{ fontSize: 11.5, fontWeight: 700, color: T.textSoft, margin: '0 0 8px' }}>Yakın Randevular</p>
        {[['11:00', 'Ayşe Yılmaz'], ['12:30', 'Mehmet Demir'], ['14:00', 'Elif Kaya']].map(([time, name]) => (
          <div key={time} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', color: T.textSoft }}>
            <span>{time}</span><span>{name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
