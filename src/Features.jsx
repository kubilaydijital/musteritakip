import { Link } from 'react-router-dom'
import { SiteHeader, SiteFooter } from './SiteLayout'
import { T, cardStyle, btnPrimary, GLOBAL_CSS, PAGE_MAX } from './theme'

const FEATURES = [
  { icon: '📅', title: 'Akıllı Randevu Yönetimi', desc: 'Çakışma yok, hatırlatma var. Randevu takviminizi tek ekrandan yönetin, kim ne zaman gelecek tek bakışta görün.' },
  { icon: '🔔', title: 'Otomatik Hatırlatmalar', desc: 'Müşterinizden gelen sonuca göre kademeli hatırlatma sistemi devreye girer. Kayıt güncellenmeden hiçbir lead unutulmaz.' },
  { icon: '👥', title: 'Müşteri Takibi', desc: 'Tüm müşteri bilgilerini, görüşme notlarını ve geçmiş kayıtları tek yerde düzenli tutun.' },
  { icon: '🎯', title: 'Potansiyel Müşteri Uyarıları', desc: 'Kayıtlarda yer alan potansiyel müşteriler için takip uyarıları görün, hiçbir fırsatı kaçırmayın.' },
  { icon: '📊', title: 'Reklam Kaynağı Takibi', desc: 'Hangi kanaldan kaç müşteri geldiğini, hangi kanalın daha çok kazandırdığını (ROAS) görün.' },
  { icon: '📈', title: 'Raporlar & Analiz', desc: 'İşinizi büyütecek doğru verilere anında ulaşın. Satış hunisi, kayıp analizi ve aylık trendler tek ekranda.' },
  { icon: '🔄', title: 'Kaçan Müşteri Takibi', desc: 'Sistem kaçan müşterinin peşinden gider, geri kazanmanız için doğru zamanda hatırlatır.' },
  { icon: '📝', title: 'Notlar & Geçmiş Kayıtlar', desc: 'Her görüşmenin notu geçmişe eklenir, hiçbir bilgi kaybolmaz. Kim ne zaman ne konuştu, hep elinizin altında.' },
  { icon: '🔐', title: 'Ekip Yönetimi', desc: 'Çalışanlarınızı yönetin, performanslarını takip edin. Kim neyi görsün, izinleri siz belirleyin.' },
]

export default function Features() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, color: T.text, minHeight: '100vh' }}>
      <style>{GLOBAL_CSS}</style>
      <SiteHeader />

      <section style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '64px 20px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          İşinizi kolaylaştıran <span style={{ color: T.primary }}>güçlü özellikler</span>
        </h1>
        <p style={{ fontSize: 16, color: T.textSoft, maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
          Tüm süreçlerinizi tek yerden yönetin, zaman kazanın, daha çok kazanın.
        </p>
      </section>

      <section style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '32px 20px 64px' }}>
        <div className="mt-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ ...cardStyle, padding: '18px 18px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 10, background: T.primaryLight, fontSize: 17, marginBottom: 12
              }}>{f.icon}</span>
              <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: '0 0 6px', color: T.text }}>{f.title}</h3>
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: T.textSoft, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: T.card, borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, margin: '0 0 14px' }}>Tüm bu özellikleri görmek ister misiniz?</h2>
          <p style={{ fontSize: 15, color: T.textSoft, margin: '0 0 28px' }}>14 gün ücretsiz deneyin, kredi kartı gerekmez.</p>
          <Link to="/deneme" className="mt-btn-primary" style={btnPrimary}>Ücretsiz 14 Gün Dene →</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
