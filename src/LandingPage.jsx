import { useState } from 'react'
import { Link } from 'react-router-dom'

const WHATSAPP_NUMBER = '905336153445'
const WHATSAPP_MESSAGE = encodeURIComponent('Merhaba, Müşteri Takip sistemi hakkında bilgi almak istiyorum.')
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.94.55 3.76 1.5 5.31L2 22l4.94-1.56a9.8 9.8 0 0 0 5.1 1.39h.01c5.46 0 9.91-4.45 9.91-9.92C21.96 6.45 17.5 2 12.04 2zm5.8 14.07c-.24.68-1.42 1.3-1.96 1.38-.5.08-1.13.11-1.83-.12-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.94-4.36-.15-.19-1.18-1.57-1.18-3 0-1.42.74-2.12 1-2.41.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.58.81 2 .88 2.14.07.15.12.32.02.51-.1.19-.15.31-.3.48-.15.17-.31.38-.45.51-.15.14-.3.29-.13.57.17.29.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.29.15.46.13.63-.05.17-.18.7-.81.89-1.09.18-.28.37-.23.62-.14.25.09 1.6.75 1.87.89.27.13.45.2.51.31.07.12.07.66-.17 1.34z" />
    </svg>
  )
}

const SECTION_PAD = { padding: '0 24px' }

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: '#262b36', background: '#FAFAF7', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .lp-display { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
        .lp-btn-primary {
          background: #1a2744; color: #fff; border: none; border-radius: 10px;
          padding: 14px 28px; font-size: 15px; font-weight: 600; cursor: pointer;
          font-family: inherit; transition: transform 0.15s ease, box-shadow 0.15s ease;
          display: inline-flex; align-items: center; gap: 8px; text-decoration: none;
        }
        .lp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(26,39,68,0.25); }
        .lp-btn-secondary {
          background: transparent; color: #1a2744; border: 1.5px solid #d8d4c8; border-radius: 10px;
          padding: 14px 28px; font-size: 15px; font-weight: 600; cursor: pointer;
          font-family: inherit; transition: border-color 0.15s ease, background 0.15s ease;
          display: inline-flex; align-items: center; gap: 8px; text-decoration: none;
        }
        .lp-btn-secondary:hover { border-color: #C9A05C; background: #fff; }
        .lp-fade-up { animation: lpFadeUp 0.7s ease backwards; }
        @keyframes lpFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 760px) {
          .lp-hero-grid { grid-template-columns: 1fr !important; }
          .lp-feature-grid { grid-template-columns: 1fr !important; }
          .lp-funnel-row { flex-direction: column !important; }
          .lp-funnel-arrow { transform: rotate(90deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-fade-up { animation: none !important; }
        }
        a:focus-visible, button:focus-visible { outline: 2px solid #C9A05C; outline-offset: 2px; }
      `}</style>

      {/* NAV */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,250,247,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #ECE8DC' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', ...SECTION_PAD, height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="lp-display" style={{ fontSize: 20, fontWeight: 600, color: '#1a2744' }}>Müşteri Takip</span>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/demo" className="lp-btn-secondary" style={{ padding: '10px 18px', fontSize: 14 }}>Demo'yu Gör</Link>
            <Link to="/giris" className="lp-btn-primary" style={{ padding: '10px 18px', fontSize: 14 }}>Giriş Yap</Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section style={{ maxWidth: 1180, margin: '0 auto', ...SECTION_PAD, paddingTop: 72, paddingBottom: 56 }}>
        <div className="lp-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 56, alignItems: 'center' }}>
          <div>
            <p className="lp-fade-up" style={{ fontSize: 13, fontWeight: 600, color: '#9C7A3C', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 18px' }}>
              Randevu bazlı hizmet işletmeleri için
            </p>
            <h1 className="lp-display lp-fade-up" style={{ fontSize: 'clamp(34px, 5vw, 52px)', lineHeight: 1.08, fontWeight: 600, margin: '0 0 22px', color: '#1a2744', animationDelay: '0.05s' }}>
              Instagram'dan gelen mesaj,<br />satışa dönüşene kadar<br />gözünün önünde.
            </h1>
            <p className="lp-fade-up" style={{ fontSize: 17, lineHeight: 1.6, color: '#5B6270', maxWidth: 480, margin: '0 0 32px', animationDelay: '0.1s' }}>
              DM'den gelen her müşteri adayı kağıda yazılıp unutuluyor mu? Randevu alıp gelmeyenler, gelip almayanlar nerede kayboluyor bilmiyor musun? Tek ekrandan gör, takip et, kaybı durdur.
            </p>
            <div className="lp-fade-up" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', animationDelay: '0.15s' }}>
              <Link to="/demo" className="lp-btn-primary">Demo'yu Gör</Link>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="lp-btn-secondary">
                <WhatsAppIcon /> WhatsApp'tan Yazın
              </a>
            </div>
          </div>

          <div className="lp-fade-up" style={{ animationDelay: '0.1s' }}>
            <FunnelGraphic />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section style={{ background: '#fff', borderTop: '1px solid #ECE8DC', borderBottom: '1px solid #ECE8DC' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', ...SECTION_PAD, padding: '64px 24px' }}>
          <div style={{ maxWidth: 700 }}>
            <h2 className="lp-display" style={{ fontSize: 28, fontWeight: 600, color: '#1a2744', margin: '0 0 18px' }}>
              Reklam veriyorsun, mesaj geliyor. Sonra ne oluyor?
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#5B6270', margin: 0 }}>
              Çoğu salon ve klinikte cevap aynı: kimse bilmiyor. Bir defter, dağınık notlar, hatırlanan-hatırlanmayan telefon numaraları. Hangi mesaj randevuya döndü, hangi randevu satışa döndü, hangi müşteri "düşüneceğim" deyip kayboldu — bu sorulara net bir cevap yok. Reklama harcanan her lira, takip edilmeyen bir leadle birlikte boşa gidiyor.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ maxWidth: 1180, margin: '0 auto', ...SECTION_PAD, padding: '64px 24px' }}>
        <h2 className="lp-display" style={{ fontSize: 28, fontWeight: 600, color: '#1a2744', margin: '0 0 8px', textAlign: 'center' }}>
          Tek panel, tüm süreç
        </h2>
        <p style={{ fontSize: 15, color: '#5B6270', textAlign: 'center', margin: '0 0 48px' }}>
          Mesaj geldiği andan satış kapandığı ana kadar
        </p>
        <div className="lp-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
          <FeatureCard
            title="Randevu takvimi"
            desc="Kim ne zaman gelecek, tek bakışta. Geçmişe dönük kayıt girişi için yıllar arası hızlı gezinme."
          />
          <FeatureCard
            title="Kim neyi görsün, sen belirle"
            desc="Sosyal medya personeli telefon görsün ama ciroyu görmesin mi? Muhasebeci sadece rakamları mı görsün? İzinleri sen tanımla."
          />
          <FeatureCard
            title="Kaybı gösteren raporlar"
            desc="Randevuya gelmeyenler, gelip almayanlar, hiç dönüş alınamayanlar — huninin neresinde kaybettiğini gör."
          />
          <FeatureCard
            title="Şube şube, izole veri"
            desc="Her şube sadece kendi verisini görür. Birden fazla lokasyonun karışmasından korkma."
          />
          <FeatureCard
            title="Mesaj / kayıt eşleşmesi"
            desc="Meta'nın gösterdiği mesaj sayısı ile sisteme girilen kayıt sayısı tutmuyorsa, haftalık olarak görür, müdahale edersin."
          />
          <FeatureCard
            title="Hizmetine göre özelleşir"
            desc="Lazer epilasyondan saç ekimine, her işletme kendi hizmet listesini tanımlar."
          />
        </div>
      </section>

      {/* WHO FOR */}
      <section style={{ background: '#1a2744', color: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', ...SECTION_PAD, padding: '56px 24px', textAlign: 'center' }}>
          <h2 className="lp-display" style={{ fontSize: 24, fontWeight: 600, margin: '0 0 20px' }}>Kimler için</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', fontSize: 14 }}>
            {['Güzellik salonları', 'Estetik klinikler', 'Saç ekim merkezleri', 'Diş klinikleri', 'Danışmanlık büroları', 'Eğitim & kurs merkezleri'].map(item => (
              <span key={item} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '8px 18px' }}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / CONTACT */}
      <section style={{ maxWidth: 1180, margin: '0 auto', ...SECTION_PAD, padding: '72px 24px', textAlign: 'center' }}>
        <h2 className="lp-display" style={{ fontSize: 30, fontWeight: 600, color: '#1a2744', margin: '0 0 14px' }}>
          Önce gör, sonra konuşalım
        </h2>
        <p style={{ fontSize: 16, color: '#5B6270', maxWidth: 480, margin: '0 auto 32px' }}>
          Demo'da örnek verilerle nasıl çalıştığını gez. Sorularınız için doğrudan yazabilirsiniz.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/demo" className="lp-btn-primary">Demo'yu Gör</Link>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="lp-btn-secondary">
            <WhatsAppIcon /> WhatsApp'tan Yazın
          </a>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #ECE8DC', padding: '28px 24px', textAlign: 'center', fontSize: 13, color: '#9aa0ad' }}>
        Müşteri Takip · Kubilay Dijital
      </footer>
    </div>
  )
}

function FeatureCard({ title, desc }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ECE8DC', borderRadius: 14, padding: '26px 22px' }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2744', margin: '0 0 8px' }}>{title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: '#5B6270', margin: 0 }}>{desc}</p>
    </div>
  )
}

function FunnelGraphic() {
  const stages = [
    { label: 'Mesaj geldi', value: 100, color: '#1a2744' },
    { label: 'Randevu aldı', value: 68, color: '#2d4a7a' },
    { label: 'Randevuya geldi', value: 52, color: '#C9A05C' },
    { label: 'Müşteri oldu', value: 31, color: '#3B6D11' },
  ]
  return (
    <div style={{ background: '#fff', border: '1px solid #ECE8DC', borderRadius: 18, padding: '28px 24px', boxShadow: '0 24px 60px -20px rgba(26,39,68,0.18)' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#9aa0ad', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 18px' }}>
        Örnek hafta — nereden nereye
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stages.map((s, i) => (
          <div key={s.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, color: '#262b36' }}>
              <span>{s.label}</span>
              <span style={{ fontWeight: 700 }}>{s.value}</span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: '#F0EEE6' }}>
              <div style={{ height: '100%', width: `${s.value}%`, borderRadius: 6, background: s.color, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: '#9aa0ad', margin: '16px 0 0' }}>Gerçek verilerle, kendi şubene özel görünür.</p>
    </div>
  )
}
