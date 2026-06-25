import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { T, cardStyle, btnPrimary, GLOBAL_CSS, PAGE_MAX } from './theme'

const RESULT_COLOR = {
  'Randevu aldı': '#1D9E75',
  'Randevuya gelmedi': '#E24B4A',
  'Satın almadı': '#EF9F27',
  'Cevap yazıldı, müşteriden dönüş gelmedi': '#9CA3AF',
  'Müşteri oldu': '#639922',
}

const DEMO_LEADS = [
  { name: 'Selin K.', phone: '+9053•••••12', channel: 'Instagram', service: 'Lazer epilasyon', result: 'Müşteri oldu', amount: 8500 },
  { name: 'Buse A.', phone: '+9054•••••88', channel: 'WhatsApp', service: 'Bölgesel incelme', result: 'Randevu aldı', amount: null },
  { name: 'Merve T.', phone: '+9055•••••34', channel: 'Instagram', service: 'Cilt işlemleri', result: 'Randevuya gelmedi', amount: null },
  { name: 'Ece Y.', phone: '+9053•••••61', channel: 'Instagram', service: 'Kalıcı makyaj', result: 'Müşteri oldu', amount: 4200 },
  { name: 'Zeynep D.', phone: '+9054•••••09', channel: 'WhatsApp', service: 'Lazer epilasyon', result: 'Satın almadı', amount: null },
  { name: 'Ayşe N.', phone: '+9055•••••77', channel: 'Organik', service: 'Bölgesel incelme', result: 'Cevap yazıldı, müşteriden dönüş gelmedi', amount: null },
  { name: 'Gizem S.', phone: '+9053•••••45', channel: 'Instagram', service: 'Cilt işlemleri', result: 'Müşteri oldu', amount: 6100 },
]

const FUNNEL_STAGES = [
  { label: 'Randevu aldı', value: 24, color: '#1D9E75' },
  { label: 'Randevuya gelmedi', value: 5, color: '#E24B4A' },
  { label: 'Satın almadı', value: 4, color: '#EF9F27' },
  { label: 'Müşteri oldu', value: 12, color: '#639922' },
]

export default function DemoPage() {
  const [activeService, setActiveService] = useState('Hepsi')
  const services = ['Hepsi', 'Lazer epilasyon', 'Bölgesel incelme', 'Cilt işlemleri', 'Kalıcı makyaj']

  const visibleLeads = useMemo(() =>
    activeService === 'Hepsi' ? DEMO_LEADS : DEMO_LEADS.filter(l => l.service === activeService),
    [activeService])

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, color: T.text, minHeight: '100vh' }}>
      <style>{GLOBAL_CSS}</style>

      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 24px', textAlign: 'center', fontSize: 14 }}>
        Bu bir demodur — örnek verilerle çalışır, gerçek bir hesaba kayıt yapılmaz.{' '}
        <Link to="/" style={{ color: T.primary, fontWeight: 600, textDecoration: 'underline' }}>Tanıtım sayfasına dön</Link>
        {' · '}
        <Link to="/giris" style={{ color: T.primary, fontWeight: 600, textDecoration: 'underline' }}>Giriş yap</Link>
      </div>

      <div style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 18, margin: 0, color: T.text }}>Lead takip paneli <span style={{ fontSize: 13, fontWeight: 500, color: T.textFaint }}>(demo)</span></p>
            <p style={{ fontSize: 13, color: T.textSoft, margin: '2px 0 0' }}>örnek şube · admin görünümü</p>
          </div>
        </div>

        <div className="mt-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <DemoStat label="Toplam lead" value="45" />
          <DemoStat label="Müşteriye dönüşen" value="12" />
          <DemoStat label="Dönüşüm oranı" value="%27" />
          <DemoStat label="Toplam ciro" value="18.800 TL" />
        </div>

        <div className="mt-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          <div style={{ ...cardStyle, padding: '20px 22px' }}>
            <p style={{ fontSize: 13, color: T.textSoft, margin: '0 0 14px', fontWeight: 600 }}>Görüşme sonuçları</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {FUNNEL_STAGES.map(s => (
                <div key={s.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: T.textSoft }}>
                    <span>{s.label}</span><span style={{ fontWeight: 700, color: T.text }}>{s.value}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 5, background: T.cardSoft }}>
                    <div style={{ height: '100%', width: `${(s.value / 24) * 100}%`, borderRadius: 5, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...cardStyle, padding: '20px 22px' }}>
            <p style={{ fontSize: 13, color: T.textSoft, margin: '0 0 14px', fontWeight: 600 }}>Hizmete göre filtre</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {services.map(s => (
                <button key={s} onClick={() => setActiveService(s)} style={{
                  fontSize: 12, padding: '7px 14px', borderRadius: 18, cursor: 'pointer',
                  border: activeService === s ? `1px solid ${T.primary}` : `1px solid ${T.border}`,
                  background: activeService === s ? T.primary : 'transparent',
                  color: activeService === s ? '#fff' : T.textSoft, fontWeight: 600
                }}>{s}</button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: T.textFaint, margin: '16px 0 0', lineHeight: 1.6 }}>
              Gerçek panelde randevu takvimi, izin yönetimi ve şube bazlı raporlar da bu ekranda yer alır.
            </p>
          </div>
        </div>

        <div>
          <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 10px', color: T.text }}>Kayıtlar</p>
          <div style={{ ...cardStyle, padding: '0 20px', overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr 1fr 1.2fr 0.7fr', gap: 8, padding: '12px 0', borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.textFaint, minWidth: 600 }}>
              <span>İSİM</span><span>TELEFON</span><span>KANAL</span><span>HİZMET</span><span>SONUÇ</span><span>TUTAR</span>
            </div>
            {visibleLeads.map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr 1fr 1.2fr 0.7fr', gap: 8, padding: '11px 0', borderBottom: i < visibleLeads.length - 1 ? `1px solid ${T.border}` : 'none', fontSize: 13, alignItems: 'center', minWidth: 600 }}>
                <span style={{ fontWeight: 600, color: T.text }}>{l.name}</span>
                <span style={{ color: T.textFaint }}>{l.phone}</span>
                <span style={{ color: T.textSoft }}>{l.channel}</span>
                <span style={{ color: T.textSoft, fontSize: 12 }}>{l.service}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: RESULT_COLOR[l.result] }}>{l.result}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.green }}>{l.amount ? l.amount.toLocaleString('tr-TR') + ' TL' : '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, paddingTop: 32, borderTop: `1px solid ${T.border}` }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: '0 0 6px' }}>Kendi şubenle gerçek halini görmek ister misin?</p>
          <p style={{ fontSize: 14, color: T.textSoft, margin: '0 0 20px' }}>14 gün ücretsiz deneyin, kredi kartı gerekmez.</p>
          <Link to="/deneme" className="mt-btn-primary" style={btnPrimary}>Ücretsiz 14 Gün Dene →</Link>
        </div>
      </div>
    </div>
  )
}

function DemoStat({ label, value }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px' }}>
      <p style={{ fontSize: 12, color: T.textFaint, margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: T.text }}>{value}</p>
    </div>
  )
}
