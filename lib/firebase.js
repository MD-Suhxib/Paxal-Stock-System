import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyDrT0KkijgAfVP9MAMKtPuA4GpaESZK12A",
  authDomain: "paxal-stock-management.firebaseapp.com",
  projectId: "paxal-stock-management",
  storageBucket: "paxal-stock-management.appspot.com", // fixed typo
  messagingSenderId: "259267835253",
  appId: "1:259267835253:web:e6189d48f65efc575f4f3c",
  measurementId: "G-BGV45F1TR4",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

export default app
