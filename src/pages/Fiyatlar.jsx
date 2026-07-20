import Layout from '../components/Layout.jsx'
import usePageMeta from '../usePageMeta.js'
import { Check, MessageCircle, Sparkles } from 'lucide-react'

const INCLUDED = [
  'Sınırsız randevu ve müşteri kaydı',
  'Otomatik hatırlatma sistemi (Fırsatlar)',
  'Meta reklam performans entegrasyonu',
  'AI destekli görüşme ipuçları',
  'Fotoğrafla not tarama (AI)',
  'Online randevu sayfası',
  'WhatsApp hızlı mesaj şablonları',
  'Excel/CSV dışa aktarma',
  '1 şube, 5 kullanıcıya kadar',
]

const AUDIENCE = ['Güzellik Merkezi', 'Kuaför', 'Klinik', 'Diyetisyen', 'Danışmanlık']

export default function Fiyatlar() {
  usePageMeta('Fiyatlar', 'Müşteri Takip fiyatlandırması: tek, sabit aylık ücret ve işletmenize özel devreye alma paketi. Sürpriz maliyet yok.')
  return (
    <Layout>
      <main className="page">
        <section className="container page-hero">
          <span className="page-no">Fiyatlar</span>
          <h1>Basit, tek bir fiyat.</h1>
          <p>Sürpriz maliyet ve paket karmaşası yok. Tek şubeli işletmeler için sabit fiyat.</p>
        </section>

        <section className="container pricing-grid">
          <div className="pricing-card pricing-card-setup">
            <span className="pricing-badge">Tek Seferlik</span>
            <h3>İşletme Başlangıç Paketi</h3>
            <div className="pricing-amount"><b>3.000</b><span>TL + KDV</span></div>
            <p className="pricing-desc">İşletmenize özel kurulum, entegrasyon ve ekip eğitimi.<br /><small>Reklam hesaplarının bağlanması, kullanıcı oluşturma ve sistemin devreye alınması.</small></p>
          </div>

          <div className="pricing-card pricing-card-main">
            <span className="pricing-badge pricing-badge-primary"><Sparkles size={13} /> En Çok Tercih Edilen</span>
            <h3>Profesyonel Plan</h3>
            <div className="pricing-amount pricing-amount-big"><b>3.500</b><span>TL + KDV / ay</span></div>
            <p className="pricing-desc">Reklamdan gelen talepleri, görüşmeleri, randevuları ve satış dönüşümünü tek panelden yönetin.</p>
            <ul className="pricing-list">
              {INCLUDED.map(item => (
                <li key={item}><Check size={16} /> {item}</li>
              ))}
            </ul>
            <a href="https://wa.me/905336153445?text=Merhaba%2C%20M%C3%BC%C5%9Fteri%20Takip%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum." target="_blank" rel="noreferrer" className="btn btn-primary big pricing-cta">
              <MessageCircle size={18} /> Ücretsiz Canlı Demo Planla
            </a>
            <p className="pricing-trial-note">İlk 7 gün ücretsiz deneyin. Memnun kalırsanız aboneliğiniz başlar.</p>
          </div>
        </section>

        <section className="container pricing-roi">
          <span className="pricing-roi-icon">💰</span>
          <div>
            <h4>Sistem kendini nasıl amorti eder?</h4>
            <p>Ayda sadece <b>2 ekstra lazer satışı</b> ya da <b>1 ekstra botoks</b> kazandırması hâlinde, sistem aylık ücretini fazlasıyla çıkarır.</p>
          </div>
        </section>

        <section className="container pricing-audience">
          <h4>Kimler için?</h4>
          <div className="pricing-audience-list">
            {AUDIENCE.map(a => <span key={a}><Check size={14} /> {a}</span>)}
          </div>
        </section>

        <section className="container pricing-note">
          <p>Birden fazla şubeniz mi var? Ek şube ve kullanıcı ihtiyaçlarınız için <a href="/iletisim">bizimle iletişime geçin</a>, size özel bir plan hazırlayalım.</p>
        </section>

        <section className="container pricing-faq">
          <h2>Sıkça sorulan sorular</h2>
          <div className="pricing-faq-grid">
            <div>
              <h4>7 gün ücretsiz deneme var mı?</h4>
              <p>Evet. Canlı demo sonrası uygun bulursanız, işletmenize özel 7 günlük ücretsiz deneme hesabı açıyoruz.</p>
            </div>
            <div>
              <h4>Neden bir kurulum ücreti var?</h4>
              <p>Kurulum ücreti yazılım erişimi için değil; işletmenize özel devreye alma, Meta bağlantısı, WhatsApp şablonları ve ekip eğitimi için alınır.</p>
            </div>
            <div>
              <h4>Sözleşme/taahhüt var mı?</h4>
              <p>Hayır, aylık kullanım şeklindedir, istediğiniz zaman iptal edebilirsiniz.</p>
            </div>
            <div>
              <h4>Yıllık ödemede indirim var mı?</h4>
              <p>Evet, yıllık peşin ödemede 2 ay bedava kullanım sağlıyoruz. Detaylar için bizimle iletişime geçin.</p>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  )
}

