// lib/pdfUtils.js
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

/**
 * Generate a structured PDF for a specific warehouse
 * @param {string} warehouseName - eg. "Warehouse 1"
 * @param {Array} stockItems - array of stock items for that warehouse
 */
export function exportWarehouseToPDF(warehouseName, stockItems) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(16)
  doc.text(`${warehouseName} Stock Report`, 14, 20)

  // Column headers
  const tableColumn = ["Name", "Date Added", "Size", "Available", "Sold"]

  // Row data
  const tableRows = stockItems.map(item => [
    item.name || "—",
    item.dateAdded || "—",
    item.size || "—",
    item.stockAvailable || 0,
    item.stockSold || 0
  ])

  // Create the table
  autoTable(doc, {
    startY: 30,
    head: [tableColumn],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], textColor: 255 }, // Blue header
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 14, right: 14 }
  })

  // Download the file
  doc.save(`${warehouseName.replace(/\s+/g, "_")}_Stock_Report.pdf`)
}
