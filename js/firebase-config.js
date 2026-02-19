// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqQcDngmgSj1KbZQQ9j9pZiMmPs7ydue0", // ← ใส่ของคุณ
  authDomain: "notify-fridge-monitor-pwa.firebaseapp.com", // ← ใส่ของคุณ
  projectId: "notify-fridge-monitor-pwa", // ← ใส่ของคุณ
  storageBucket: "notify-fridge-monitor-pwa.firebasestorage.app", // ← ใส่ของคุณ
  messagingSenderId: "623427160222", // ← ใส่ของคุณ
  appId: "1:623427160222:web:780e2011212969f6b5d38f" // ← ใส่ของคุณ
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firebase Messaging
const messaging = firebase.messaging();

// VAPID Key (Public Key from Firebase Console → Cloud Messaging → Web Push certificates)
const VAPID_KEY = "YOUR_VAPID_PUBLIC_KEY";

// Note: Service worker will be automatically registered by Firebase SDK
// The firebase-messaging-sw.js must be in the root directory
console.log('✅ Firebase initialized');
