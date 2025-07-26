// lib/stockService.js
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'stockItems';

// Get all stock items
export const getAllStockItems = async () => {
  try {
    const stockCollection = collection(db, COLLECTION_NAME);
    const stockQuery = query(stockCollection, orderBy('dateAdded', 'desc'));
    const querySnapshot = await getDocs(stockQuery);
    
    const stockItems = [];
    querySnapshot.forEach((doc) => {
      stockItems.push({
        id: doc.id,
        ...doc.data(),
        dateAdded: doc.data().dateAdded?.toDate?.()?.toISOString?.()?.split('T')[0] || doc.data().dateAdded
      });
    });
    
    return stockItems;
  } catch (error) {
    console.error('Error fetching stock items:', error);
    throw new Error('Failed to fetch stock items');
  }
};

// Real-time listener for stock items
export const subscribeToStockItems = (callback) => {
  const stockCollection = collection(db, COLLECTION_NAME);
  const stockQuery = query(stockCollection, orderBy('dateAdded', 'desc'));
  
  return onSnapshot(stockQuery, (querySnapshot) => {
    const stockItems = [];
    querySnapshot.forEach((doc) => {
      stockItems.push({
        id: doc.id,
        ...doc.data(),
        dateAdded: doc.data().dateAdded?.toDate?.()?.toISOString?.()?.split('T')[0] || doc.data().dateAdded
      });
    });
    callback(stockItems);
  }, (error) => {
    console.error('Error in stock items subscription:', error);
  });
};

// Add new stock item (simplified - no file upload)
export const addStockItem = async (stockData) => {
  try {
    const docData = {
      name: stockData.name,
      image: stockData.image || '', // URL or base64 string
      price: Number.parseFloat(stockData.price),
      stockAvailable: Number.parseInt(stockData.stockAvailable),
      stockSold: 0,
      size: stockData.size,
      dateAdded: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
    
    return {
      id: docRef.id,
      ...docData,
      dateAdded: new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Error adding stock item:', error);
    throw new Error('Failed to add stock item');
  }
};

// Update stock item (simplified - no file upload)
export const updateStockItem = async (id, stockData) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    const updateData = {
      name: stockData.name,
      image: stockData.image || '', // URL or base64 string
      price: Number.parseFloat(stockData.price),
      stockAvailable: Number.parseInt(stockData.stockAvailable),
      size: stockData.size,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, updateData);
    
    return {
      id,
      ...updateData,
      stockSold: stockData.stockSold || 0,
      dateAdded: stockData.dateAdded
    };
  } catch (error) {
    console.error('Error updating stock item:', error);
    throw new Error('Failed to update stock item');
  }
};

// Delete stock item (simplified - no image deletion)
export const deleteStockItem = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (error) {
    console.error('Error deleting stock item:', error);
    throw new Error('Failed to delete stock item');
  }
};

// Update stock quantities (sell/add stock)
export const updateStockQuantity = async (id, availableStock, soldStock) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    await updateDoc(docRef, {
      stockAvailable: Number.parseInt(availableStock),
      stockSold: Number.parseInt(soldStock),
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating stock quantity:', error);
    throw new Error('Failed to update stock quantity');
  }
};

// Batch operations for bulk updates
export const batchUpdateStockItems = async (updates) => {
  try {
    const batch = writeBatch(db);
    
    updates.forEach(({ id, data }) => {
      const docRef = doc(db, COLLECTION_NAME, id);
      batch.update(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error in batch update:', error);
    throw new Error('Failed to perform batch update');
  }
};

// Get stock statistics
export const getStockStatistics = async () => {
  try {
    const stockItems = await getAllStockItems();
    
    const stats = {
      totalItems: stockItems.length,
      totalStockAvailable: stockItems.reduce((sum, item) => sum + item.stockAvailable, 0),
      totalStockSold: stockItems.reduce((sum, item) => sum + item.stockSold, 0),
      totalInventoryValue: stockItems.reduce((sum, item) => sum + (item.price * item.stockAvailable), 0),
      lowStockItems: stockItems.filter(item => item.stockAvailable < 10).length,
      recentlyAdded: stockItems.filter(item => {
        const addedDate = new Date(item.dateAdded);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return addedDate > weekAgo;
      }).length
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting statistics:', error);
    throw new Error('Failed to get statistics');
  }
};