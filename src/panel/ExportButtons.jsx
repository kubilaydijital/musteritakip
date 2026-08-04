import ExcelJS from 'exceljs'
import { Download } from 'lucide-react'
import { T } from './theme'

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportToCsv(rows, filename) {
  if (!rows || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escapeCell = (val) => {
    const str = val == null ? '' : String(val)
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
    return str
  }
  const lines = [headers.map(escapeCell).join(','), ...rows.map(row => headers.map(h => escapeCell(row[h])).join(','))]
  downloadBlob('\uFEFF' + lines.join('\r\n'), filename, 'text/csv;charset=utf-8;')
}

async function exportToExcel(rows, filename, sheetName = 'Veri') {
  if (!rows || rows.length === 0) return
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)
  const headers = Object.keys(rows[0])
  worksheet.columns = headers.map(h => ({ header: h, key: h, width: Math.max(14, h.length + 2) }))
  worksheet.getRow(1).font = { bold: true }
  rows.forEach(row => worksheet.addRow(row))
  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(buffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

export function ExportButtons({ rows, baseFilename, sheetName }) {
  if (!rows || rows.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={() => exportToCsv(rows, `${baseFilename}.csv`)} style={{ fontSize: 12.5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.textSoft, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
        <Download size={13} /> CSV
      </button>
      <button onClick={() => exportToExcel(rows, `${baseFilename}.xlsx`, sheetName)} style={{ fontSize: 12.5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.textSoft, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
        <Download size={13} /> Excel
      </button>
    </div>
  )
}
