import { reminderRows } from '../data/siteData.js'

export default function ReminderTable() {
  return (
    <div className="reminder-table-wrap">
      <table className="reminder-table">
        <thead><tr><th>Sonuç kategorisi</th><th>1. hatırlatma</th><th>2. hatırlatma</th><th>3. hatırlatma</th><th>Sonrası</th></tr></thead>
        <tbody>
          {reminderRows.map((row) => <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}
