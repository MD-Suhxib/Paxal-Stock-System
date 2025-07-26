import { db } from "./firebase"
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore"

const STOCK_COLLECTION = "stocks"

// ✅ Add a new stock or overwrite existing one
export async function addStockToFirestore(stockItem) {
  try {
    const stockRef = doc(db, STOCK_COLLECTION, stockItem.id)
    await setDoc(stockRef, stockItem)
    console.log("Stock added to Firestore:", stockItem)
  } catch (error) {
    console.error("Error adding stock to Firestore:", error)
  }
}

// ✅ Delete a stock by ID
export async function deleteStockFromFirestore(id) {
  try {
    const docRef = doc(db, STOCK_COLLECTION, id)
    await deleteDoc(docRef)
    console.log("Stock deleted from Firestore:", id)
  } catch (error) {
    console.error("Error deleting stock from Firestore:", error)
  }
}

// ✅ Fixed: Update specific fields only (partial update)
export async function updateStockInFirestore(id, updatedFields) {
  try {
    const docRef = doc(db, STOCK_COLLECTION, id)
    await updateDoc(docRef, updatedFields)
    console.log("Stock updated in Firestore:", updatedFields)
  } catch (error) {
    console.error("Error updating stock in Firestore:", error)
  }
}
