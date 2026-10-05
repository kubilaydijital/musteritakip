import { T } from './theme.js'
import { FOLLOW_UP_PERFORMANCE_PERIODS } from '../lib/followUpPerformance.js'

const labels = { open: 'Açık takip', overdue: 'Geciken', today: 'Bugün', contacted: 'Sonuç girilen' }
const statuses = { inactive: 'Pasif / süresi dolmuş', unavailable: 'Profil bilgisi yok', moved: 'Önceki şube' }
const formatTime = value => new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const buttonStyle = { font: 'inherit', cursor: 'pointer', borderRadius: 7, padding: '6px 10px', border: `1px solid ${T.border}`, background: '#fff', fontSize: 12, fontWeight: 700 }

export function FollowUpPerformance({ report, period, onPeriodChange, branchName, showBranch, onInspect, inspection }) {
  return <section aria-label="Personel takip performansı" style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
    <style>{`
      .mt-followup-performance { width:100%; border-collapse:collapse; font-size:12.5px; }
      .mt-followup-performance th, .mt-followup-performance td { padding:11px 8px; border-bottom:1px solid ${T.border}; text-align:left; }
      .mt-followup-performance thead th { font-size:11.5px; color:${T.textSoft}; font-weight:600; }
      .mt-followup-performance .mt-followup-metric { text-align:center; }
      .mt-followup-performance tbody th { font-weight:700; min-width:120px; overflow-wrap:anywhere; }
      .mt-followup-performance .mt-followup-mobile-label { display:none; }
      @media(max-width:650px) {
        .mt-followup-performance thead { display:none; }
        .mt-followup-performance tbody { display:grid; gap:12px; }
        .mt-followup-performance tr { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); border:1px solid ${T.border}; border-radius:10px; padding:10px; }
        .mt-followup-performance tbody th { grid-column:1/-1; border:0; padding:2px 0 9px; }
        .mt-followup-performance td { border:0; padding:5px 0; min-width:0; }
        .mt-followup-performance .mt-followup-metric { display:flex; justify-content:space-between; align-items:center; gap:6px; text-align:left; }
        .mt-followup-performance .mt-followup-metric:nth-of-type(odd) { padding-right:10px; }
        .mt-followup-performance .mt-followup-mobile-label { display:inline; color:${T.textSoft}; font-size:11.5px; }
        .mt-followup-performance .mt-followup-last-result { grid-column:1/-1; color:${T.textSoft}; font-size:11.5px; padding-top:8px; }
      }
    `}</style>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div><h2 style={{ fontSize: 16, margin: '0 0 4px', color: T.text }}>Personel takip performansı</h2><p style={{ fontSize: 12.5, color: T.textSoft, margin: 0 }}>İş kimde bekliyor, kim sonuç giriyor?</p></div>
      <label style={{ fontSize: 12, color: T.textSoft }}>Sonuç dönemi <select aria-label="Personel performansı dönemi" value={period} onChange={event => onPeriodChange(event.target.value)} style={{ ...buttonStyle, marginLeft: 6, color: T.text }}>{FOLLOW_UP_PERFORMANCE_PERIODS.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
    </div>
    <p style={{ color: T.textSoft, fontSize: 12, lineHeight: 1.5, margin: '12px 0' }}>Açık, geciken ve bugünkü takipler güncel iş yüküdür. Sonuç girilen takipler: <strong>{report.range.label}</strong>. Sayılara tıklayarak ilgili danışanları aşağıda açabilirsiniz.</p>
    {report.unassigned > 0 && <p style={{ padding: '8px 10px', borderRadius: 8, background: T.orangeBg, color: T.orange, fontSize: 12.5, margin: '0 0 10px' }}><strong>{report.unassigned} açık takibin sorumlusu yok.</strong> “Sorumlu atanmamış” satırından açıp personel atayın.</p>}
    {report.rows.length === 0 ? <p style={{ fontSize: 13, color: T.textSoft }}>Bu şubede gösterilecek personel veya takip kaydı yok.</p> : <table className="mt-followup-performance">
      <thead><tr><th scope="col">Personel{showBranch && ' / şube'}</th>{Object.entries(labels).map(([key, label]) => <th className="mt-followup-metric" key={key} scope="col">{label}</th>)}<th scope="col">Son sonuç kaydı</th></tr></thead>
      <tbody>{report.rows.map(row => <tr key={row.key}>
        <th scope="row"><span>{row.name}</span>{showBranch && <span style={{ display: 'block', color: T.textSoft, fontSize: 11.5, fontWeight: 400, marginTop: 3 }}>{branchName(row.branchId)}</span>}{statuses[row.status] && <span style={{ display: 'block', color: T.orange, fontSize: 11, fontWeight: 400, marginTop: 3 }}>{statuses[row.status]}</span>}</th>
        {Object.entries(labels).map(([metric, label]) => <td key={metric} className="mt-followup-metric"><span className="mt-followup-mobile-label" aria-hidden="true">{label}</span><button type="button" aria-label={`${row.name}${showBranch ? ` · ${branchName(row.branchId)}` : ''}: ${label} ${row[metric]}`} aria-pressed={inspection?.rowKey === row.key && inspection.metric === metric} disabled={!row[metric]} onClick={() => onInspect(row.key, metric)} style={{ ...buttonStyle, minWidth: 34, color: metric === 'overdue' && row.overdue ? T.red : metric === 'contacted' ? T.green : T.text, borderColor: inspection?.rowKey === row.key && inspection.metric === metric ? T.primary : T.border, background: inspection?.rowKey === row.key && inspection.metric === metric ? T.primaryLight : '#fff', opacity: row[metric] ? 1 : .55, cursor: row[metric] ? 'pointer' : 'default' }}>{row[metric]}</button></td>)}
        <td className="mt-followup-last-result"><span className="mt-followup-mobile-label" aria-hidden="true">Son sonuç kaydı: </span>{row.lastContactAt ? formatTime(row.lastContactAt) : '—'}</td>
      </tr>)}</tbody>
    </table>}
    <p style={{ color: T.textSoft, fontSize: 11.5, lineHeight: 1.5, margin: '12px 0 0' }}>Sonuç, Takip Merkezi’nde “Takip sonucu” kaydını yapan personele yazılır. Aynı danışan bir personel için bu dönemde bir kez sayılır; planlama ve kapatma bu sayıya eklenmez. Kayıtlar Güncelleme 3’ten itibaren tutulur.</p>
    {report.contactEvents === 0 && <p style={{ color: T.textSoft, fontSize: 12, margin: '8px 0 0' }}>Seçili dönemde henüz takip sonucu kaydı yok.</p>}
  </section>
}
