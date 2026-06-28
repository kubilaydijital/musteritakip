import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Mail, Monitor, Smartphone, ShieldCheck } from 'lucide-react'
import Layout from '../components/Layout.jsx'
import DashboardMock, { MobileReminderMock } from '../components/DashboardMock.jsx'
import ReferenceLogo from '../components/ReferenceLogo.jsx'
import ReminderTable from '../components/ReminderTable.jsx'
import { features, references } from '../data/siteData.js'
import usePageMeta from '../usePageMeta.js'

export default function LandingPage() {
  usePageMeta(null, 'Güzellik salonları, klinikler ve randevu bazlı hizmet işletmeleri için lead ve randevu takip sistemi. Instagram, WhatsApp ve telefon görüşmelerini tek panelde topla, kaybı durdur.')
  const preview = features.slice(0, 6)
  return (
    <Layout>
      <main>
        <section className="hero section-glow">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow"><span></span>Hizmet sektörü için müşteri takip sistemi</span>
              <h1>Kağıt defter devri bitti.<br/><strong>Müşteriniz kaçmasın,</strong><br/>işiniz büyüsün.</h1>
              <p>Kağıda yazılan müşteri unutulur. Müşteri Takip; randevuları, gelen mesajları, satışları ve kaçan müşterileri tek ekranda toplar. Sistem zamanı geldiğinde sizi uyarır, hiçbir potansiyel müşteri arada kaybolmaz.</p>
              <div className="hero-actions">
                <Link to="/deneme" className="btn btn-primary big">Ücretsiz 14 Gün Dene <ArrowRight size={18}/></Link>
                <Link to="/demo" className="btn btn-ghost big"><Mail size={18}/> Demo Talep Et</Link>
              </div>
              <div className="hero-checks"><span><CheckCircle2/>14 gün ücretsiz</span><span><CheckCircle2/>Kredi kartı gerekmez</span><span><CheckCircle2/>Kurulum gerektirmez</span></div>
            </div>
            <div className="hero-visual"><DashboardMock /><MobileReminderMock /></div>
          </div>
        </section>

        <section className="container references-strip">
          <p>Bize güvenen işletmeler</p>
          <div className="reference-row">{references.map((item) => <ReferenceLogo key={item.name} item={item} />)}</div>
        </section>

        <section className="container feature-strip">
          {preview.map((item) => {
            const Icon = item.icon
            return <article key={item.title} className="feature-mini"><Icon size={28}/><h3>{item.title}</h3><p>{item.desc}</p></article>
          })}
        </section>

        <section className="container compare-section">
          <div className="problem-card">
            <h2>Hâlâ kağıt defter mi kullanıyorsunuz?</h2>
            <ul>
              <li>Müşteriler kayboluyor, notlar karışıyor.</li>
              <li>Randevu çakışmaları ve iptaller yaşanıyor.</li>
              <li>Hangi kaynaktan müşteri geldiğini bilmiyorsunuz.</li>
              <li>Günlük, haftalık rapor almak imkansızlaşıyor.</li>
              <li>İşiniz büyüdükçe kontrolü kaybediyorsunuz.</li>
            </ul>
          </div>
          <div className="compare-arrow"><ArrowRight size={34}/></div>
          <div className="solution-card">
            <h2>Müşteri Takip ile her şey kontrol altında</h2>
            <ul>
              <li>Tüm müşteri bilgileri tek yerde, güvenle saklanır.</li>
              <li>Randevular, hatırlatmalar ve iptaller düzenli yönetilir.</li>
              <li>Reklam ve kaynak performansınızı net görün.</li>
              <li>Gerçek zamanlı raporlarla işinizi büyütün.</li>
              <li>Kaçan müşterinin peşinden gidin, kazancınızı artırın.</li>
            </ul>
          </div>
        </section>

        <section className="container reminder-flow-card">
          <div className="reminder-text"><h2>Unutsanız da sistem unutmaz.</h2><p>Hatırlatma sistemi müşterinizin sonucuna göre çalışır. Sistem doğru zamanda uyarır, ekip doğru kişiye ulaşır.</p></div>
          <div className="flow"><span>1. Hatırlatma<small>1g / 3g / 15g</small></span><ArrowRight/><span>2. Hatırlatma<small>+14g / +30g</small></span><ArrowRight/><span>3. Hatırlatma<small>+30g / +60g</small></span><ArrowRight/><b>Geri kazanılan müşteri</b></div>
        </section>

        <section className="reminder-section">
          <div className="container split-grid">
            <div>
              <span className="eyebrow"><span></span>Nasıl çalışır?</span>
              <h2>Sonuca göre kademeli hatırlatma sistemi</h2>
              <p>Randevu geçti, randevuya gelmedi, cevap yazıldı ama dönüş olmadı veya satın almadı. Her sonuç kategorisi için hatırlatma süresi farklıdır. 3 hatırlatma sonrası müşteri soğuk kabul edilir.</p>
              <ReminderTable />
            </div>
            <div className="notice-card"><h3>Sistem sizi uyarır.</h3><p>Personel her gün kimi arayacağını ezberlemek zorunda kalmaz. Uyarılar sayesinde doğru müşteriye, doğru zamanda ulaşılır.</p><Link to="/ozellikler" className="btn btn-primary">Özellikleri İncele</Link></div>
          </div>
        </section>

        <section className="container device-section">
          <div><h2>Her yerden, her cihazdan erişin.</h2><p>Bilgileriniz güvende, siz işinize odaklanın. Web ekranı, mobil uyum ve güvenli altyapı ile süreçlerinizi daha net yönetin.</p><div className="device-badges"><span><Monitor/>Web</span><span><Smartphone/>Mobil uyumlu</span><span><ShieldCheck/>Güvenli altyapı</span></div></div>
          <DashboardMock compact />
        </section>

        <section className="container final-cta"><h2>Hemen başlayın, işinizi kolaylaştırın.</h2><p>İşletmenizin ihtiyacını konuşmak için ücretsiz deneyebilir veya demoyu inceleyebilirsiniz.</p><div><Link to="/deneme" className="btn btn-primary big">Ücretsiz 14 Gün Dene</Link><Link to="/demo" className="btn btn-ghost big">Demoyu İncele</Link></div></section>
      </main>
    </Layout>
  )
}
