import Layout from '../components/Layout.jsx'
import usePageMeta from '../usePageMeta.js'

export default function KullanimSartlari() {
  usePageMeta('Kullanım Şartları', 'Müşteri Takip hizmetini kullanırken geçerli olan kullanım şartları ve koşulları.')
  return (
    <Layout>
      <main className="page">
        <section className="container page-hero">
          <span className="page-no">Yasal</span>
          <h1>Kullanım Şartları</h1>
          <p>Son güncelleme: 15 Haziran 2026</p>
        </section>

        <section className="container article privacy-content" style={{ margin: '0 auto' }}>
          <p>Bu Kullanım Şartları ("Şartlar"), Müşteri Takip (musteritakip.net) hizmetini ("Hizmet") kullanan işletmeler ile Kubilay Baykan (Kubilay Dijital, "Hizmet Sağlayıcı") arasındaki ilişkiyi düzenler. Hizmete kayıt olarak veya kullanarak bu Şartları kabul etmiş sayılırsınız.</p>

          <h2>1. Hizmetin Kapsamı</h2>
          <p>Müşteri Takip, randevu bazlı çalışan hizmet işletmelerine yönelik bir müşteri takip ve randevu yönetim platformudur. Hizmet; randevu yönetimi, müşteri kayıtları, WhatsApp bildirimleri, dışa aktarma araçları ve isteğe bağlı reklam performans entegrasyonlarını (Meta) içerir.</p>

          <h2>2. Hesap Sorumluluğu</h2>
          <ul>
            <li>Kayıt sırasında verdiğiniz bilgilerin doğru ve güncel olmasından siz sorumlusunuz.</li>
            <li>Hesap şifrenizin gizliliğini korumak sizin sorumluluğunuzdadır.</li>
            <li>Hesabınız üzerinden gerçekleştirilen tüm işlemlerden siz sorumlusunuz.</li>
          </ul>

          <h2>3. Üçüncü Taraf Entegrasyonları</h2>
          <p>Hizmet, isteğe bağlı olarak Meta (Facebook/Instagram) reklam hesabı bağlantısı sunar. Bu bağlantıyı kurmak tamamen sizin tercihinizdir; bağlantıyı istediğiniz zaman panelden kaldırabilirsiniz. Meta entegrasyonu yalnızca kendi reklam hesabınıza ait performans verilerini görüntülemenizi sağlar; başka hiçbir işletmenin verisine erişim sağlamaz.</p>

          <h2>4. Ödeme ve Deneme Süresi</h2>
          <p>Hizmet, 14 günlük ücretsiz deneme süresi ile sunulur. Deneme süresi sonunda hizmete devam etmek için ücretli bir plana geçiş yapmanız gerekir. Ücretlendirme ve paket detayları musteritakip.net üzerinden duyurulur.</p>

          <h2>5. Hizmetin Kullanılamaması</h2>
          <p>Hizmet Sağlayıcı, bakım, güncelleme veya öngörülemeyen teknik sorunlar nedeniyle hizmette geçici kesintiler yaşanabileceğini bildirir. Hizmet Sağlayıcı, planlı bakım çalışmalarını önceden duyurmaya çalışır.</p>

          <h2>6. Fikri Mülkiyet</h2>
          <p>Müşteri Takip platformuna ait yazılım, tasarım ve marka unsurları Kubilay Baykan'a (Kubilay Dijital) aittir. Kullanıcılar, kendi işletme verileri üzerinde tam mülkiyet hakkına sahiptir.</p>

          <h2>7. Hesap Kapatma</h2>
          <p>Hesabınızı istediğiniz zaman kapatabilirsiniz. Hesap kapatma talebinde verileriniz, Gizlilik Politikamızda belirtilen süre (30 gün) içinde silinir.</p>

          <h2>8. Sorumluluk Sınırlaması</h2>
          <p>Hizmet Sağlayıcı, hizmetin kullanımından doğabilecek dolaylı zararlardan sorumlu tutulamaz. Hizmet "olduğu gibi" sunulmaktadır.</p>

          <h2>9. Değişiklikler</h2>
          <p>Bu Şartlar gerektiğinde güncellenebilir. Güncel hali her zaman bu sayfada yayınlanır.</p>

          <h2>10. İletişim</h2>
          <p>Sorularınız için: <a href="mailto:info@musteritakip.net">info@musteritakip.net</a></p>
        </section>
      </main>
    </Layout>
  )
}
