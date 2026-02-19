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

// Get Firebase Messaging with custom service worker path
const messaging = firebase.messaging();

// Register custom service worker for Firebase Messaging
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./firebase-messaging-sw.js', {
    scope: './firebase-cloud-messaging-push-scope'
  })
  .then(registration => {
    console.log('✅ Firebase messaging service worker registered');
    messaging.useServiceWorker(registration);
  })
  .catch(error => {
    console.error('❌ Firebase messaging service worker registration failed:', error);
  });
}

// VAPID Key (Public Key จาก Web Push certificates)
const VAPID_KEY = "BHfDSQy07M7YUGNP5SvoDOumd62_1ZFO3nXvkBIEUG9DO495FT7R5YXLId9BDUMhm-Jhv-Iu4boEAmwLux23eWY"; // ← ใส่ VAPID Public Key ของคุณ
