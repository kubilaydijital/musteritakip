import { CalendarDays, UsersRound, ShoppingCart, Wallet, BellRing, MessageCircle, Megaphone, BarChart3, Settings, Home, UserRound, ClipboardList } from 'lucide-react'

export default function DashboardMock({ compact = false }) {
  const stats = [
    { label: 'Randevu Bugün', value: '24', icon: CalendarDays, color: 'blue' },
    { label: 'Gelen Müşteri Bugün', value: '18', icon: UsersRound, color: 'green' },
    { label: 'Satış Bugün', value: '7', icon: ShoppingCart, color: 'orange' },
    { label: 'Ciro Bugün', value: '12.450 TL', icon: Wallet, color: 'purple' },
  ]
  return (
    <div className={compact ? 'dashboard-mock compact' : 'dashboard-mock'}>
      <aside className="mock-sidebar">
        <div className="mock-brand"><span>M</span><b>MÜŞTERİ<br/>TAKİP</b></div>
        {[
          [Home, 'Genel Bakış'], [CalendarDays, 'Randevular'], [UserRound, 'Müşteriler'], [BellRing, 'Hatırlatmalar'], [BarChart3, 'Raporlar'], [Megaphone, 'Reklam Kaynakları'], [Settings, 'Ayarlar']
        ].map(([Icon, label], i) => (
          <div key={label} className={i === 0 ? 'mock-menu active' : 'mock-menu'}><Icon size={13}/><span>{label}</span></div>
        ))}
      </aside>
      <main className="mock-main">
        <div className="mock-top"><div><h3>Genel Bakış</h3><p>Bu Ay</p></div><span className="mock-select">Tüm şubeler</span></div>
        <div className="mock-stats">
          {stats.map((s) => <div className="mock-card" key={s.label}><s.icon className={s.color} size={18}/><span>{s.label}</span><strong>{s.value}</strong></div>)}
        </div>
        <div className="mock-grid">
          <div className="mock-panel reminder-performance">
            <h4>Hatırlatma Performansı</h4>
            <div className="reminder-mini"><span>1. Hatırlatma <b>14</b><em>1g</em></span><span>2. Hatırlatma <b>30</b><em>+14g</em></span><span>3. Hatırlatma <b>60</b><em>+30g</em></span></div>
          </div>
          <div className="mock-panel recovered"><h4>Geri Kazanılan Müşteri</h4><div className="ring">%32</div></div>
          <div className="mock-panel alerts">
            <h4>Potansiyel Müşteri Uyarıları</h4>
            <p><span className="dot red"></span>3 gündür dönüş yapılmadı <b>12</b></p>
            <p><span className="dot red"></span>Randevuya gelmedi <b>8</b></p>
            <p><span className="dot orange"></span>Satın almadı / ilgileniyor <b>7</b></p>
          </div>
          <div className="mock-panel appointments"><h4>Yakın Randevular</h4><p>11:00 Ayşe Yılmaz</p><p>12:30 Mehmet Demir</p><p>14:00 Elif Kaya</p></div>
        </div>
      </main>
    </div>
  )
}

export function MobileReminderMock() {
  return (
    <div className="phone-mock">
      <div className="phone-notch"></div>
      <h4><BellRing size={16}/> Hatırlatma</h4>
      <div className="phone-item"><MessageCircle size={14}/><span>Randevu aldı, 1g geçti</span><b>Uyarı</b></div>
      <div className="phone-item"><ClipboardList size={14}/><span>Randevuya gelmedi, 3g geçti</span><b>Uyarı</b></div>
      <div className="phone-item"><UsersRound size={14}/><span>Cevap yazıldı, dönüş yok</span><b>Uyarı</b></div>
    </div>
  )
}
