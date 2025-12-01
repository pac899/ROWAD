/* Firebase Cloud Messaging SW */
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Read config injected on window? Not available in SW; so hardcode minimal config here.
// You must keep this in sync with firebase-config.js
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAaAApupsKlr3ZyM1S1LIdr8bJuZd4DRlo",
    authDomain: "rowad-a9241.firebaseapp.com",
    projectId: "rowad-a9241",
    storageBucket: "rowad-a9241.firebasestorage.app",
    messagingSenderId: "860655433742",
    appId: "1:860655433742:web:19ffedd8f97d945864e45f",
    measurementId: "G-93MQE4T8C2"
};

firebase.initializeApp(FIREBASE_CONFIG);
const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  // Prefer explicit table number to build the requested title format
  const tableNum = payload?.data?.table || payload?.data?.table_number || payload?.data?.tableId || payload?.data?.table_id;
  const title = tableNum ? `طلب للطاولة : ${tableNum}` : (payload?.notification?.title || 'إشعار جديد');
  const options = {
    body: payload?.notification?.body || '',
    icon: payload?.notification?.icon || '/favicon.ico',
    data: payload?.data || {},
  };
  self.registration.showNotification(title, options);
});
