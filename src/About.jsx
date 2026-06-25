import { Link } from 'react-router-dom'
import { SiteHeader, SiteFooter } from './SiteLayout'
import { T, cardStyle, btnPrimary, GLOBAL_CSS, PAGE_MAX } from './theme'

const VALUES = [
  { icon: '✨', title: 'Kolay Kullanım', desc: 'Teknik bilgi gerektirmez, herkes dakikalar içinde kullanmaya başlar.' },
  { icon: '🔒', title: 'Güvenli Altyapı', desc: 'Müşteri verileriniz şubeler arası izole, sadece yetkili kişiler görür.' },
  { icon: '🚀', title: 'Sürekli Gelişim', desc: 'İşletmelerin gerçek ihtiyaçlarına göre sürekli yeni özellikler eklenir.' },
]

export default function About() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, color: T.text, minHeight: '100vh' }}>
      <style>{GLOBAL_CSS}</style>
      <SiteHeader />

      <section style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '64px 20px 56px' }}>
        <div className="mt-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 900, margin: '0 0 18px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Hizmet sektöründeki işletmeler için <span style={{ color: T.primary }}>geliştirildi</span>
            </h1>
            <p style={{ fontSize: 15.5, lineHeight: 1.7, color: T.textSoft, margin: '0 0 16px' }}>
              Müşteri Takip, randevu yönetimi ve hatırlatma süreçlerini tek ekranda toplayarak işletmenizin büyümesine katkı sağlar.
            </p>
            <p style={{ fontSize: 15.5, lineHeight: 1.7, color: T.textSoft, margin: 0 }}>
              Güzellik salonlarından kliniklere, hukuk bürolarından kurslara kadar randevu bazlı çalışan her işletmenin günlük operasyonunda yaşadığı en büyük sorunu çözmek için kurulduk: <strong style={{ color: T.text }}>kaçan müşteriyi geri kazanmak.</strong>
            </p>
          </div>
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <img
              src="/ekip.jpg"
              alt="Müşteri Takip ekibi ofiste"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 280 }}
            />
          </div>
        </div>
      </section>

      <section style={{ background: T.card, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '56px 20px' }}>
          <div className="mt-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {VALUES.map(v => (
              <div key={v.title} style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>{v.icon}</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{v.title}</h3>
                <p style={{ fontSize: 13.5, color: T.textSoft, lineHeight: 1.6, margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, margin: '0 0 14px' }}>Sorularınız mı var?</h2>
        <p style={{ fontSize: 15, color: T.textSoft, margin: '0 0 28px' }}>Size yardımcı olmaktan mutluluk duyarız.</p>
        <Link to="/iletisim" className="mt-btn-primary" style={btnPrimary}>Bize Ulaşın →</Link>
      </section>

      <SiteFooter />
    </div>
  )
}
