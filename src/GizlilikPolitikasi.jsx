import React from "react";

/**
 * Gizlilik Politikası sayfası.
 *
 * Kullanım (React Router ile):
 *   import GizlilikPolitikasi from "./GizlilikPolitikasi";
 *   <Route path="/gizlilik-politikasi" element={<GizlilikPolitikasi />} />
 *
 * Bu component mevcut styles.css'teki .page, .page-hero, .page-no,
 * .article gibi sınıfları yeniden kullanır; ekstra olarak sadece
 * .privacy-content içindeki başlık/paragraf/liste stilleri için
 * birkaç kural gerekiyor (aşağıda not olarak belirtildi).
 */
export default function GizlilikPolitikasi() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-hero">
          <span className="page-no">Yasal</span>
          <h1>Gizlilik Politikası</h1>
          <p>Son güncelleme: 15 Haziran 2026</p>
        </div>

        <article className="article privacy-content" style={{ margin: "0 auto" }}>
          <p>
            Bu Gizlilik Politikası, Müşteri Takip (musteritakip.net) hizmetini
            ("Hizmet", "Platform") kullanan işletmelerin ve onların
            müşterilerinin kişisel verilerinin nasıl toplandığını,
            işlendiğini ve korunduğunu açıklar. Hizmet, Kubilay Baykan
            (Kubilay Dijital) tarafından işletilmektedir.
          </p>

          <h2>1. Topladığımız Veriler</h2>
          <p>Hizmeti kullanırken aşağıdaki veri kategorilerini işliyoruz:</p>
          <ul>
            <li>
              <strong>Hesap ve işletme bilgileri:</strong> ad, soyad,
              e-posta, telefon numarası, işletme adı, şube bilgileri
            </li>
            <li>
              <strong>Müşteri/danışan kayıtları:</strong> işletmelerimizin
              kendi müşterilerine ait ad, telefon, randevu geçmişi, notlar
            </li>
            <li>
              <strong>Randevu verileri:</strong> tarih, saat, hizmet türü,
              durum (onaylı/beklemede/iptal)
            </li>
            <li>
              <strong>WhatsApp mesaj verileri:</strong> randevu hatırlatma
              ve bilgilendirme mesajlarının gönderim kayıtları
            </li>
            <li>
              <strong>Reklam performans verileri:</strong> Meta
              (Facebook/Instagram) reklam hesabından, kullanıcının açık
              izniyle çekilen kampanya, harcama ve lead istatistikleri
            </li>
            <li>
              <strong>Teknik veriler:</strong> IP adresi, tarayıcı bilgisi,
              oturum kayıtları (güvenlik ve hizmet kalitesi amacıyla)
            </li>
          </ul>

          <h2>2. Verileri Nasıl Kullanıyoruz</h2>
          <p>Toplanan veriler yalnızca şu amaçlarla kullanılır:</p>
          <ul>
            <li>Randevu ve müşteri yönetimi hizmetinin sunulması</li>
            <li>WhatsApp üzerinden randevu hatırlatmalarının gönderilmesi</li>
            <li>Reklam performansının panelde raporlanması</li>
            <li>Hizmet güvenliğinin ve kalitesinin sağlanması</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          </ul>

          <h2>3. Üçüncü Taraf Entegrasyonları</h2>
          <p>Hizmetimiz aşağıdaki üçüncü taraf servisleriyle entegre çalışır:</p>
          <ul>
            <li>
              <strong>Meta (Facebook/Instagram) Marketing API:</strong>{" "}
              Kullanıcının açık izniyle, yalnızca kendi reklam hesabına ait
              performans verileri <strong>çekilir</strong>. Müşteri/danışan
              verileri Meta'ya <strong>gönderilmez veya paylaşılmaz.</strong>
            </li>
            <li>
              <strong>WhatsApp:</strong> Randevu bilgilendirme mesajları
              gönderimi için kullanılır.
            </li>
            <li>
              <strong>Supabase:</strong> Veritabanı ve kimlik doğrulama
              altyapımızı sağlar. Sunucular Avrupa Birliği sınırları
              içinde (Frankfurt, Almanya / eu-central-1) bulunmaktadır.
            </li>
            <li>
              <strong>Netlify:</strong> Hizmetin barındırılması ve otomatik
              işlemler (örn. günlük reklam verisi senkronizasyonu) için
              kullanılır.
            </li>
          </ul>
          <p>
            Verileriniz, yukarıda belirtilenler dışında hiçbir üçüncü taraf
            ile paylaşılmaz, satılmaz veya kiralanmaz.
          </p>

          <h2>4. Veri Güvenliği</h2>
          <ul>
            <li>Tüm veri iletimi SSL/TLS şifrelemesi ile korunur.</li>
            <li>
              Erişim, Supabase Row Level Security (RLS) politikaları ile
              her işletmenin yalnızca kendi verilerine erişebileceği
              şekilde kısıtlanmıştır.
            </li>
            <li>Şifreler hash'lenerek saklanır, düz metin şifre saklanmaz.</li>
          </ul>

          <h2>5. Veri Saklama Süresi</h2>
          <p>
            Veriler, hesabınız aktif olduğu sürece ve yasal saklama
            yükümlülükleri (varsa) süresince saklanır. Hesap kapatma
            talebinde verileriniz 30 gün içinde silinir.
          </p>

          <h2>6. KVKK Kapsamındaki Haklarınız</h2>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca:
          </p>
          <ul>
            <li>Verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme</li>
            <li>
              İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını
              öğrenme
            </li>
            <li>Verilerin düzeltilmesini veya silinmesini talep etme</li>
          </ul>
          <p>
            haklarına sahipsiniz. Bu haklarınızı kullanmak için{" "}
            <a href="mailto:info@musteritakip.net">info@musteritakip.net</a>{" "}
            adresinden bize ulaşabilirsiniz.
          </p>

          <h2>7. İletişim</h2>
          <p>Bu Gizlilik Politikası hakkında sorularınız için:</p>
          <p>
            <strong>E-posta:</strong>{" "}
            <a href="mailto:info@musteritakip.net">info@musteritakip.net</a>
            <br />
            <strong>Adres:</strong> İzmir / Türkiye
          </p>

          <h2>8. Değişiklikler</h2>
          <p>
            Bu politika gerektiğinde güncellenebilir. Güncel hali her zaman
            bu sayfada yayınlanır.
          </p>
        </article>
      </div>
    </div>
  );
}

/*
 * ÖNERİLEN EK CSS (styles.css'e eklenmesi gereken, .article içeriği için):
 *
 * .privacy-content h2{font-size:22px;font-weight:800;color:var(--text);margin:36px 0 14px}
 * .privacy-content h2:first-of-type{margin-top:8px}
 * .privacy-content p{margin:0 0 16px;color:#4b5563;line-height:1.75}
 * .privacy-content ul{margin:0 0 20px;padding-left:22px;color:#4b5563;line-height:1.75}
 * .privacy-content li{margin-bottom:8px}
 * .privacy-content strong{color:var(--text)}
 * .privacy-content a{color:var(--purple);font-weight:700;text-decoration:underline}
 */
