/**
 * aitema|Termin - Frontend Web Push
 *
 * Service Worker Registration, Push-Permission-Request
 * und Svelte-Store fuer den Push-Opt-in-Status.
 *
 * Verwendung:
 *   import { pushStore, requestPushPermission, subscribePush } from '$lib/push.js';
 */

import { writable, get } from 'svelte/store';

// ─── VAPID Public Key ─────────────────────────────────────────────────────────

// Wird beim Build aus VITE_VAPID_PUBLIC_KEY injiziert (Base64-URL, 65 Bytes).
const VAPID_PUBLIC_KEY =
  typeof import.meta !== 'undefined'
    ? (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY ?? ''
    : '';

// ─── Store-Typen ─────────────────────────────────────────────────────────────

export type PushStatus =
  | 'unsupported'    // Browser unterstuetzt kein Push
  | 'idle'           // Noch keine Aktion
  | 'requesting'     // Permission-Dialog offen
  | 'denied'         // Nutzer hat abgelehnt
  | 'subscribed'     // Aktiv abonniert
  | 'error';         // Technischer Fehler

export interface PushState {
  status: PushStatus;
  subscription: PushSubscription | null;
  error: string | null;
}

// ─── Store ────────────────────────────────────────────────────────────────────

const initialState: PushState = {
  status: 'idle',
  subscription: null,
  error: null,
};

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function createPushStore() {
  const { subscribe, set, update } = writable<PushState>(
    isPushSupported() ? initialState : { status: 'unsupported', subscription: null, error: null },
  );

  return {
    subscribe,
    setStatus: (status: PushStatus, error?: string) =>
      update((s) => ({ ...s, status, error: error ?? null })),
    setSubscription: (subscription: PushSubscription | null) =>
      update((s) => ({ ...s, subscription, status: subscription ? 'subscribed' : 'idle' })),
    reset: () => set(initialState),
  };
}

export const pushStore = createPushStore();

// ─── Service Worker registrieren ─────────────────────────────────────────────

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    pushStore.setStatus('unsupported');
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[Push] Service Worker registriert.');
    return swRegistration;
  } catch (err: any) {
    console.error('[Push] SW-Registrierung fehlgeschlagen:', err);
    pushStore.setStatus('error', err.message);
    return null;
  }
}

// ─── Permission anfragen ──────────────────────────────────────────────────────

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';

  pushStore.setStatus('requesting');

  const permission = await Notification.requestPermission();

  if (permission === 'denied') {
    pushStore.setStatus('denied');
  } else if (permission !== 'granted') {
    pushStore.setStatus('idle');
  }

  return permission;
}

// ─── Abonnieren ───────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function subscribePush(
  bookingRef: string,
  apiBase = '/api',
): Promise<boolean> {
  if (!isPushSupported()) {
    pushStore.setStatus('unsupported');
    return false;
  }

  try {
    const permission = await requestPushPermission();
    if (permission !== 'granted') return false;

    if (!swRegistration) {
      swRegistration = await registerServiceWorker();
    }
    if (!swRegistration) return false;

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const subJson = subscription.toJSON();

    const response = await fetch(`${apiBase}/notifications/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        bookingRef,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server antwortete mit ${response.status}`);
    }

    pushStore.setSubscription(subscription);
    return true;
  } catch (err: any) {
    console.error('[Push] Abonnieren fehlgeschlagen:', err);
    pushStore.setStatus('error', err.message);
    return false;
  }
}

// ─── Abbestellen ─────────────────────────────────────────────────────────────

export async function unsubscribePush(apiBase = '/api'): Promise<boolean> {
  const state = get(pushStore);
  if (!state.subscription) return true;

  try {
    const endpoint = state.subscription.endpoint;

    await state.subscription.unsubscribe();

    await fetch(`${apiBase}/notifications/push/unsubscribe`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });

    pushStore.setSubscription(null);
    return true;
  } catch (err: any) {
    console.error('[Push] Abbestellen fehlgeschlagen:', err);
    pushStore.setStatus('error', err.message);
    return false;
  }
}

// ─── Init (automatisch beim Import) ──────────────────────────────────────────

if (typeof window !== 'undefined' && isPushSupported()) {
  // Bestehende Subscription wiederherstellen
  navigator.serviceWorker.ready.then(async (reg) => {
    swRegistration = reg;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      pushStore.setSubscription(existing);
    }
  }).catch(() => {});
}
