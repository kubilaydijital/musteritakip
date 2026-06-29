import Layout from '../components/Layout.jsx'
import teamImage from '../assets/about-team.png'
import usePageMeta from '../usePageMeta.js'

export default function About() {
  usePageMeta('Hakkımızda', 'Müşteri Takip, randevu bazlı çalışan işletmelerin kağıt defter ve unutulan müşteri sorununu çözmek için kuruldu. Hizmet sektörü için geliştirildi.')
  return <Layout><main className="page"><section className="container about-grid"><div><h1>Hizmet sektöründeki işletmeler için geliştirildi.</h1><p>Müşteri Takip, randevu bazlı çalışan işletmelerin kağıt defter, dağınık not ve unutulan müşteri sorunundan doğdu. Amacımız; işletmelerin müşteri sürecini tek ekranda görmesini, potansiyel müşterileri zamanında takip etmesini ve kaçan fırsatları geri kazanmasını sağlamak.</p><div className="about-values"><span>Kolay kullanım</span><span>Güvenli altyapı</span><span>Sürekli gelişim</span></div></div><div className="about-image"><img src={teamImage} alt="Müşteri Takip ekibi" /></div></section><section className="container stats-row"><div><b>1000+</b><span>Aktif işletme hedefi</span></div><div><b>%98</b><span>Müşteri memnuniyeti odağı</span></div><div><b>7/24</b><span>Erişilebilir sistem</span></div></section></main></Layout>
}
