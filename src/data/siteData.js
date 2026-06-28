import {
  CalendarDays, BellRing, UsersRound, Target, BarChart3, Megaphone,
  FileClock, ShieldCheck, UserCog, Building2, Scale, Scissors, SmilePlus
} from 'lucide-react'

export const EMAIL = 'info@musteritakip.net'
export const LOCATION = 'İzmir / Türkiye'

export const navItems = [
  { to: '/', label: 'Ana Sayfa' },
  { to: '/ozellikler', label: 'Özellikler' },
  { to: '/referanslar', label: 'Referanslar' },
  { to: '/hakkimizda', label: 'Hakkımızda' },
  { to: '/blog', label: 'Blog' },
  { to: '/iletisim', label: 'İletişim' },
]

export const references = [
  { name: 'ALTINŞEHİR', sub: 'GAYRİMENKUL', icon: Building2 },
  { name: 'DENT CLINIC', sub: 'DİŞ KLİNİĞİ', icon: SmilePlus },
  { name: 'ÇINAR', sub: 'HUKUK BÜROSU', icon: Scale },
  { name: 'SINERGY', sub: 'BAYAN KUAFÖRÜ', icon: Scissors },
]

export const features = [
  { icon: CalendarDays, title: 'Akıllı Randevu Yönetimi', desc: 'Tüm randevuları tek takvimde görün, çakışmaları ve iptalleri daha kolay yönetin.' },
  { icon: BellRing, title: 'Hatırlatma Uyarıları', desc: 'Sonuç kategorisine göre 1., 2. ve 3. hatırlatma zamanı geldiğinde sistem sizi uyarır.' },
  { icon: UsersRound, title: 'Müşteri Takibi', desc: 'Her müşterinin süreci, notları, randevuları ve geçmiş işlemleri tek ekranda tutulur.' },
  { icon: Target, title: 'Potansiyel Müşteri Uyarıları', desc: 'Kayıtlarda yer alan potansiyel müşteriler için zamanında uyarılar alın.' },
  { icon: Megaphone, title: 'Reklam Kaynak Takibi', desc: 'Müşterinin hangi kanaldan geldiğini ve hangi kaynağın satışa döndüğünü görün.' },
  { icon: BarChart3, title: 'Raporlar & Analiz', desc: 'Randevu, gelen müşteri, satış, ciro ve kaynak performansını anlık takip edin.' },
  { icon: FileClock, title: 'Notlar & Geçmiş Kayıtlar', desc: 'Görüşme notları ve geçmiş süreçler kaybolmaz, her ekip üyesi doğru bilgiye ulaşır.' },
  { icon: UserCog, title: 'Ekip Yönetimi', desc: 'Danışmanları ve süreçleri tek yerden takip ederek performans görünürlüğü kazanın.' },
  { icon: ShieldCheck, title: 'Güvenli Altyapı', desc: 'Verilerinizi düzenli, güvenli ve erişilebilir bir sistem üzerinde saklayın.' },
]

export const reminderRows = [
  ['Randevu aldı (randevu geçti)', '1g', '+14g (~15g)', '+30g (~45g)', 'Soğuk'],
  ['Randevuya gelmedi', '3g', '+14g (~17g)', '+30g (~47g)', 'Soğuk'],
  ['Cevap yazıldı, müşteriden dönüş gelmedi', '3g', '+14g (~17g)', '+30g (~47g)', 'Soğuk'],
  ['Satın almadı', '15g', '+30g (~45g)', '+60g (~105g)', 'Soğuk'],
  ['Müşteri oldu', 'takip yok', '—', '—', '—'],
]

export const blogPosts = [
  {
    slug: 'randevu-yonetiminde-dijital-donusum',
    title: 'Randevu Yönetiminde Dijital Dönüşüm',
    excerpt: 'Kağıt defterle çalışan işletmeler müşteri kaybını çoğu zaman göremez. Dijital takip sistemi bu görünmezliği ortadan kaldırır.',
    date: '10 Haziran 2026',
    read: '6 dk',
    image: '📅',
    content: [
      'Randevu bazlı çalışan işletmelerde müşteri sürecinin dağılması çok kolaydır. Bir müşteri Instagram\u2019dan gelir, bir başkası tavsiyeyle ulaşır, biri randevu alır ama gelmez, diğeri dönüş bekler ve unutulur.',
      'Kağıt defter yalnızca o günkü randevuyu gösterir. Müşterinin hangi reklamdan geldiğini, neden satın almadığını, kaç gündür aranmadığını ve kimin ilgilendiğini net göstermez.',
      'Dijital sisteme geçişin asıl değeri burada başlar. İşletme artık sadece kayıt tutmaz; hangi aşamada müşteri kaybettiğini, hangi kaynağın satışa döndüğünü ve hangi müşteriye tekrar ulaşılması gerektiğini görür.'
    ]
  },
  {
    slug: 'kacan-musterileri-geri-kazanma',
    title: 'Kaçan Müşterileri Geri Kazanmanın Yolu',
    excerpt: 'Randevuya gelmeyen, cevap vermeyen veya satın almayan müşterileri doğru zamanda takip etmek işletmeye doğrudan kazanç sağlar.',
    date: '17 Haziran 2026',
    read: '7 dk',
    image: '🔄',
    content: [
      'Kaçan müşteri her zaman kaybedilmiş müşteri değildir. Çoğu zaman sadece doğru zamanda tekrar temas edilmemiş müşteridir.',
      'Bu yüzden takip sistemi sonuca göre çalışmalıdır. Randevu aldı ama randevusu geçtiyse 1 gün sonra, randevuya gelmediyse 3 gün sonra, cevap yazıldı ama dönüş olmadıysa 3 gün sonra, satın almadıysa 15 gün sonra uyarı vermelidir.',
      'Üç hatırlatma sonrasında müşteri soğuk kabul edilir. Böylece ekip hem doğru kişiye odaklanır hem de gereksiz aramalarla zaman kaybetmez.'
    ]
  },
  {
    slug: 'hatirlatma-sisteminin-katkilari',
    title: 'Hatırlatma Sisteminin İşletmeye Katkıları',
    excerpt: 'Sistem unutmaz. Doğru zamanda doğru müşteriyi ekibin önüne getirir ve potansiyel müşteri kaybını azaltır.',
    date: '24 Haziran 2026',
    read: '5 dk',
    image: '🔔',
    content: [
      'Yoğun çalışan hizmet işletmelerinde insan hafızasına güvenmek risklidir. Randevular, aramalar, notlar ve dönüş bekleyen müşteriler kısa sürede karışır.',
      'Hatırlatma sistemi bu karmaşayı azaltır. Personel her sabah kimi araması gerektiğini düşünmek yerine sistemin verdiği uyarılara bakar.',
      'Bu yapı işletmeye zaman kazandırır, müşteri deneyimini düzenler ve reklamdan gelen potansiyel müşterilerin daha verimli takip edilmesini sağlar.'
    ]
  }
]
