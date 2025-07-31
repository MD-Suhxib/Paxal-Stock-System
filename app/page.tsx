"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Trash2, Upload, Edit, Download, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { addStockToFirestore, deleteStockFromFirestore, updateStockInFirestore } from "@/lib/firestore"
import { getDocs, collection } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface StockItem {
  id: string
  name: string
  image: string
  dateAdded: string
  stockAvailable: number
  stockSold: number
  size: string
  warehouse: number
}

interface WarehouseData {
  [key: string]: StockItem[]
}

const STORAGE_KEY = "paxal-multi-warehouse-data"

export default function PaxalMultiWarehouseSystem() {
  const [currentWarehouse, setCurrentWarehouse] = useState<number>(1)
  const [isLoading, setIsLoading] = useState(true)
  const [warehouseData, setWarehouseData] = useState<WarehouseData>({
    '1': [],
    '2': [],
    '3': [],
    '4': []
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [isExportingSystemPDF, setIsExportingSystemPDF] = useState(false)
  const [isExportingAvailableStock, setIsExportingAvailableStock] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    itemId: string
    itemName: string
  }>({
    isOpen: false,
    itemId: "",
    itemName: "",
  })
  const [detailViewItem, setDetailViewItem] = useState<StockItem | null>(null)
  const [sellQuantity, setSellQuantity] = useState("")
  const [addQuantity, setAddQuantity] = useState("")
  const [newStock, setNewStock] = useState({
    name: "",
    image: "",
    stockAvailable: "",
    size: "",
  })
  const [editStock, setEditStock] = useState({
    id: "",
    name: "",
    image: "",
    stockAvailable: "",
    size: "",
  })

  const getDefaultImage = () => "/placeholder.svg?height=300&width=400&text=No+Image"

  const saveToStorage = (data: WarehouseData) => {
    const storageData = {
      warehouses: data,
      lastUpdated: new Date().toISOString(),
    }
    // Using memory storage only as per Claude.ai requirements
    console.log('Data would be saved to storage:', storageData)
  }

  const loadFromStorage = (): WarehouseData => {
    // Using memory storage only as per Claude.ai requirements
    return { '1': [], '2': [], '3': [], '4': [] }
  }

  // Load data from Firestore for all warehouses
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const warehouseCollections = ['1', '2', '3', '4']
        const allWarehouseData: WarehouseData = { '1': [], '2': [], '3': [], '4': [] }

        // Load data for each warehouse
        for (const warehouseNum of warehouseCollections) {
          try {
            const snapshot = await getDocs(collection(db, `warehouse${warehouseNum}-stocks`))
            const items = snapshot.docs.map((doc) => ({
              ...doc.data() as Omit<StockItem, 'warehouse'>,
              warehouse: parseInt(warehouseNum)
            }))
            allWarehouseData[warehouseNum] = items
          } catch (error) {
            console.error(`Failed to fetch stock from Warehouse ${warehouseNum}:`, error)
            allWarehouseData[warehouseNum] = []
          }
        }

        setWarehouseData(allWarehouseData)
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to initialize warehouses:", error)
        // Fallback to local storage if Firestore fails
        const localData = loadFromStorage()
        setWarehouseData(localData)
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [])

  useEffect(() => {
    if (!isLoading) {
      console.log("Saving updated warehouse data:", warehouseData)
      saveToStorage(warehouseData)
    }
  }, [warehouseData, isLoading])

  const getCurrentStockItems = (): StockItem[] => {
    return warehouseData[currentWarehouse.toString()] || []
  }

  const updateCurrentWarehouseData = (newItems: StockItem[]) => {
    setWarehouseData(prev => ({
      ...prev,
      [currentWarehouse.toString()]: newItems
    }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setNewStock({ ...newStock, image: result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setEditStock({ ...editStock, image: result })
      }
      reader.readAsDataURL(file)
    }
  }

  const exportAvailableStockToPDF = async () => {
  setIsExportingAvailableStock(true)
  
  try {
    // Collect only items with available stock from all warehouses
    const allAvailableItems: Array<StockItem & { warehouseNumber: number }> = []
    
    Object.keys(warehouseData).forEach(warehouseKey => {
      const items = warehouseData[warehouseKey] || []
      items.forEach(item => {
        if (item.stockAvailable > 0) { // Only include items with available stock
          allAvailableItems.push({
            ...item,
            warehouseNumber: parseInt(warehouseKey)
          })
        }
      })
    })

    // Sort by stock name alphabetically
    allAvailableItems.sort((a, b) => a.name.localeCompare(b.name))

    // Calculate totals
    const totalAvailableItems = allAvailableItems.length
    const totalAvailableStock = allAvailableItems.reduce((sum, item) => sum + item.stockAvailable, 0)

    // Create HTML content for available stock PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Paxal Available Stock Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #059669;
              padding-bottom: 20px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #1e293b;
              margin-bottom: 5px;
            }
            .report-title {
              font-size: 18px;
              color: #059669;
              margin-bottom: 10px;
              font-weight: bold;
            }
            .report-date {
              font-size: 14px;
              color: #64748b;
            }
            .summary {
              background-color: #ecfdf5;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 25px;
              border: 1px solid #bbf7d0;
            }
            .summary h3 {
              margin: 0 0 10px 0;
              color: #059669;
              font-size: 16px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-value {
              font-size: 24px;
              font-weight: bold;
              color: #059669;
            }
            .summary-label {
              font-size: 14px;
              color: #064e3b;
              margin-top: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              margin-bottom: 20px;
            }
            th {
              background-color: #10b981;
              color: white;
              padding: 12px 15px;
              text-align: left;
              font-weight: bold;
              font-size: 14px;
            }
            td {
              padding: 12px 15px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 14px;
            }
            tr:nth-child(even) {
              background-color: #f0fdf4;
            }
            tr:hover {
              background-color: #dcfce7;
            }
            .stock-available {
              color: #059669;
              font-weight: 600;
              text-align: right;
            }
            .warehouse-cell {
              text-align: center;
              font-weight: bold;
              color: #1e293b;
              background-color: #f1f5f9;
            }
            .grand-total {
              background-color: #059669 !important;
              color: white !important;
              font-weight: bold;
              font-size: 16px;
            }
            .grand-total td {
              color: white !important;
              font-weight: bold;
              padding: 15px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
            }
            .no-data {
              text-align: center;
              padding: 20px;
              color: #64748b;
              font-style: italic;
              background-color: #f8fafc;
            }
            .available-badge {
              background-color: #dcfce7;
              color: #166534;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">PAXAL MARBLES & GRANITES</div>
            <div class="report-title">📦 Available Stock Inventory Report</div>
            <div class="report-date">Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
          </div>

          <div class="summary">
            <h3>Available Stock Summary</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-value">${totalAvailableItems}</div>
                <div class="summary-label">Items with Available Stock</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${totalAvailableStock}</div>
                <div class="summary-label">Total Available Stock (SQFT)</div>
              </div>
            </div>
          </div>

          ${totalAvailableItems === 0 ? `
            <div class="no-data">
              No available stock found in any warehouse
            </div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th style="width: 8%;">#</th>
                  <th style="width: 10%;">Warehouse</th>
                  <th style="width: 60%;">Stock Name</th>
                  <th style="width: 22%;">Available Stock (SQFT)</th>
                </tr>
              </thead>
              <tbody>
                ${allAvailableItems.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td class="warehouse-cell">${item.warehouseNumber}</td>
                    <td>
                      <strong>${item.name}</strong>
                      <span class="available-badge">✓ In Stock</span>
                    </td>
                    <td class="stock-available">${item.stockAvailable}</td>
                  </tr>
                `).join('')}
                <tr class="grand-total">
                  <td colspan="3" style="text-align: right;">TOTAL AVAILABLE STOCK - ALL WAREHOUSES:</td>
                  <td style="text-align: right;">${totalAvailableStock} SQFT</td>
                </tr>
              </tbody>
            </table>
          `}

          <div class="footer">
            <div>Paxal Marbles & Granites - Available Stock Report - Confidential Document</div>
            <div>Report shows only items with available stock > 0 SQFT</div>
            <div>Report generated automatically on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
          </div>
        </body>
      </html>
    `

    // Convert HTML to PDF using browser's print functionality
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      
      // Wait for content to load
      printWindow.onload = () => {
        // Trigger print dialog which allows saving as PDF
        printWindow.print()
        printWindow.close()
      }
    } else {
      // Fallback: create downloadable HTML file
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Paxal_Available_Stock_Report_${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert('PDF export opened in a new window. If blocked by popup blocker, an HTML file has been downloaded instead. You can open the HTML file and use your browser\'s "Print to PDF" feature.')
    }
  } catch (error) {
    console.error("Error generating available stock PDF:", error)
    alert("Failed to generate available stock PDF. Please try again.")
  } finally {
    setIsExportingAvailableStock(false)
  }
}

  const exportSystemStockToPDF = async () => {
    setIsExportingSystemPDF(true)
    
    try {
      // Collect all stock items from all warehouses
      const allStockItems: Array<StockItem & { warehouseNumber: number }> = []
      
      Object.keys(warehouseData).forEach(warehouseKey => {
        const items = warehouseData[warehouseKey] || []
        items.forEach(item => {
          allStockItems.push({
            ...item,
            warehouseNumber: parseInt(warehouseKey)
          })
        })
      })

      // Sort by warehouse number, then by stock name
      allStockItems.sort((a, b) => {
        if (a.warehouseNumber !== b.warehouseNumber) {
          return a.warehouseNumber - b.warehouseNumber
        }
        return a.name.localeCompare(b.name)
      })

      // Calculate totals
      const totalItems = allStockItems.length
      const totalAvailableStock = allStockItems.reduce((sum, item) => sum + item.stockAvailable, 0)

      // Create HTML content for system-wide PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Paxal System-Wide Stock Report</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #333;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
              }
              .company-name {
                font-size: 24px;
                font-weight: bold;
                color: #1e293b;
                margin-bottom: 5px;
              }
              .report-title {
                font-size: 18px;
                color: #64748b;
                margin-bottom: 10px;
              }
              .report-date {
                font-size: 14px;
                color: #64748b;
              }
              .summary {
                background-color: #f8fafc;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 25px;
                border: 1px solid #e2e8f0;
              }
              .summary h3 {
                margin: 0 0 10px 0;
                color: #1e293b;
                font-size: 16px;
              }
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
              }
              .summary-item {
                text-align: center;
              }
              .summary-value {
                font-size: 24px;
                font-weight: bold;
                color: #1e293b;
              }
              .summary-label {
                font-size: 14px;
                color: #64748b;
                margin-top: 5px;
              }
              .warehouse-section {
                margin-bottom: 30px;
              }
              .warehouse-header {
                background-color: #1e293b;
                color: white;
                padding: 12px 15px;
                margin-bottom: 0;
                font-size: 16px;
                font-weight: bold;
                border-radius: 5px 5px 0 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                margin-bottom: 0;
              }
              th {
                background-color: #475569;
                color: white;
                padding: 12px 15px;
                text-align: left;
                font-weight: bold;
                font-size: 14px;
              }
              td {
                padding: 12px 15px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 14px;
              }
              tr:nth-child(even) {
                background-color: #f8fafc;
              }
              tr:hover {
                background-color: #f1f5f9;
              }
              .stock-available {
                color: #059669;
                font-weight: 600;
                text-align: right;
              }
              .warehouse-total {
                background-color: #e2e8f0 !important;
                font-weight: bold;
                border-top: 2px solid #1e293b;
              }
              .warehouse-total td {
                font-weight: bold;
                color: #1e293b;
              }
              .grand-total {
                background-color: #1e293b !important;
                color: white !important;
                font-weight: bold;
                font-size: 16px;
              }
              .grand-total td {
                color: white !important;
                font-weight: bold;
                padding: 15px;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
                color: #64748b;
                border-top: 1px solid #e2e8f0;
                padding-top: 15px;
              }
              .no-data {
                text-align: center;
                padding: 20px;
                color: #64748b;
                font-style: italic;
                background-color: #f8fafc;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">PAXAL MARBLES & GRANITES</div>
              <div class="report-title">Complete System Stock Overview - All Warehouses</div>
              <div class="report-date">Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
            </div>

            <div class="summary">
              <h3>System-Wide Summary</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-value">${totalItems}</div>
                  <div class="summary-label">Total Stock Items</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${totalAvailableStock}</div>
                  <div class="summary-label">Total Available Stock (SQFT)</div>
                </div>
              </div>
            </div>

            ${totalItems === 0 ? `
              <div class="no-data">
                No stock items found in any warehouse
              </div>
            ` : `
              ${[1, 2, 3, 4].map(warehouseNum => {
                const warehouseItems = allStockItems.filter(item => item.warehouseNumber === warehouseNum)
                const warehouseTotal = warehouseItems.reduce((sum, item) => sum + item.stockAvailable, 0)
                
                return `
                  <div class="warehouse-section">
                    <div class="warehouse-header">
                      Warehouse ${warehouseNum} (${warehouseItems.length} items - ${warehouseTotal} SQFT available)
                    </div>
                    ${warehouseItems.length === 0 ? `
                      <div class="no-data">No stock items in this warehouse</div>
                    ` : `
                      <table>
                        <thead>
                          <tr>
                            <th style="width: 10%;">#</th>
                            <th style="width: 70%;">Stock Name</th>
                            <th style="width: 20%;">Available Stock (SQFT)</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${warehouseItems.map((item, index) => `
                            <tr>
                              <td>${index + 1}</td>
                              <td><strong>${item.name}</strong></td>
                              <td class="stock-available">${item.stockAvailable}</td>
                            </tr>
                          `).join('')}
                          ${warehouseItems.length > 0 ? `
                            <tr class="warehouse-total">
                              <td colspan="2" style="text-align: right; font-weight: bold;">Warehouse ${warehouseNum} Total:</td>
                              <td class="stock-available" style="font-weight: bold;">${warehouseTotal}</td>
                            </tr>
                          ` : ''}
                        </tbody>
                      </table>
                    `}
                  </div>
                `
              }).join('')}
              
              <table style="margin-top: 20px;">
                <tbody>
                  <tr class="grand-total">
                    <td style="text-align: right; width: 80%;">GRAND TOTAL - ALL WAREHOUSES:</td>
                    <td style="text-align: right; width: 20%;">${totalAvailableStock} SQFT</td>
                  </tr>
                </tbody>
              </table>
            `}

            <div class="footer">
              <div>Paxal Marbles & Granites - Complete System Stock Report - Confidential Document</div>
              <div>Report generated automatically on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
            </div>
          </body>
        </html>
      `

      // Convert HTML to PDF using browser's print functionality
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        
        // Wait for content to load
        printWindow.onload = () => {
          // Trigger print dialog which allows saving as PDF
          printWindow.print()
          printWindow.close()
        }
      } else {
        // Fallback: create downloadable HTML file
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Paxal_Complete_System_Stock_Report_${new Date().toISOString().split('T')[0]}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        alert('PDF export opened in a new window. If blocked by popup blocker, an HTML file has been downloaded instead. You can open the HTML file and use your browser\'s "Print to PDF" feature.')
      }
    } catch (error) {
      console.error("Error generating system PDF:", error)
      alert("Failed to generate system PDF. Please try again.")
    } finally {
      setIsExportingSystemPDF(false)
    }
  }

  const exportToPDF = async () => {
    setIsExportingPDF(true)
    const currentItems = getCurrentStockItems()
    
    try {
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Paxal Warehouse ${currentWarehouse} Stock Report</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #333;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
              }
              .company-name {
                font-size: 24px;
                font-weight: bold;
                color: #1e293b;
                margin-bottom: 5px;
              }
              .report-title {
                font-size: 18px;
                color: #64748b;
                margin-bottom: 10px;
              }
              .report-date {
                font-size: 14px;
                color: #64748b;
              }
              .summary {
                background-color: #f8fafc;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 25px;
                border: 1px solid #e2e8f0;
              }
              .summary h3 {
                margin: 0 0 10px 0;
                color: #1e293b;
                font-size: 16px;
              }
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
              }
              .summary-item {
                text-align: center;
              }
              .summary-value {
                font-size: 20px;
                font-weight: bold;
                color: #1e293b;
              }
              .summary-label {
                font-size: 12px;
                color: #64748b;
                margin-top: 2px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              th {
                background-color: #1e293b;
                color: white;
                padding: 12px 8px;
                text-align: left;
                font-weight: bold;
                font-size: 14px;
              }
              td {
                padding: 10px 8px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 13px;
              }
              tr:nth-child(even) {
                background-color: #f8fafc;
              }
              tr:hover {
                background-color: #f1f5f9;
              }
              .stock-available {
                color: #059669;
                font-weight: 600;
              }
              .stock-sold {
                color: #2563eb;
                font-weight: 600;
              }
              .size-badge {
                background-color: #e2e8f0;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
                color: #64748b;
                border-top: 1px solid #e2e8f0;
                padding-top: 15px;
              }
              .no-data {
                text-align: center;
                padding: 40px;
                color: #64748b;
                font-style: italic;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">PAXAL MARBLES & GRANITES</div>
              <div class="report-title">Warehouse ${currentWarehouse} - Stock Management Report</div>
              <div class="report-date">Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
            </div>

            <div class="summary">
              <h3>Summary Statistics</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-value">${currentItems.length}</div>
                  <div class="summary-label">Total Items</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${currentItems.reduce((sum, item) => sum + item.stockAvailable, 0)}</div>
                  <div class="summary-label">Stock Available (SQFT)</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${currentItems.reduce((sum, item) => sum + item.stockSold, 0)}</div>
                  <div class="summary-label">Stock Sold (SQFT)</div>
                </div>
              </div>
            </div>

            ${currentItems.length === 0 ? `
              <div class="no-data">
                No stock items found in Warehouse ${currentWarehouse}
              </div>
            ` : `
              <table>
                <thead>
                  <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 30%;">Stock Name</th>
                    <th style="width: 12%;">Size</th>
                    <th style="width: 15%;">Date Added</th>
                    <th style="width: 15%;">Available (SQFT)</th>
                    <th style="width: 13%;">Sold (SQFT)</th>
                    <th style="width: 10%;">Total (SQFT)</th>
                  </tr>
                </thead>
                <tbody>
                  ${currentItems.map((item, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td><strong>${item.name}</strong></td>
                      <td><span class="size-badge">${item.size}"</span></td>
                      <td>${new Date(item.dateAdded).toLocaleDateString()}</td>
                      <td class="stock-available">${item.stockAvailable}</td>
                      <td class="stock-sold">${item.stockSold}</td>
                      <td><strong>${item.stockAvailable + item.stockSold}</strong></td>
                    </tr>
                  `).join('')}
                  <tr style="background-color: #f1f5f9; border-top: 2px solid #1e293b; font-weight: bold;">
                    <td colspan="4" style="text-align: right; padding-right: 10px;">TOTALS:</td>
                    <td class="stock-available">${currentItems.reduce((sum, item) => sum + item.stockAvailable, 0)}</td>
                    <td class="stock-sold">${currentItems.reduce((sum, item) => sum + item.stockSold, 0)}</td>
                    <td><strong>${currentItems.reduce((sum, item) => sum + item.stockAvailable + item.stockSold, 0)}</strong></td>
                  </tr>
                </tbody>
              </table>
            `}

            <div class="footer">
              <div>Paxal Marbles & Granites - Warehouse ${currentWarehouse} - Confidential Document</div>
              <div>Report generated automatically on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
            </div>
          </body>
        </html>
      `

      // Convert HTML to PDF using browser's print functionality
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        
        // Wait for content to load
        printWindow.onload = () => {
          // Trigger print dialog which allows saving as PDF
          printWindow.print()
          printWindow.close()
        }
      } else {
        // Fallback: create downloadable HTML file
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Paxal_Warehouse${currentWarehouse}_Stock_Report_${new Date().toISOString().split('T')[0]}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        alert('PDF export opened in a new window. If blocked by popup blocker, an HTML file has been downloaded instead. You can open the HTML file and use your browser\'s "Print to PDF" feature.')
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setIsExportingPDF(false)
    }
  }

  const currentItems = getCurrentStockItems()
  const filteredItems = currentItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleWarehouseChange = (warehouseNumber: number) => {
    setCurrentWarehouse(warehouseNumber)
    setSearchQuery("")
    setDetailViewItem(null)
    setIsAddModalOpen(false)
    setIsEditModalOpen(false)
    setDeleteConfirmation({ isOpen: false, itemId: "", itemName: "" })
  }

  const handleAddStock = async () => {
    if (newStock.name && newStock.stockAvailable && newStock.size) {
      const newItem: StockItem = {
        id: `${currentWarehouse}-${Date.now()}`,
        name: newStock.name,
        image: newStock.image || getDefaultImage(),
        dateAdded: new Date().toISOString().split("T")[0],
        stockAvailable: Number.parseInt(newStock.stockAvailable),
        stockSold: 0,
        size: newStock.size,
        warehouse: currentWarehouse,
      }
      
      try {
        // Add to Firestore with warehouse-specific collection
        await addStockToFirestore(newItem, `warehouse${currentWarehouse}-stocks`)
        
        // Update local state
        const updatedItems = [newItem, ...currentItems]
        updateCurrentWarehouseData(updatedItems)
        
        setNewStock({ name: "", image: "", stockAvailable: "", size: "" })
        setIsAddModalOpen(false)
      } catch (error) {
        console.error("Failed to add stock to Firestore:", error)
        alert("Failed to add stock. Please try again.")
      }
    }
  }

  const handleOpenEditModal = (item: StockItem) => {
    setEditStock({
      id: item.id,
      name: item.name,
      image: item.image,
      stockAvailable: item.stockAvailable.toString(),
      size: item.size,
    })
    setIsEditModalOpen(true)
    setDetailViewItem(null)
  }

  const handleUpdateStock = async () => {
    if (editStock.name && editStock.stockAvailable && editStock.size) {
      const updatedItem: StockItem = {
        id: editStock.id,
        name: editStock.name,
        image: editStock.image || getDefaultImage(),
        stockAvailable: Number.parseInt(editStock.stockAvailable),
        size: editStock.size,
        dateAdded: currentItems.find(item => item.id === editStock.id)?.dateAdded || new Date().toISOString().split("T")[0],
        stockSold: currentItems.find(item => item.id === editStock.id)?.stockSold || 0,
        warehouse: currentWarehouse,
      }

      try {
        // Update in Firestore with warehouse-specific collection
        await updateStockInFirestore(updatedItem, `warehouse${currentWarehouse}-stocks`)
        
        // Update local state
        const updatedItems = currentItems.map((item) =>
          item.id === editStock.id ? updatedItem : item
        )
        updateCurrentWarehouseData(updatedItems)
        
        setEditStock({ id: "", name: "", image: "", stockAvailable: "", size: "" })
        setIsEditModalOpen(false)
      } catch (error) {
        console.error("Failed to update stock in Firestore:", error)
        alert("Failed to update stock. Please try again.")
      }
    }
  }
 
  const handleDeleteStock = async (id: string) => {
    try {
      // Delete from Firestore with warehouse-specific collection
      await deleteStockFromFirestore(id, `warehouse${currentWarehouse}-stocks`)
      
      // Update local state
      const updatedItems = currentItems.filter((item) => item.id !== id)
      updateCurrentWarehouseData(updatedItems)
      
      setDeleteConfirmation({ isOpen: false, itemId: "", itemName: "" })
    } catch (error) {
      console.error("Failed to delete stock from Firestore:", error)
      alert("Failed to delete stock. Please try again.")
    }
  }

  const handleSellStock = async () => {
    if (detailViewItem && sellQuantity) {
      const quantity = Number.parseInt(sellQuantity)
      if (quantity > 0 && quantity <= detailViewItem.stockAvailable) {
        const updatedAvailable = detailViewItem.stockAvailable - quantity
        const updatedSold = detailViewItem.stockSold + quantity

        const updatedItem: StockItem = {
          ...detailViewItem,
          stockAvailable: updatedAvailable,
          stockSold: updatedSold,
        }

        try {
          // Update in Firestore with warehouse-specific collection
          await updateStockInFirestore(updatedItem, `warehouse${currentWarehouse}-stocks`)
          
          // Update local state
          const updatedItems = currentItems.map((item) =>
            item.id === detailViewItem.id ? updatedItem : item,
          )
          updateCurrentWarehouseData(updatedItems)
          setSellQuantity("")
          setDetailViewItem(updatedItem)
        } catch (error) {
          console.error("Failed to update stock in Firestore:", error)
          alert("Failed to sell stock. Please try again.")
        }
      }
    }
  }

  const handleAddStockToExisting = async () => {
    if (detailViewItem && addQuantity) {
      const quantity = Number.parseInt(addQuantity)
      if (quantity > 0) {
        const updatedAvailable = detailViewItem.stockAvailable + quantity

        const updatedItem: StockItem = {
          ...detailViewItem,
          stockAvailable: updatedAvailable,
        }

        try {
          // Update in Firestore with warehouse-specific collection
          await updateStockInFirestore(updatedItem, `warehouse${currentWarehouse}-stocks`)
          
          // Update local state
          const updatedItems = currentItems.map((item) =>
            item.id === detailViewItem.id ? updatedItem : item,
          )
          updateCurrentWarehouseData(updatedItems)
          setAddQuantity("")
          setDetailViewItem(updatedItem)
        } catch (error) {
          console.error("Failed to update stock in Firestore:", error)
          alert("Failed to add stock. Please try again.")
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-slate-200 rounded-full animate-spin border-t-slate-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 border-4 border-transparent rounded-full animate-ping border-t-slate-400 mx-auto mt-2 ml-2"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Paxal Marbles & Granites</h2>
            <p className="text-sm sm:text-base text-slate-600">Loading your warehouses...</p>
            <div className="flex justify-center space-x-1 mt-4">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Paxal Marbles & Granites</h1>
                <p className="text-sm sm:text-base text-slate-600 mt-1">Multi-Warehouse Stock Management</p>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  {currentItems.length} Items in Warehouse {currentWarehouse}
                </Badge>
                <Badge variant="outline" className="text-xs sm:text-sm bg-green-50 text-green-700">
                  Data Synced ✓
                </Badge>
              </div>
            </div>
            
            {/* Warehouse Selection Buttons */}
            <div className="flex flex-wrap gap-1 sm:gap-2 justify-center sm:justify-end">
              {[1, 2, 3, 4].map((warehouseNum) => (
                <Button
                  key={warehouseNum}
                  onClick={() => handleWarehouseChange(warehouseNum)}
                  variant={currentWarehouse === warehouseNum ? "default" : "outline"}
                  size="sm"
                  className={`h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm ${
                    currentWarehouse === warehouseNum 
                      ? "bg-slate-800 hover:bg-slate-700" 
                      : "hover:bg-slate-100"
                  }`}
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Warehouse</span>
                  <span className="sm:hidden">WH</span> {warehouseNum}
                  <Badge 
                    variant="secondary" 
                    className="ml-1 sm:ml-2 text-xs bg-slate-100 text-slate-700 px-1"
                  >
                    {warehouseData[warehouseNum.toString()]?.length || 0}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-center gap-2 text-slate-700">
            <Building2 className="h-5 w-5" />
            <span className="text-lg font-semibold">Currently Managing: Warehouse {currentWarehouse}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-3 w-3 sm:h-4 sm:w-4" />
            <Input
              type="text"
              placeholder={`Search stock items in Warehouse ${currentWarehouse}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base lg:text-lg"
            />
          </div>
          <div className="flex flex-col gap-2">
            {/* Main Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={exportToPDF}
                disabled={isExportingPDF}
                className="h-10 sm:h-12 px-4 sm:px-6 bg-green-600 hover:bg-green-700 text-sm sm:text-base flex-1 sm:flex-none"
              >
                {isExportingPDF ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Warehouse {currentWarehouse} to PDF
                  </>
                )}
              </Button>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="h-10 sm:h-12 px-4 sm:px-6 bg-slate-800 hover:bg-slate-700 text-sm sm:text-base flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Stock to Warehouse {currentWarehouse}
              </Button>
            </div>
            
            {/* System-Wide Export Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={exportAvailableStockToPDF}
                disabled={isExportingAvailableStock}
                className="h-8 sm:h-10 px-3 sm:px-4 bg-emerald-500 hover:bg-emerald-600 text-xs sm:text-sm flex-1 sm:flex-none border border-emerald-300"
              >
                {isExportingAvailableStock ? (
                  <>
                    <div className="w-3 h-3 mr-1 sm:mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <span className="mr-1 sm:mr-2">📦</span>
                    Available Stock Only (All Warehouses)
                  </>
                )}
              </Button>
              <Button
                onClick={exportSystemStockToPDF}
                disabled={isExportingSystemPDF}
                className="h-8 sm:h-10 px-3 sm:px-4 bg-slate-600 hover:bg-slate-700 text-xs sm:text-sm flex-1 sm:flex-none border border-slate-400"
              >
                {isExportingSystemPDF ? (
                  <>
                    <div className="w-3 h-3 mr-1 sm:mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Complete System Report (All Warehouses)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <div className="text-slate-400 mb-4">
              <Search className="h-8 w-8 sm:h-12 sm:w-12 mx-auto" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">
              {searchQuery ? "No items found" : `No stock items in Warehouse ${currentWarehouse} yet`}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto">
              {searchQuery
                ? `No items match "${searchQuery}" in Warehouse ${currentWarehouse}. Try a different search term.`
                : `Add your first stock item to Warehouse ${currentWarehouse} to get started.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                onClick={() => setDetailViewItem(item)}
              >
                <CardHeader className="p-0">
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={item.image || getDefaultImage()}
                      alt={item.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 lg:p-4">
                  <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
                    {item.name}
                  </CardTitle>
                  <div className="flex flex-col gap-1 mb-2">
                    <span className="text-xs sm:text-sm text-slate-500">
                      Added {new Date(item.dateAdded).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                      Size: {item.size}"
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs sm:text-sm">
                    <span className="text-green-600 font-medium">Available: {item.stockAvailable} SQFT</span>
                    <span className="text-blue-600 font-medium">Sold: {item.stockSold} SQFT</span>
                  </div>
                </CardContent>
                <CardFooter className="p-2 sm:p-3 lg:p-4 pt-0">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirmation({
                        isOpen: true,
                        itemId: item.id,
                        itemName: item.name,
                      })
                    }}
                    className="w-full text-xs sm:text-sm h-8 sm:h-9"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Add New Stock Item to Warehouse {currentWarehouse}</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Add a new marble or granite item to Warehouse {currentWarehouse} inventory.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="stock-name" className="text-sm sm:text-base">Stock Name *</Label>
                <Input
                  id="stock-name"
                  placeholder="e.g., Carrara White Marble"
                  value={newStock.name}
                  onChange={(e) => setNewStock({ ...newStock, name: e.target.value })}
                  className="text-sm sm:text-base"
                />
              </div>
              <div>
                <Label htmlFor="stock-image" className="text-sm sm:text-base">Image (Optional)</Label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      id="stock-image"
                      placeholder="https://example.com/image.jpg"
                      value={newStock.image.startsWith("data:") ? "" : newStock.image}
                      onChange={(e) => setNewStock({ ...newStock, image: e.target.value })}
                      className="text-sm sm:text-base"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => document.getElementById("file-upload")?.click()}
                      className="shrink-0"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {newStock.image && (
                    <div className="mt-2">
                      <img
                        src={newStock.image}
                        alt="Preview"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded border"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNewStock({ ...newStock, image: "" })}
                        className="mt-1 text-xs"
                      >
                        Remove Image
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">Optional: Enter an image URL or upload a file. A default image will be used if none is provided.</p>
                </div>
              </div>
              <div>
                <Label htmlFor="stock-available" className="text-sm sm:text-base">Stock Available (SQFT) *</Label>
                <Input
                  id="stock-available"
                  type="number"
                  placeholder="0"
                  value={newStock.stockAvailable}
                  onChange={(e) => setNewStock({ ...newStock, stockAvailable: e.target.value })}
                  className="text-sm sm:text-base"
                />
              </div>
              <div>
                <Label htmlFor="stock-size" className="text-sm sm:text-base">Size/Thickness *</Label>
                <Input
                  id="stock-size"
                  placeholder="e.g., 2/3, 3/4, 1/2"
                  value={newStock.size}
                  onChange={(e) => setNewStock({ ...newStock, size: e.target.value })}
                  className="text-sm sm:text-base"
                />
                <p className="text-xs text-slate-500 mt-1">Enter the thickness or size specification (e.g., 2/3", 3/4")</p>
              </div>
            </div>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="text-sm sm:text-base">
                Cancel
              </Button>
              <Button
                onClick={handleAddStock}
                disabled={!newStock.name || !newStock.stockAvailable || !newStock.size}
                className="bg-slate-800 hover:bg-slate-700 text-sm sm:text-base"
              >
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Edit Stock Item in Warehouse {currentWarehouse}</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Update the details of this marble or granite item in Warehouse {currentWarehouse}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-stock-name" className="text-sm sm:text-base">Stock Name *</Label>
                <Input
                  id="edit-stock-name"
                  placeholder="e.g., Carrara White Marble"
                  value={editStock.name}
                  onChange={(e) => setEditStock({ ...editStock, name: e.target.value })}
                  className="text-sm sm:text-base"
                />
              </div>
              <div>
                <Label htmlFor="edit-stock-image" className="text-sm sm:text-base">Image (Optional)</Label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      id="edit-stock-image"
                      placeholder="https://example.com/image.jpg"
                      value={editStock.image.startsWith("data:") ? "" : editStock.image}
                      onChange={(e) => setEditStock({ ...editStock, image: e.target.value })}
                      className="text-sm sm:text-base"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => document.getElementById("edit-file-upload")?.click()}
                      className="shrink-0"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <input
                    id="edit-file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleEditFileUpload}
                    className="hidden"
                  />
                  {editStock.image && (
                    <div className="mt-2">
                      <img
                        src={editStock.image}
                        alt="Preview"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded border"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditStock({ ...editStock, image: "" })}
                        className="mt-1 text-xs"
                      >
                        Remove Image
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">Optional: Enter an image URL or upload a file. Leave empty to keep current image.</p>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-stock-available" className="text-sm sm:text-base">Stock Available (SQFT) *</Label>
                <Input
                  id="edit-stock-available"
                  type="number"
                  placeholder="0"
                  value={editStock.stockAvailable}
                  onChange={(e) => setEditStock({ ...editStock, stockAvailable: e.target.value })}
                  className="text-sm sm:text-base"
                />
              </div>
              <div>
                <Label htmlFor="edit-stock-size" className="text-sm sm:text-base">Size/Thickness *</Label>
                <Input
                  id="edit-stock-size"
                  placeholder="e.g., 2/3, 3/4, 1/2"
                  value={editStock.size}
                  onChange={(e) => setEditStock({ ...editStock, size: e.target.value })}
                  className="text-sm sm:text-base"
                />
                <p className="text-xs text-slate-500 mt-1">Enter the thickness or size specification (e.g., 2/3", 3/4")</p>
              </div>
            </div>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="text-sm sm:text-base">
                Cancel
              </Button>
              <Button
                onClick={handleUpdateStock}
                disabled={!editStock.name || !editStock.stockAvailable || !editStock.size}
                className="bg-slate-800 hover:bg-slate-700 text-sm sm:text-base"
              >
                Update Stock Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={deleteConfirmation.isOpen}
          onOpenChange={(open) => setDeleteConfirmation({ ...deleteConfirmation, isOpen: open })}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Confirm Delete</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Are you sure you want to delete {deleteConfirmation.itemName} from Warehouse {currentWarehouse}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmation({ isOpen: false, itemId: "", itemName: "" })}
                className="text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteStock(deleteConfirmation.itemId)}
                className="text-sm sm:text-base"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!detailViewItem} onOpenChange={(open) => !open && setDetailViewItem(null)}>
          <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">{detailViewItem?.name}</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Manage stock details for this item in Warehouse {currentWarehouse}
              </DialogDescription>
            </DialogHeader>
            {detailViewItem && (
              <div className="space-y-4">
                <div className="aspect-[4/3] overflow-hidden bg-slate-100 rounded">
                  <img
                    src={detailViewItem.image || getDefaultImage()}
                    alt={detailViewItem.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm sm:text-base">Size</Label>
                    <p className="text-lg font-semibold">{detailViewItem.size}"</p>
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">Available Stock</Label>
                    <p className="text-lg font-semibold text-green-600">{detailViewItem.stockAvailable} SQFT</p>
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">Sold</Label>
                    <p className="text-lg font-semibold text-blue-600">{detailViewItem.stockSold} SQFT</p>
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">Date Added</Label>
                    <p className="text-lg font-semibold">{new Date(detailViewItem.dateAdded).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="sell-quantity" className="text-sm sm:text-base">Sell Stock (SQFT)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sell-quantity"
                        type="number"
                        placeholder="Enter quantity to sell"
                        value={sellQuantity}
                        onChange={(e) => setSellQuantity(e.target.value)}
                        className="text-sm sm:text-base"
                      />
                      <Button
                        onClick={handleSellStock}
                        disabled={
                          !sellQuantity ||
                          Number.parseInt(sellQuantity) <= 0 ||
                          Number.parseInt(sellQuantity) > detailViewItem.stockAvailable
                        }
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Sell
                      </Button>
                    </div>
                    {sellQuantity && Number.parseInt(sellQuantity) > detailViewItem.stockAvailable && (
                      <p className="text-xs text-red-500 mt-1">
                        Cannot sell more than available stock ({detailViewItem.stockAvailable} SQFT)
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="add-quantity" className="text-sm sm:text-base">Add Stock (SQFT)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="add-quantity"
                        type="number"
                        placeholder="Enter quantity to add"
                        value={addQuantity}
                        onChange={(e) => setAddQuantity(e.target.value)}
                        className="text-sm sm:text-base"
                      />
                      <Button
                        onClick={handleAddStockToExisting}
                        disabled={!addQuantity || Number.parseInt(addQuantity) <= 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => handleOpenEditModal(detailViewItem)}
                    className="w-full bg-slate-800 hover:bg-slate-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Item Details
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailViewItem(null)} className="text-sm sm:text-base">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}