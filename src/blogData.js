// SEO odaklı blog yazıları - randevu bazlı hizmet işletmeleri (güzellik salonu, klinik, kuaför vb.) hedef kitlesine yönelik.

export const BLOG_POSTS = [
  {
    slug: 'randevu-yonetiminde-dijital-donusum',
    title: 'Randevu Yönetiminde Dijital Dönüşüm: Defterden Dijital Sisteme Geçiş',
    excerpt: 'Kağıt defterle randevu takibi yapan işletmeler, müşteri kaybının asıl sebebini göremiyor. Dijital randevu yönetimine geçişin işletmenize sağladığı somut faydaları inceliyoruz.',
    date: '2026-06-10',
    readTime: '6 dk',
    icon: '📅',
    content: [
      { type: 'p', text: 'Güzellik salonları, klinikler ve danışmanlık büroları gibi randevu bazlı çalışan işletmelerin büyük çoğunluğu, randevu takibini hâlâ kağıt defter veya dağınık notlarla yapıyor. Bu yöntem küçük işletme ölçeğinde bir süre işe yarayabilir, ama büyüme hedefleyen her işletme için ciddi bir görünmezlik sorunu yaratır.' },
      { type: 'h2', text: 'Kağıt defterin asıl maliyeti' },
      { type: 'p', text: 'Bir deftere yazılan randevu bilgisi, sadece "o gün ne olacağını" gösterir. Hangi müşterinin daha önce kaç kez randevu aldığını, hangi reklamdan geldiğini, neden satın almadığını defterden çıkarmak pratikte imkansızdır. Oysa bu bilgiler, işletmenin hangi noktada müşteri kaybettiğini anlaması için kritik önemdedir.' },
      { type: 'p', text: 'Reklama harcanan her lira, takip edilmeyen bir müşteri adayıyla birlikte boşa gidiyor. Mesaj geldi ama randevuya dönmedi, randevu verildi ama gelinmedi, geldi ama satın alınmadı — bu üç aşamanın her birinde kaybolan müşteri sayısı, çoğu işletme sahibinin tahmin ettiğinden çok daha yüksektir.' },
      { type: 'h2', text: 'Dijital sistemin somut faydaları' },
      { type: 'p', text: 'Dijital bir randevu ve müşteri takip sistemine geçiş, üç temel alanda doğrudan fayda sağlar:' },
      { type: 'list', items: [
        'Görünürlük: Hangi aşamada kaç müşterinin kaybolduğu anlık olarak görülür.',
        'Hatırlatma: Sistem, takip edilmesi gereken müşterileri otomatik olarak işaretler, hiçbir lead unutulmaz.',
        'Raporlama: Hangi reklam kanalının daha çok satışa dönüştüğü, hangi hizmetin daha kazançlı olduğu net verilerle görülür.',
      ] },
      { type: 'h2', text: 'Geçiş ne kadar zor?' },
      { type: 'p', text: 'Çoğu işletme sahibi, dijital sisteme geçişin karmaşık ve zaman alıcı olacağını düşünür. Oysa doğru tasarlanmış bir sistemde geçiş süreci, mevcut müşteri listesinin aktarılması ve personelin temel ekran kullanımını öğrenmesinden ibarettir — genellikle bir günden kısa sürer.' },
      { type: 'p', text: 'Önemli olan, sistemin işletmenin gerçek iş akışına uygun olması: hizmet listesi özelleştirilebilir olmalı, şube bazlı veri izolasyonu sağlanmalı ve personel izinleri esnek tanımlanabilmelidir. Bu üç unsur sağlandığında, dijital dönüşüm bir yük değil, doğrudan ciro artışı sağlayan bir yatırım haline gelir.' },
    ],
  },
  {
    slug: 'kacan-musterileri-geri-kazanma-yontemleri',
    title: 'Kaçan Müşterileri Geri Kazanmanın 5 Etkili Yolu',
    excerpt: 'Randevuya gelmeyen, satın almayan veya cevap vermeyen müşterileri sistematik olarak geri kazanmak için izlenebilecek pratik adımları paylaşıyoruz.',
    date: '2026-06-17',
    readTime: '7 dk',
    icon: '🔄',
    content: [
      { type: 'p', text: 'Her işletmenin müşteri akışında doğal bir kayıp oranı vardır. Ancak bu kaybın sistematik olarak takip edilip edilmemesi, işletmenin uzun dönem büyümesi açısından büyük fark yaratır. Kaçan müşteriyi geri kazanmak, yeni müşteri kazanmaktan çoğu zaman daha az maliyetli ve daha yüksek dönüşüm oranlıdır.' },
      { type: 'h2', text: '1. Kayıp anını net olarak tanımlayın' },
      { type: 'p', text: 'Bir müşterinin "kaçtığı" an her zaman aynı değildir. Bazı müşteriler mesaj attıktan sonra hiç dönüş yapmaz, bazıları randevu alır ama gelmez, bazıları gelir ama satın almaz. Her aşamanın kendine özgü bir geri kazanım stratejisi gerekir — hepsine aynı mesajı göndermek etkisiz kalır.' },
      { type: 'h2', text: '2. Zamanlamayı doğru yapın' },
      { type: 'p', text: 'Bir müşteriye çok hızlı tekrar ulaşmak (örneğin aynı gün üç kez aramak) rahatsız edici bulunur ve müşteriyi tamamen kaybetmenize yol açabilir. Çok geç ulaşmak ise müşterinin ilgisinin tamamen soğumasına sebep olur. Genel bir kural olarak, ilk hatırlatma 2-3 gün içinde, sonraki hatırlatmalar giderek artan aralıklarla (örneğin 2 hafta, 1 ay) yapılmalıdır.' },
      { type: 'h2', text: '3. Kademeli hatırlatma sistemini benimseyin' },
      { type: 'p', text: 'Aynı müşteriyi sürekli aynı sıklıkla aramak, bir noktadan sonra taciz gibi hissettirir ve marka algınızı zedeler. Kademeli bir sistemde ilk hatırlatma birkaç gün içinde, ikincisi daha uzun bir aralıkla, üçüncüsü ise daha da uzun bir süre sonra yapılır. Belirli bir sayıda hatırlatmadan sonra müşteri "soğuk" kabul edilip listeden çıkarılmalıdır — bu, hem personelinizin zamanını korur hem de müşteri deneyimini olumsuz etkilemez.' },
      { type: 'h2', text: '4. Notları ciddiye alın' },
      { type: 'p', text: 'Bir müşteriyle yapılan her görüşmenin notu, sonraki temas için altın değerinde bilgidir. "Fiyatı yüksek buldu", "tatildeyken tekrar arayacağız dedi" gibi notlar, bir sonraki aramada doğru yaklaşımı belirlemenizi sağlar. Bu notların geçmişe kaydedilip kaybolmaması, geri kazanım oranını doğrudan etkiler.' },
      { type: 'h2', text: '5. Sonucu net kategorilere ayırın' },
      { type: 'p', text: 'Her görüşmeyi "oldu/olmadı" gibi belirsiz şekilde değil, net kategorilere ayırarak kaydedin: randevu aldı, randevuya gelmedi, satın almadı, cevap yazıldı dönüş gelmedi, müşteri oldu. Bu netlik, hangi aşamada ne kadar kayıp olduğunu görmenizi ve buna göre strateji geliştirmenizi sağlar.' },
    ],
  },
  {
    slug: 'hatirlatma-sisteminin-isletmenize-katkilari',
    title: 'Otomatik Hatırlatma Sisteminin İşletmenize Sağladığı Katkılar',
    excerpt: 'Manuel takip yerine otomatik hatırlatma sistemine geçen işletmelerin elde ettiği zaman tasarrufu ve ciro artışını somut örneklerle ele alıyoruz.',
    date: '2026-06-24',
    readTime: '5 dk',
    icon: '🔔',
    content: [
      { type: 'p', text: 'Bir işletmede personel sayısı arttıkça, hangi müşterinin takip edilmesi gerektiğini hatırlamak giderek daha zor bir hale gelir. Otomatik hatırlatma sistemleri, bu insan hafızasına bağımlılığı ortadan kaldırarak işletmenin sistematik bir şekilde büyümesine olanak sağlar.' },
      { type: 'h2', text: 'Zaman tasarrufu' },
      { type: 'p', text: 'Manuel takipte personel, her gün hangi müşteriyi aramak gerektiğini hatırlamak için defterleri veya notları gözden geçirmek zorunda kalır. Otomatik sistemde bu süreç tersine döner: sistem, takip edilmesi gereken müşterileri proaktif olarak gösterir, personel sadece o listeye bakıp aksiyon alır.' },
      { type: 'h2', text: 'Hiçbir leadin unutulmaması' },
      { type: 'p', text: 'İnsan hafızası, özellikle yoğun günlerde güvenilir değildir. Otomatik hatırlatma sistemi, bir müşterinin kaç gündür takip edilmediğini sürekli hesaplar ve belirli bir eşiği geçtiğinde görünür bir uyarı oluşturur. Bu, "unuttum" diye kaybedilen müşteri sayısını pratik olarak sıfıra indirir.' },
      { type: 'h2', text: 'Doğru zamanda doğru aksiyon' },
      { type: 'p', text: 'Hatırlatma sisteminin asıl değeri, sadece "hatırlatması" değil, bunu doğru zamanlamayla yapmasıdır. Örneğin randevuya gelmeyen bir müşteri ile satın almayan bir müşteri farklı zamanlarda ve farklı yaklaşımlarla takip edilmelidir. Sistem bu farkı otomatik olarak yönetirse, personel her müşteriye doğru tonla, doğru zamanda ulaşır.' },
      { type: 'h2', text: 'Ölçülebilir sonuçlar' },
      { type: 'p', text: 'Otomatik sistemle çalışan işletmeler, kaç müşterinin hatırlatma sonrası geri döndüğünü, hangi kategorideki kaybın en yüksek olduğunu net olarak görebilir. Bu veriler, sadece müşteri kazanmak için değil, işletmenin hangi sürecinde iyileştirme yapması gerektiğini anlamak için de kullanılabilir.' },
      { type: 'p', text: 'Sonuç olarak, otomatik hatırlatma sistemi sadece bir hatırlatıcı değil, işletmenin müşteri ilişkilerini sistematik hale getiren ve büyümesini doğrudan destekleyen bir altyapı unsurudur.' },
    ],
  },
]

export function getPostBySlug(slug) {
  return BLOG_POSTS.find(p => p.slug === slug)
}
