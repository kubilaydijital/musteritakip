import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

const DEMO_RESULTS = ['Randevu aldı', 'Randevuya gelmedi', 'Satın almadı', 'Cevap yazıldı, müşteriden dönüş gelmedi', 'Müşteri oldu']
const RESULT_COLOR = { 'Randevu aldı': '#0F6E56', 'Randevuya gelmedi': '#A32D2D', 'Satın almadı': '#854F0B', 'Cevap yazıldı, müşteriden dönüş gelmedi': '#6B6B6B', 'Müşteri oldu': '#3B6D11' }

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
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#FAFAF7', minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ background: '#1a2744', color: '#fff', padding: '14px 24px', textAlign: 'center', fontSize: 14 }}>
        Bu bir demodur — örnek verilerle çalışır, gerçek bir hesaba kayıt yapılmaz.{' '}
        <Link to="/" style={{ color: '#C9A05C', fontWeight: 600, textDecoration: 'underline' }}>Tanıtım sayfasına dön</Link>
        {' · '}
        <Link to="/giris" style={{ color: '#C9A05C', fontWeight: 600, textDecoration: 'underline' }}>Giriş yap</Link>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 18, margin: 0, color: '#1a2744' }}>Lead takip paneli <span style={{ fontSize: 13, fontWeight: 500, color: '#9aa0ad' }}>(demo)</span></p>
            <p style={{ fontSize: 13, color: '#666', margin: '2px 0 0' }}>örnek şube · admin görünümü</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <DemoStat label="Toplam lead" value="45" />
          <DemoStat label="Müşteriye dönüşen" value="12" />
          <DemoStat label="Dönüşüm oranı" value="%27" />
          <DemoStat label="Toplam ciro" value="18.800 TL" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          <div style={{ background: '#fff', border: '1px solid #ECE8DC', borderRadius: 14, padding: '20px 22px' }}>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 14px', fontWeight: 600 }}>Görüşme sonuçları</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {FUNNEL_STAGES.map(s => (
                <div key={s.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span>{s.label}</span><span style={{ fontWeight: 700 }}>{s.value}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 5, background: '#F0EEE6' }}>
                    <div style={{ height: '100%', width: `${(s.value / 24) * 100}%`, borderRadius: 5, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #ECE8DC', borderRadius: 14, padding: '20px 22px' }}>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 14px', fontWeight: 600 }}>Hizmete göre filtre</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {services.map(s => (
                <button key={s} onClick={() => setActiveService(s)} style={{
                  fontSize: 12, padding: '7px 14px', borderRadius: 18, cursor: 'pointer',
                  border: activeService === s ? '1px solid #1a2744' : '1px solid #ECE8DC',
                  background: activeService === s ? '#1a2744' : '#fff',
                  color: activeService === s ? '#fff' : '#5B6270', fontWeight: 600
                }}>{s}</button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#9aa0ad', margin: '16px 0 0', lineHeight: 1.6 }}>
              Gerçek panelde randevu takvimi, izin yönetimi ve şube bazlı raporlar da bu ekranda yer alır.
            </p>
          </div>
        </div>

        <div>
          <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 10px', color: '#1a2744' }}>Kayıtlar</p>
          <div style={{ background: '#fff', border: '1px solid #ECE8DC', borderRadius: 14, padding: '0 20px', overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr 1fr 1.2fr 0.7fr', gap: 8, padding: '12px 0', borderBottom: '1px solid #ECE8DC', fontSize: 11, color: '#9aa0ad', minWidth: 600 }}>
              <span>İSİM</span><span>TELEFON</span><span>KANAL</span><span>HİZMET</span><span>SONUÇ</span><span>TUTAR</span>
            </div>
            {visibleLeads.map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr 1fr 1.2fr 0.7fr', gap: 8, padding: '11px 0', borderBottom: i < visibleLeads.length - 1 ? '1px solid #F4F2EA' : 'none', fontSize: 13, alignItems: 'center', minWidth: 600 }}>
                <span style={{ fontWeight: 600 }}>{l.name}</span>
                <span style={{ color: '#9aa0ad' }}>{l.phone}</span>
                <span>{l.channel}</span>
                <span style={{ color: '#5B6270', fontSize: 12 }}>{l.service}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: RESULT_COLOR[l.result] }}>{l.result}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2e7d32' }}>{l.amount ? l.amount.toLocaleString('tr-TR') + ' TL' : '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, paddingTop: 32, borderTop: '1px solid #ECE8DC' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1a2744', margin: '0 0 6px' }}>Kendi şubenle gerçek halini görmek ister misin?</p>
          <p style={{ fontSize: 14, color: '#5B6270', margin: '0 0 20px' }}>Sorularınız için doğrudan yazabilirsiniz.</p>
          <Link to="/" style={{
            background: '#1a2744', color: '#fff', borderRadius: 10, padding: '12px 26px',
            fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block'
          }}>Tanıtım sayfasına dön</Link>
        </div>
      </div>
    </div>
  )
}

function DemoStat({ label, value }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ECE8DC', borderRadius: 12, padding: '16px 18px' }}>
      <p style={{ fontSize: 12, color: '#9aa0ad', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#1a2744' }}>{value}</p>
    </div>
  )
}
