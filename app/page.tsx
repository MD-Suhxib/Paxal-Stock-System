"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Trash2, Upload, Edit, Download } from "lucide-react"
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
  price: number
  dateAdded: string
  stockAvailable: number
  stockSold: number
  size: string
}

const STORAGE_KEY = "paxal-stock-data"

export default function PaxalStockManagement() {
  const [isLoading, setIsLoading] = useState(true)
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
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
    price: "",
    stockAvailable: "",
    size: "",
  })
  const [editStock, setEditStock] = useState({
    id: "",
    name: "",
    image: "",
    price: "",
    stockAvailable: "",
    size: "",
  })

  const getDefaultImage = () => "/placeholder.svg?height=300&width=400&text=No+Image"

  const saveToStorage = (items: StockItem[]) => {
    const storageData = {
      items,
      lastUpdated: new Date().toISOString(),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData))
      console.log('Data saved to localStorage:', storageData)
    } catch (error) {
      console.error('Error saving to localStorage:', error)
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(storageData))
        console.log('Data saved to sessionStorage as fallback')
      } catch (sessionError) {
        console.error('Error saving to sessionStorage:', sessionError)
      }
    }
  }

useEffect(() => {
  const initializeApp = async () => {
    try {
      const snapshot = await getDocs(collection(db, "stocks"))
      const items = snapshot.docs.map((doc) => doc.data() as StockItem)
      setStockItems(items)
      setIsLoading(false)
    } catch (error) {
      console.error("Failed to fetch stock from Firestore:", error)
      setIsLoading(false)
    }
  }

  initializeApp()
}, [setStockItems])


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

  const exportToPDF = async () => {
    setIsExportingPDF(true)
    try {
      const pdfContent = `
PAXAL MARBLES & GRANITES
Stock Management Report
Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

SUMMARY STATISTICS
=================
Total Items: ${stockItems.length}
Total Stock Available: ${stockItems.reduce((sum, item) => sum + item.stockAvailable, 0)} SQFT
Total Stock Sold: ${stockItems.reduce((sum, item) => sum + item.stockSold, 0)} SQFT
Total Inventory Value: ₹${stockItems
        .reduce((sum, item) => sum + item.price * item.stockAvailable, 0)
        .toLocaleString("en-IN")}

STOCK DETAILS
=============
${stockItems
        .map(
          (item, index) => `
${index + 1}. ${item.name}
   Size: ${item.size}"
   Price: ₹${item.price.toLocaleString("en-IN")}
   Available: ${item.stockAvailable} SQFT
   Sold: ${item.stockSold} SQFT
   Date Added: ${new Date(item.dateAdded).toLocaleDateString()}
   Total Value: ₹${(item.price * item.stockAvailable).toLocaleString("en-IN")}
`,
        )
        .join("")}

---
Paxal Marbles & Granites - Confidential
      `
      const blob = new Blob([pdfContent], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Paxal_Stock_Report_${new Date().toISOString().split("T")[0]}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setIsExportingPDF(false)
    }
  }

useEffect(() => {
  const initializeApp = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Optional delay
      const snapshot = await getDocs(collection(db, "stocks"))
      const items = snapshot.docs.map((doc) => doc.data() as StockItem)
      setStockItems(items)
    } catch (error) {
      console.error("Error loading stocks from Firestore:", error)
    } finally {
      setIsLoading(false)
    }
  }

  initializeApp()
}, [setStockItems])

  useEffect(() => {
    if (!isLoading) {
      console.log("Saving updated stock items:", stockItems)
      saveToStorage(stockItems)
    }
  }, [stockItems, isLoading])

  const filteredItems = stockItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddStock = async () => {
  if (newStock.name && newStock.price && newStock.stockAvailable && newStock.size) {
    const newItem: StockItem = {
      id: Date.now().toString(),
      name: newStock.name,
      image: newStock.image || getDefaultImage(),
      price: Number.parseFloat(newStock.price),
      dateAdded: new Date().toISOString().split("T")[0],
      stockAvailable: Number.parseInt(newStock.stockAvailable),
      stockSold: 0,
      size: newStock.size,
    }
    const updatedItems = [newItem, ...stockItems]
    setStockItems(updatedItems)
    await addStockToFirestore(newItem) // ⬅️ Firestore call
    setNewStock({ name: "", image: "", price: "", stockAvailable: "", size: "" })
    setIsAddModalOpen(false)
  }
}

  const handleOpenEditModal = (item: StockItem) => {
    setEditStock({
      id: item.id,
      name: item.name,
      image: item.image,
      price: item.price.toString(),
      stockAvailable: item.stockAvailable.toString(),
      size: item.size,
    })
    setIsEditModalOpen(true)
    setDetailViewItem(null)
  }

  const handleUpdateStock = async () => {
  if (editStock.name && editStock.price && editStock.stockAvailable && editStock.size) {
    const updatedItems = stockItems.map((item) =>
      item.id === editStock.id
        ? {
            ...item,
            name: editStock.name,
            image: editStock.image || getDefaultImage(),
            price: Number.parseFloat(editStock.price),
            stockAvailable: Number.parseInt(editStock.stockAvailable),
            size: editStock.size,
          }
        : item
    )
    setStockItems(updatedItems)
    const updatedItem = updatedItems.find(item => item.id === editStock.id)
    if (updatedItem) {
      await updateStockInFirestore(updatedItem) // ⬅️ Firestore call
    }
    setEditStock({ id: "", name: "", image: "", price: "", stockAvailable: "", size: "" })
    setIsEditModalOpen(false)
  }
}

  const handleDeleteStock = async (id: string) => {
  const updatedItems = stockItems.filter((item) => item.id !== id)
  setStockItems(updatedItems)
  await deleteStockFromFirestore(id) // ⬅️ Firestore call
  setDeleteConfirmation({ isOpen: false, itemId: "", itemName: "" })
}


 const handleSellStock = async () => {
  if (detailViewItem && sellQuantity) {
    const quantity = Number.parseInt(sellQuantity)
    if (quantity > 0 && quantity <= detailViewItem.stockAvailable) {
      const updatedAvailable = detailViewItem.stockAvailable - quantity
      const updatedSold = detailViewItem.stockSold + quantity

      // 🔁 Update local UI
      const updatedItems = stockItems.map((item) =>
        item.id === detailViewItem.id
          ? {
              ...item,
              stockAvailable: updatedAvailable,
              stockSold: updatedSold,
            }
          : item,
      )
      setStockItems(updatedItems)
      setSellQuantity("")
      setDetailViewItem({
        ...detailViewItem,
        stockAvailable: updatedAvailable,
        stockSold: updatedSold,
      })

      // 🔁 Update Firestore
      await updateStockInFirestore(detailViewItem.id, {
        stockAvailable: updatedAvailable,
        stockSold: updatedSold,
      })
    }
  }
}

  const handleAddStockToExisting = async () => {
  if (detailViewItem && addQuantity) {
    const quantity = Number.parseInt(addQuantity)
    if (quantity > 0) {
      const updatedAvailable = detailViewItem.stockAvailable + quantity

      // 🔁 Update local state
      const updatedItems = stockItems.map((item) =>
        item.id === detailViewItem.id
          ? {
              ...item,
              stockAvailable: updatedAvailable,
            }
          : item,
      )
      setStockItems(updatedItems)
      setAddQuantity("")
      setDetailViewItem({
        ...detailViewItem,
        stockAvailable: updatedAvailable,
      })

      // ✅ Update Firestore
      try {
        await updateStockInFirestore(detailViewItem.id, {
          stockAvailable: updatedAvailable,
        })
      } catch (error) {
        console.error("Failed to update stock in Firestore:", error)
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
            <p className="text-sm sm:text-base text-slate-600">Loading your showroom...</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Paxal Marbles & Granites</h1>
              <p className="text-sm sm:text-base text-slate-600 mt-1">Showroom Stock Management</p>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {stockItems.length} Items in Stock
              </Badge>
              <Badge variant="outline" className="text-xs sm:text-sm bg-green-50 text-green-700">
                Data Saved ✓
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search stock items by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 sm:h-12 text-sm sm:text-lg"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={exportToPDF}
              disabled={isExportingPDF || stockItems.length === 0}
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
                  Export to PDF
                </>
              )}
            </Button>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="h-10 sm:h-12 px-4 sm:px-6 bg-slate-800 hover:bg-slate-700 text-sm sm:text-base flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Stock
            </Button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <div className="text-slate-400 mb-4">
              <Search className="h-8 w-8 sm:h-12 sm:w-12 mx-auto" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">
              {searchQuery ? "No items found" : "No stock items yet"}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto">
              {searchQuery
                ? `No items match "${searchQuery}". Try a different search term.`
                : "Add your first stock item to get started."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
                <CardContent className="p-3 sm:p-4">
                  <CardTitle className="text-base sm:text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
                    {item.name}
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-2">
                    <span className="text-lg sm:text-2xl font-bold text-slate-800">
                      ₹{item.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-500">
                      Added {new Date(item.dateAdded).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                      Size: {item.size}"
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-xs sm:text-sm">
                    <span className="text-green-600 font-medium">Available: {item.stockAvailable} SQFT</span>
                    <span className="text-blue-600 font-medium">Sold: {item.stockSold} SQFT</span>
                  </div>
                </CardContent>
                <CardFooter className="p-3 sm:p-4 pt-0">
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
                    className="w-full text-xs sm:text-sm"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Delete Stock
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Add New Stock Item</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Add a new marble or granite item to your showroom inventory.
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
                <Label htmlFor="stock-price" className="text-sm sm:text-base">Price (₹) *</Label>
                <Input
                  id="stock-price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newStock.price}
                  onChange={(e) => setNewStock({ ...newStock, price: e.target.value })}
                  className="text-sm sm:text-base"
                />
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
                disabled={!newStock.name || !newStock.price || !newStock.stockAvailable || !newStock.size}
                className="bg-slate-800 hover:bg-slate-700 text-sm sm:text-base"
              >
                Add Stock Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Edit Stock Item</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Update the details of this marble or granite item.
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
                <Label htmlFor="edit-stock-price" className="text-sm sm:text-base">Price (₹) *</Label>
                <Input
                  id="edit-stock-price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={editStock.price}
                  onChange={(e) => setEditStock({ ...editStock, price: e.target.value })}
                  className="text-sm sm:text-base"
                />
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
                disabled={!editStock.name || !editStock.price || !editStock.stockAvailable || !editStock.size}
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
                Are you sure you want to delete {deleteConfirmation.itemName}? This action cannot be undone.
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
                Manage stock details for this item
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
                    <Label className="text-sm sm:text-base">Price</Label>
                    <p className="text-lg font-semibold">₹{detailViewItem.price.toLocaleString("en-IN")}</p>
                  </div>
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
                  <div>
                    <Label className="text-sm sm:text-base">Total Value</Label>
                    <p className="text-lg font-semibold">
                      ₹{(detailViewItem.price * detailViewItem.stockAvailable).toLocaleString("en-IN")}
                    </p>
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