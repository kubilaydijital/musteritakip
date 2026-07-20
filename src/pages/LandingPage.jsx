import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Mail, Monitor, Smartphone, ShieldCheck, MessageCircle, ChevronDown } from 'lucide-react'
import Layout from '../components/Layout.jsx'
import DashboardMock, { MobileReminderMock } from '../components/DashboardMock.jsx'
import AdsFunnelGraphic from '../components/AdsFunnelGraphic.jsx'
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
              <h1>Reklamdan Gelen Her Mesaj<br/><strong>Satışa Dönüşüyor mu?</strong></h1>
              <p>Meta reklamlarından gelen talepleri, personel görüşmelerini, randevuları ve satışları tek panelden takip edin. Reklam bütçenizin nerede kaybolduğunu görün.</p>
              <div className="hero-actions">
                <a href="https://wa.me/905336153445?text=Merhaba%2C%20M%C3%BC%C5%9Fteri%20Takip%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum." target="_blank" rel="noreferrer" className="btn btn-primary big"><MessageCircle size={18}/> Ücretsiz Canlı Demo Planla</a>
                <a href="#nasil-calisiyor" className="btn btn-ghost big">Nasıl Çalışıyor? <ChevronDown size={18}/></a>
              </div>
              <div className="hero-checks"><span><CheckCircle2/>7 gün ücretsiz deneme</span><span><CheckCircle2/>Kredi kartı gerekmez</span><span><CheckCircle2/>İşletmenize özel kurulum</span></div>
            </div>
            <div className="hero-visual"><AdsFunnelGraphic /></div>
          </div>
        </section>

        <section id="nasil-calisiyor" className="container references-strip">
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

        <section className="container booking-feature">
          <div className="booking-feature-copy">
            <span className="booking-badge"><span></span>Yeni özellik</span>
            <h2>Müşterileriniz artık sizi aramadan<br/><strong>randevu alabilir.</strong></h2>
            <p>Kendi randevu sayfanızla, müşterileriniz 7/24 size uygun saati görüp anında randevu oluşturabilir. Siz hiçbir şey yapmadan, panel otomatik dolar.</p>
            <Link to="/deneme" className="btn btn-primary big">Ücretsiz 7 Gün Dene <ArrowRight size={18}/></Link>
          </div>
          <div className="booking-mock">
            <p className="booking-mock-title">İşletmeniz</p>
            <p className="booking-mock-sub">Aşağıdan size uygun bir gün ve saat seçin.</p>
            <p className="booking-mock-label">Müsait saatler</p>
            <div className="booking-mock-slots">
              <span>10:00</span><span className="active">11:30</span><span>13:00</span><span>14:30</span>
            </div>
            <div className="booking-mock-fields">
              <span>Ad Soyad</span>
              <span>Telefon</span>
              <div className="booking-mock-cta">11:30 için randevu al</div>
            </div>
          </div>
        </section>

        <section className="container device-section">
          <div><h2>Her yerden, her cihazdan erişin.</h2><p>Bilgileriniz güvende, siz işinize odaklanın. Web ekranı, mobil uyum ve güvenli altyapı ile süreçlerinizi daha net yönetin.</p><div className="device-badges"><span><Monitor/>Web</span><span><Smartphone/>Mobil uyumlu</span><span><ShieldCheck/>Güvenli altyapı</span></div></div>
          <DashboardMock compact />
        </section>

        <section className="container final-cta"><h2>Hemen başlayın, işinizi kolaylaştırın.</h2><p>İşletmenizin ihtiyacını konuşmak için ücretsiz deneyebilir veya bize ulaşabilirsiniz.</p><div><Link to="/deneme" className="btn btn-primary big">Ücretsiz 7 Gün Dene</Link><Link to="/iletisim" className="btn btn-ghost big">Bize Ulaşın</Link></div></section>
      </main>
    </Layout>
  )
}
