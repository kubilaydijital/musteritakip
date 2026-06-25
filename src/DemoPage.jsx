import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

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

const cardSx = { background: 'linear-gradient(180deg,rgba(17,24,42,.86),rgba(8,13,24,.92))', border: '1px solid rgba(255,255,255,.09)', borderRadius: 18, boxShadow: '0 18px 50px rgba(0,0,0,.16)' }

export default function DemoPage() {
  const [activeService, setActiveService] = useState('Hepsi')
  const services = ['Hepsi', 'Lazer epilasyon', 'Bölgesel incelme', 'Cilt işlemleri', 'Kalıcı makyaj']

  const visibleLeads = useMemo(() =>
    activeService === 'Hepsi' ? DEMO_LEADS : DEMO_LEADS.filter(l => l.service === activeService),
    [activeService])

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: '#050914', color: '#f7f7fb', minHeight: '100vh' }}>
      <div style={{ background: '#0b1220', borderBottom: '1px solid rgba(255,255,255,.08)', padding: '14px 24px', textAlign: 'center', fontSize: 14 }}>
        Bu bir demodur — örnek verilerle çalışır, gerçek bir hesaba kayıt yapılmaz.{' '}
        <Link to="/" style={{ color: '#8b5cf6', fontWeight: 600, textDecoration: 'underline' }}>Tanıtım sayfasına dön</Link>
        {' · '}
        <Link to="/giris" style={{ color: '#8b5cf6', fontWeight: 600, textDecoration: 'underline' }}>Giriş yap</Link>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 18, margin: 0, color: '#f7f7fb' }}>Lead takip paneli <span style={{ fontSize: 13, fontWeight: 500, color: '#707b96' }}>(demo)</span></p>
            <p style={{ fontSize: 13, color: '#a5aec3', margin: '2px 0 0' }}>örnek şube · admin görünümü</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <DemoStat label="Toplam lead" value="45" />
          <DemoStat label="Müşteriye dönüşen" value="12" />
          <DemoStat label="Dönüşüm oranı" value="%27" />
          <DemoStat label="Toplam ciro" value="18.800 TL" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          <div style={{ ...cardSx, padding: '20px 22px' }}>
            <p style={{ fontSize: 13, color: '#a5aec3', margin: '0 0 14px', fontWeight: 600 }}>Görüşme sonuçları</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {FUNNEL_STAGES.map(s => (
                <div key={s.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: '#a5aec3' }}>
                    <span>{s.label}</span><span style={{ fontWeight: 700, color: '#f7f7fb' }}>{s.value}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 5, background: 'rgba(255,255,255,.06)' }}>
                    <div style={{ height: '100%', width: `${(s.value / 24) * 100}%`, borderRadius: 5, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...cardSx, padding: '20px 22px' }}>
            <p style={{ fontSize: 13, color: '#a5aec3', margin: '0 0 14px', fontWeight: 600 }}>Hizmete göre filtre</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {services.map(s => (
                <button key={s} onClick={() => setActiveService(s)} style={{
                  fontSize: 12, padding: '7px 14px', borderRadius: 18, cursor: 'pointer',
                  border: activeService === s ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,.09)',
                  background: activeService === s ? '#8b5cf6' : 'transparent',
                  color: activeService === s ? '#fff' : '#a5aec3', fontWeight: 600
                }}>{s}</button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#707b96', margin: '16px 0 0', lineHeight: 1.6 }}>
              Gerçek panelde randevu takvimi, izin yönetimi ve şube bazlı raporlar da bu ekranda yer alır.
            </p>
          </div>
        </div>

        <div>
          <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 10px', color: '#f7f7fb' }}>Kayıtlar</p>
          <div style={{ ...cardSx, padding: '0 20px', overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr 1fr 1.2fr 0.7fr', gap: 8, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: 11, color: '#707b96', minWidth: 600 }}>
              <span>İSİM</span><span>TELEFON</span><span>KANAL</span><span>HİZMET</span><span>SONUÇ</span><span>TUTAR</span>
            </div>
            {visibleLeads.map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr 1fr 1.2fr 0.7fr', gap: 8, padding: '11px 0', borderBottom: i < visibleLeads.length - 1 ? '1px solid rgba(255,255,255,.08)' : 'none', fontSize: 13, alignItems: 'center', minWidth: 600 }}>
                <span style={{ fontWeight: 600, color: '#f7f7fb' }}>{l.name}</span>
                <span style={{ color: '#707b96' }}>{l.phone}</span>
                <span style={{ color: '#a5aec3' }}>{l.channel}</span>
                <span style={{ color: '#a5aec3', fontSize: 12 }}>{l.service}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: RESULT_COLOR[l.result] }}>{l.result}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>{l.amount ? l.amount.toLocaleString('tr-TR') + ' TL' : '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#f7f7fb', margin: '0 0 6px' }}>Kendi şubenle gerçek halini görmek ister misin?</p>
          <p style={{ fontSize: 14, color: '#a5aec3', margin: '0 0 20px' }}>14 gün ücretsiz deneyin, kredi kartı gerekmez.</p>
          <Link to="/deneme" style={{
            border: 0, background: 'linear-gradient(135deg,#6d38ff,#8b5cf6)', boxShadow: '0 16px 36px rgba(139,92,246,.28)',
            borderRadius: 12, padding: '12px 18px', display: 'inline-flex', gap: 10, alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, color: '#fff', textDecoration: 'none'
          }}>Ücretsiz 14 Gün Dene →</Link>
        </div>
      </div>
    </div>
  )
}

function DemoStat({ label, value }) {
  return (
    <div style={{ ...cardSx, padding: '16px 18px' }}>
      <p style={{ fontSize: 12, color: '#707b96', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#f7f7fb' }}>{value}</p>
    </div>
  )
}
