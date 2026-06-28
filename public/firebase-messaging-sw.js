// Firebase Cloud Messaging Service Worker
// Ce fichier DOIT rester dans /public pour être servi à la racine du domaine

importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

// La config Firebase est injectée dynamiquement au runtime via le service worker
// On récupère les params depuis l'URL du SW ou depuis un message postMessage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    const config = event.data.config;
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    const messaging = firebase.messaging();

    // Gestion des messages en arrière-plan
    messaging.onBackgroundMessage((payload) => {
      const { title, body, icon } = payload.notification || {};
      self.registration.showNotification(title || '💪 Reps', {
        body: body || "C'est l'heure de t'entraîner !",
        icon: icon || '/icons/pwa-192x192.png',
        badge: '/icons/pwa-72x72.png',
        tag: 'reps-reminder',
        renotify: true,
        data: payload.data,
      });
    });
  }
});

// Gestion du clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
