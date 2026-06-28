import Layout from '../components/Layout.jsx'
import ReferenceLogo from '../components/ReferenceLogo.jsx'
import { references, testimonials } from '../data/siteData.js'
import usePageMeta from '../usePageMeta.js'

export default function References() {
  usePageMeta('Referanslar', 'Güzellik salonları, klinikler, hukuk büroları ve gayrimenkul firmaları Müşteri Takip ile randevu ve müşteri süreçlerini düzenliyor.')
  return <Layout><main className="page"><section className="container page-hero"><span className="page-no">03</span><h1>Bize güvenen işletmeler</h1><p>Farklı sektörlerden işletmeler müşteri takibini daha düzenli hale getirmek için bu sistemi kullanıyor.</p></section><section className="container references-page-grid">{references.map((item) => <ReferenceLogo key={item.name} item={item} large />)}</section><section className="container testimonial-grid">{testimonials.map((t, i) => <div className="testimonial-card" key={i}><blockquote>"{t.quote}"</blockquote><div><strong>{t.name}</strong><span>{t.role}</span></div></div>)}</section></main></Layout>
}
