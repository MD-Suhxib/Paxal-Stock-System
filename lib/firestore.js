import { db } from "./firebase"
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore"

// ✅ Add a new stock to a specific warehouse collection
export async function addStockToFirestore(stockItem, collectionName) {
  try {
    const stockRef = doc(db, collectionName, stockItem.id)
    await setDoc(stockRef, stockItem)
    console.log("Stock added to Firestore:", stockItem, "in collection:", collectionName)
  } catch (error) {
    console.error("Error adding stock to Firestore:", error)
    throw error // Re-throw to handle in component
  }
}

// ✅ Delete a stock by ID from a specific warehouse collection
export async function deleteStockFromFirestore(id, collectionName) {
  try {
    const docRef = doc(db, collectionName, id)
    await deleteDoc(docRef)
    console.log("Stock deleted from Firestore:", id, "from collection:", collectionName)
  } catch (error) {
    console.error("Error deleting stock from Firestore:", error)
    throw error // Re-throw to handle in component
  }
}

// ✅ Update a stock item in a specific warehouse collection
export async function updateStockInFirestore(stockItem, collectionName) {
  try {
    const docRef = doc(db, collectionName, stockItem.id)
    await setDoc(docRef, stockItem) // Using setDoc to overwrite the entire document
    console.log("Stock updated in Firestore:", stockItem, "in collection:", collectionName)
  } catch (error) {
    console.error("Error updating stock in Firestore:", error)
    throw error // Re-throw to handle in component
  }
}

// ✅ Alternative: Update specific fields only (partial update)
export async function updateStockFieldsInFirestore(id, updatedFields, collectionName) {
  try {
    const docRef = doc(db, collectionName, id)
    await updateDoc(docRef, updatedFields)
    console.log("Stock fields updated in Firestore:", updatedFields, "in collection:", collectionName)
  } catch (error) {
    console.error("Error updating stock fields in Firestore:", error)
    throw error // Re-throw to handle in component
  }
}