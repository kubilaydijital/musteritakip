import { Link } from 'react-router-dom'
import {
  ArrowRight, CalendarClock, ChartNoAxesCombined, Check, CircleCheck,
  MessageCircle, ShieldCheck, Sparkles, UsersRound, WalletCards,
} from 'lucide-react'
import Layout from '../components/Layout.jsx'
import dashboardPreview from '../assets/dashboard-preview.png'
import ReferenceLogo from '../components/ReferenceLogo.jsx'
import { features, references } from '../data/siteData.js'
import usePageMeta from '../usePageMeta.js'

const WHATSAPP_URL = 'https://wa.me/905336153445?text=Merhaba%2C%20M%C3%BC%C5%9Fteri%20Takip%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.'

const outcomes = [
  { icon: UsersRound, label: 'Tüm talepler tek yerde' },
  { icon: CalendarClock, label: 'Randevular gözden kaçmaz' },
  { icon: ChartNoAxesCombined, label: 'Reklamdan satışa netlik' },
]

const steps = [
  ['01', 'Talepleri toplayın', 'Instagram, WhatsApp, telefon ve online randevu kayıtları tek ekranda buluşur.'],
  ['02', 'Ekibi yönlendirin', 'Doğru müşteriye, doğru zamanda dönüş yapmak için akıllı hatırlatmalar kullanın.'],
  ['03', 'Sonucu görün', 'Randevu, satış ve reklam performansını sade raporlarla takip edin.'],
]

export default function LandingPage() {
  usePageMeta(null, 'Müşteri Takip; randevu bazlı işletmeler için lead, müşteri, randevu ve reklam performansını tek panelde birleştirir.')
  const capabilities = features.slice(0, 6)

  return (
    <Layout>
      <main className="premium-site">
        <section className="landing-hero">
          <div className="container landing-hero-grid">
            <div className="landing-hero-copy">
              <span className="premium-kicker"><Sparkles size={14} /> Hizmet işletmeleri için müşteri yönetimi</span>
              <h1>Müşteri sürecinizi<br /><em>görünür</em> kılın.</h1>
              <p>Reklamdan gelen ilk mesajdan satışa kadar bütün süreci tek, sakin ve anlaşılır panelden yönetin.</p>
              <div className="landing-actions">
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="premium-button primary"><MessageCircle size={18} /> Canlı demo planla <ArrowRight size={17} /></a>
                <Link to="/giris" className="premium-button secondary">Panele giriş yap</Link>
              </div>
              <div className="landing-assurances">
                <span><Check size={15} /> 7 gün ücretsiz deneme</span>
                <span><Check size={15} /> Kredi kartı gerekmez</span>
                <span><Check size={15} /> Kurulum desteği dahil</span>
              </div>
            </div>

            <div className="landing-hero-visual" aria-label="Müşteri Takip panel ön izlemesi">
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <div className="hero-panel-card hero-floating-top"><span>Bu ayki dönüşüm</span><strong>+18,4%</strong><i>↑ geçen aya göre</i></div>
              <div className="hero-dashboard-frame">
                <div className="hero-dashboard-top"><span className="hero-logo-dot">M</span><span>Genel Bakış</span><small>Bu ay</small></div>
                <img src={dashboardPreview} alt="Müşteri Takip paneli genel bakış ekranı" />
              </div>
              <div className="hero-panel-card hero-floating-bottom"><span className="status-dot" /> <b>18 müşteri için takip zamanı geldi</b></div>
            </div>
          </div>
        </section>

        <section className="landing-outcomes-wrap">
          <div className="container landing-outcomes">
            {outcomes.map(({ icon: Icon, label }) => <div key={label}><span><Icon size={19} /></span><p>{label}</p></div>)}
          </div>
        </section>

        <section className="container landing-trust">
          <p>Farklı hizmet sektörlerindeki işletmelerin tercihi</p>
          <div className="landing-trust-logos">{references.map((item) => <ReferenceLogo key={item.name} item={item} />)}</div>
        </section>

        <section className="container product-story">
          <div className="section-heading compact">
            <span className="premium-kicker">Tek merkez, net kararlar</span>
            <h2>Ekibiniz için daha az karmaşa.<br />İşletmeniz için daha çok kontrol.</h2>
            <p>Rutin iş akışlarını tek bir yerde toplar; müşteri sürecini kişilere değil sisteme bağlar.</p>
          </div>
          <div className="product-window">
            <div className="product-window-bar"><span /><span /><span /><p>app.musteritakip.net / genel-bakis</p><i>Canlı veri</i></div>
            <img src={dashboardPreview} alt="Müşteri Takip raporlama ve müşteri takip ekranı" />
          </div>
        </section>

        <section className="container capability-section">
          <div className="section-heading split-heading">
            <div><span className="premium-kicker">Günlük operasyon için tasarlandı</span><h2>İşletmenin her gün baktığı tek ekran.</h2></div>
            <p>Takip, randevu, satış ve reklam performansını; ekibin hızını kesmeden bir araya getirir.</p>
          </div>
          <div className="capability-grid">
            {capabilities.map((item, index) => {
              const Icon = item.icon
              return <article key={item.title} className={`capability-card capability-${index}`}><span className="capability-icon"><Icon size={21} /></span><h3>{item.title}</h3><p>{item.desc}</p><span className="capability-index">0{index + 1}</span></article>
            })}
          </div>
        </section>

        <section className="process-section">
          <div className="container process-inner">
            <div className="section-heading process-intro"><span className="premium-kicker"><ShieldCheck size={14} /> Düzenli ve güvenli süreç</span><h2>Her müşterinin sonraki adımı belli olsun.</h2><p>Sistem, kritik bilgileri ve takip zamanını öne çıkarır; ekip müşteriyi unutmaz, yöneticiler tablo peşinde koşmaz.</p></div>
            <div className="process-steps">
              {steps.map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}
            </div>
          </div>
        </section>

        <section className="container premium-cta">
          <div><span className="premium-kicker"><WalletCards size={14} /> İlk 7 gün ücretsiz</span><h2>İşletmenizi daha net<br />yönetmeye başlayın.</h2><p>Size uygun kurulumu birlikte planlayalım. Verileriniz, süreçleriniz ve ekibiniz için doğru başlangıcı yapalım.</p></div>
          <div className="premium-cta-side"><CircleCheck size={27} /><p>Kurulum ve ilk kullanım desteği dahil.</p><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="premium-button light">Ücretsiz demo planla <ArrowRight size={17} /></a></div>
        </section>
      </main>
    </Layout>
  )
}
