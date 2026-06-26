import { reminderRows } from '../data/siteData.js'

const HEADERS = ['Sonuç kategorisi', '1. hatırlatma', '2. hatırlatma', '3. hatırlatma', 'Sonrası']

export default function ReminderTable() {
  return (
    <div className="reminder-table-wrap">
      <table className="reminder-table">
        <thead>
          <tr>
            {HEADERS.map((h) => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {reminderRows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => <td key={i} data-label={HEADERS[i]}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
