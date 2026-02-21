/**
 * M2: Browser Push Notification Utilities
 * DSGVO-konform: Nur Browser Notification API, kein Drittanbieter.
 * Wird genutzt um Buerger zu benachrichtigen wenn ihre Wartenummer aufgerufen wird.
 */

/**
 * Fordert die Erlaubnis fuer Browser-Benachrichtigungen an.
 * Gibt true zurueck wenn Erlaubnis erteilt wurde.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Zeigt eine Browser-Benachrichtigung an.
 * Tut nichts, wenn keine Erlaubnis vorliegt.
 */
export function showPushNotification(title: string, body: string): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'aitema-termin',
    requireInteraction: true,
  });
}

/**
 * Gibt den aktuellen Notification-Permission-Status zurueck.
 */
export function getNotificationStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
