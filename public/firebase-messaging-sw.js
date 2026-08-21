/**
 * Firebase Messaging Service Worker
 *
 * IMPORTANT: This file must be named exactly firebase-messaging-sw.js
 * and placed in the /public directory so it is served from the root:
 *   https://yourdomain.com/firebase-messaging-sw.js
 *
 * Firebase SDK will automatically look for it at that exact path.
 *
 * This service worker handles background push notifications —
 * i.e. notifications received when the app tab is not focused or is closed.
 * Foreground notifications are handled by the usePushNotifications hook.
 */

// Import Firebase scripts via CDN — must match the version used in the main app
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

/**
 * Firebase config must be duplicated here because service workers
 * run in a separate context with no access to your React app or env vars.
 *
 * Replace these values with your actual Firebase project config.
 * These are public-facing values — it is safe to include them here.
 */
firebase.initializeApp({
  apiKey:            'AIzaSyCAEhOzQUrz3J6XLfaDjY9AyIkocqx6mHg',
  authDomain:        'vitalstalenvoproject.firebaseapp.com',
  projectId:         'vitalstalenvoproject',
  storageBucket:     'vitalstalenvoproject.firebasestorage.app',
  messagingSenderId: '375428307500',
  appId:             '1:375428307500:web:f47bea24150525c7968f89',
});

const messaging = firebase.messaging();

/**
 * Handle background messages — received when the app is not in the foreground.
 * Firebase automatically shows the notification from the payload.
 * Use this handler to customise the notification or perform background work.
 */
messaging.onBackgroundMessage((payload) => {
  const { title = 'Vitals', body = 'You have a new notification' } =
    payload.notification ?? {};

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    // data carries the click URL — used in notificationclick handler below
    data: { url: payload.fcmOptions?.link ?? '/' },
  });
});

/**
 * Open or focus the app when the user taps a notification.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const fallbackUrl = new URL('/dashboard', self.location.origin);
  let targetUrl = fallbackUrl;

  try {
    const candidate = new URL(event.notification.data?.url ?? '/dashboard', self.location.origin);
    if (
      candidate.origin === self.location.origin &&
      (candidate.protocol === 'https:' || candidate.protocol === 'http:')
    ) {
      targetUrl = candidate;
    }
  } catch {
    targetUrl = fallbackUrl;
  }

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Reuse an existing application tab when possible.
        for (const client of clientList) {
          if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
            if ('navigate' in client) {
              return client.navigate(targetUrl.href).then(() => client.focus());
            }
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl.href);
        }
      }),
  );
});
