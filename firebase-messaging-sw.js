// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqQcDngmgSj1KbZQQ9j9pZiMmPs7ydue0",
  authDomain: "notify-fridge-monitor-pwa.firebaseapp.com",
  projectId: "notify-fridge-monitor-pwa",
  storageBucket: "notify-fridge-monitor-pwa",
  messagingSenderId: "623427160222",
  appId: "1:623427160222:web:780e2011212969f6b5d38f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const { title, body } = payload.notification;
  
  // ใช้ relative path
  const notificationOptions = {
    body: body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'temperature-alert',
    requireInteraction: payload.data?.severity === 'critical',
    vibrate: payload.data?.severity === 'critical' ? [200, 100, 200, 100, 200] : [200, 100, 200],
    data: payload.data
  };
  
  self.registration.showNotification(title, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // ถ้ามี window เปิดอยู่แล้ว ให้ focus
        for (let client of clientList) {
          if (client.url.includes('fridge-monitor-pwa') && 'focus' in client) {
            return client.focus();
          }
        }
        // ถ้าไม่มี ให้เปิดใหม่
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});
