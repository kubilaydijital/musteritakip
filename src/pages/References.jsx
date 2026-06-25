import Layout from '../components/Layout.jsx'
import ReferenceLogo from '../components/ReferenceLogo.jsx'
import { references } from '../data/siteData.js'

export default function References() {
  return <Layout><main className="page"><section className="container page-hero"><span className="page-no">03</span><h1>Bize güvenen işletmeler</h1><p>Farklı sektörlerden işletmeler müşteri takibini daha düzenli hale getirmek için bu sistemi kullanıyor.</p></section><section className="container references-page-grid">{references.map((item) => <ReferenceLogo key={item.name} item={item} large />)}</section><section className="container testimonial-card"><blockquote>"Müşteri takibi artık çok kolay. Kaçan müşterilerimizi geri kazanıyoruz, işimiz çok daha düzenli ilerliyor."</blockquote><div><strong>Müşteri Deneyimi</strong><span>Hizmet sektörü işletmesi</span></div></section></main></Layout>
}
