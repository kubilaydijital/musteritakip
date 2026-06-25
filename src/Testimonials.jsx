import { Link } from 'react-router-dom'
import { SiteHeader, SiteFooter } from './SiteLayout'
import { T, cardStyle, btnPrimary, GLOBAL_CSS, PAGE_MAX } from './theme'

const REFERENCES = [
  { name: 'Dent Clinic', sector: 'Ağız ve Diş Sağlığı Polikliniği', icon: '🦷' },
  { name: 'Arzu Beauty', sector: 'Güzellik Salonu', icon: '💅' },
  { name: 'Çınar', sector: 'Hukuk Bürosu', icon: '⚖️' },
  { name: 'Sinergy', sector: 'Saç & Cilt Kuaförü', icon: '✂️' },
  { name: 'Altınşehir', sector: 'Gayrimenkul', icon: '🏢' },
]

const TESTIMONIALS = [
  {
    quote: 'Önceden hangi müşteriyi aramayı unuttuğumuzu bile bilmiyorduk. Şimdi sistem bize hatırlatıyor, hiçbir potansiyel müşteri elimizden kaçmıyor.',
    name: 'Klinik Sahibi',
    sector: 'Estetik Kliniği',
  },
  {
    quote: 'Randevuya gelmeyen müşterileri takip etmek eskiden kafamızda kalıyordu. Artık panel hepsini gösteriyor, kaç kişiyi geri kazandığımızı görebiliyoruz.',
    name: 'Şube Yöneticisi',
    sector: 'Güzellik Salonu Zinciri',
  },
  {
    quote: 'Hangi reklam kanalından kaç müşteri geldiğini, hangisinin daha çok satışa döndüğünü artık net görüyoruz. Reklam bütçemizi buna göre yönlendiriyoruz.',
    name: 'Pazarlama Sorumlusu',
    sector: 'Saç Ekim Merkezi',
  },
]

export default function Testimonials() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, color: T.text, minHeight: '100vh' }}>
      <style>{GLOBAL_CSS}</style>
      <SiteHeader />

      <section style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '64px 20px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          Bize <span style={{ color: T.primary }}>güvenen işletmeler</span>
        </h1>
        <p style={{ fontSize: 16, color: T.textSoft, maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
          Güzellik salonları, klinikler ve danışmanlık büroları Müşteri Takip ile büyüyor.
        </p>
      </section>

      <section style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '32px 20px 56px' }}>
        <div className="mt-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
          {REFERENCES.map(r => (
            <div key={r.name} style={{ ...cardStyle, padding: '20px 14px', textAlign: 'center' }}>
              <span style={{ fontSize: 26, display: 'block', marginBottom: 10 }}>{r.icon}</span>
              <p style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 3px', color: T.text }}>{r.name}</p>
              <p style={{ fontSize: 11, color: T.textFaint, margin: 0 }}>{r.sector}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '24px 20px 72px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', margin: '0 0 32px' }}>Müşterilerimiz ne diyor?</h2>
        <div className="mt-grid-3" style={{ display: 'grid',
