// Cloudinary Configuration
export const cloudinaryConfig = {
    cloudName: "dcp2jwykj",
    uploadPreset: "commsync"
};

// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvgE0T7TNnUI0mcKWSdAJQiBMllqM74T0",
  authDomain: "bpmpc-d63e6.firebaseapp.com",
  projectId: "bpmpc-d63e6",
  storageBucket: "bpmpc-d63e6.firebasestorage.app",
  messagingSenderId: "696604639549",
  appId: "1:696604639549:web:86c482c03d2386ba2a0554",
  measurementId: "G-VLRBTB6J7Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export instances for use in other scripts
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);