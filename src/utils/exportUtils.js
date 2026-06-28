import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { minutesToHHMM } from './otCalculations'

export function exportToExcel(data, filename = 'monthly_report') {
  const rows = data.map((r) => ({
    Employee: r.employeeName,
    Department: r.department,
    'Year-Month': r.yearMonth,
    'Basic Salary': r.basicSalary,
    'Total Work': minutesToHHMM(r.totalWorkMin),
    'Overtime': minutesToHHMM(r.overtimeMin),
    'OT Amount (LKR)': r.otAmount,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportToPDF(data, yearMonth, filename = 'monthly_report') {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(`Monthly OT Report — ${yearMonth}`, 14, 18)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 26)

  autoTable(doc, {
    startY: 32,
    head: [['Employee', 'Dept', 'Basic Salary', 'Total Work', 'Overtime', 'OT Amount']],
    body: data.map((r) => [
      r.employeeName,
      r.department,
      `LKR ${r.basicSalary?.toLocaleString()}`,
      minutesToHHMM(r.totalWorkMin),
      minutesToHHMM(r.overtimeMin),
      `LKR ${r.otAmount?.toFixed(2)}`,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
  })

  doc.save(`${filename}.pdf`)
}
