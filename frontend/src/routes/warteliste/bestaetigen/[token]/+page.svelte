<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const TENANT = import.meta.env.VITE_TENANT_SLUG || 'musterstadt';

  let token: string;
  let offer: any = null;
  let loading = true;
  let error = '';
  let expired = false;
  let confirmed = false;
  let declined = false;
  let actionLoading = false;
  let bookingCode = '';

  $: token = $page.params.token;

  onMount(async () => {
    try {
      const resp = await fetch(`${API}/api/v1/${TENANT}/waitlist/offer/${token}`);
      const data = await resp.json();
      if (resp.status === 410) { expired = true; return; }
      if (!resp.ok) throw new Error(data.error || 'Angebot nicht gefunden');
      offer = data;
    } catch (e: any) {
      error = e.message;
    }
    loading = false;
  });

  function formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('de-DE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
  function formatTime(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  function timeLeft(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Abgelaufen';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  }

  async function handleAction(action: 'confirm' | 'decline') {
    actionLoading = true;
    try {
      const resp = await fetch(`${API}/api/v1/${TENANT}/waitlist/offer/${token}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Fehler');
      if (action === 'confirm') {
        bookingCode = data.bookingCode;
        confirmed = true;
      } else {
        declined = true;
      }
    } catch (e: any) {
      error = e.message;
    }
    actionLoading = false;
  }
</script>

<svelte:head>
  <title>Termin bestätigen – aitema|Termin</title>
</svelte:head>

<main class="confirm-page">
  <div class="container">

    {#if loading}
      <div class="loading-state">
        <div class="spinner" aria-label="Lädt…"></div>
        <p>Angebot wird geladen…</p>
      </div>

    {:else if expired}
      <div class="state-card state-error">
        <div class="state-icon">⏰</div>
        <h1>Angebot abgelaufen</h1>
        <p>Dieses Termin-Angebot ist leider abgelaufen. Der nächste Interessent auf der Warteliste wurde bereits benachrichtigt.</p>
        <a href="/warteliste" class="btn btn-primary">Neu eintragen</a>
      </div>

    {:else if error}
      <div class="state-card state-error">
        <div class="state-icon">⚠️</div>
        <h1>Fehler</h1>
        <p>{error}</p>
        <a href="/" class="btn btn-secondary">Zur Startseite</a>
      </div>

    {:else if confirmed}
      <div class="state-card state-success">
        <div class="success-icon-wrap" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="32" fill="#dcfce7"/>
            <path d="M20 32l9 9 15-16" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1>Termin bestätigt!</h1>
        <p>Ihr Termin wurde erfolgreich gebucht.</p>
        <div class="booking-ref">
          <span class="booking-ref-label">Buchungsnummer</span>
          <span class="booking-ref-code">{bookingCode}</span>
        </div>
        <p class="hint">Bitte notieren Sie Ihre Buchungsnummer. Eine Bestätigung folgt per SMS.</p>
        <a href="/" class="btn btn-primary">Zur Startseite</a>
      </div>

    {:else if declined}
      <div class="state-card">
        <div class="state-icon">👍</div>
        <h1>Angebot abgelehnt</h1>
        <p>Kein Problem – der nächste Interessent wird benachrichtigt. Möchten Sie weiterhin auf der Warteliste bleiben?</p>
        <a href="/warteliste" class="btn btn-primary">Neu eintragen</a>
        <a href="/" class="btn btn-secondary">Zur Startseite</a>
      </div>

    {:else if offer}
      <!-- Angebot anzeigen -->
      <div class="offer-header">
        <div class="badge-urgent">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="5" stroke="#f59e0b" stroke-width="1.3"/>
          </svg>
          Termin-Angebot – nur noch {timeLeft(offer.expiresAt)} verfügbar
        </div>
        <h1 class="page-title">{offer.name}, ein Termin ist frei!</h1>
        <p class="page-subtitle">Bestätigen Sie jetzt – das Angebot gilt nur für 2 Stunden.</p>
      </div>

      <!-- Termin-Details -->
      <div class="offer-card">
        <div class="offer-detail">
          <span class="offer-detail-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="3" width="16" height="15" rx="2" stroke="#3b82f6" stroke-width="1.5"/>
              <path d="M6 1v4M14 1v4M2 8h16" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </span>
          <div>
            <p class="detail-label">Datum</p>
            <p class="detail-value">{formatDate(offer.offeredSlotStart)}</p>
          </div>
        </div>

        <div class="offer-detail">
          <span class="offer-detail-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="#3b82f6" stroke-width="1.5"/>
              <path d="M10 5v5l3 3" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </span>
          <div>
            <p class="detail-label">Uhrzeit</p>
            <p class="detail-value">{formatTime(offer.offeredSlotStart)} – {formatTime(offer.offeredSlotEnd)} Uhr</p>
          </div>
        </div>

        <div class="offer-detail">
          <span class="offer-detail-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2a6 6 0 016 6c0 4-6 10-6 10S4 12 4 8a6 6 0 016-6z" stroke="#3b82f6" stroke-width="1.5"/>
              <circle cx="10" cy="8" r="2" stroke="#3b82f6" stroke-width="1.5"/>
            </svg>
          </span>
          <div>
            <p class="detail-label">Dienstleistung</p>
            <p class="detail-value">{offer.service}</p>
            {#if offer.location}<p class="detail-sub">{offer.location}</p>{/if}
            {#if offer.locationAddress}<p class="detail-sub">{offer.locationAddress}</p>{/if}
          </div>
        </div>

        <!-- Ablauf-Timer -->
        <div class="expiry-bar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="#f59e0b" stroke-width="1.3"/>
            <path d="M8 4v4l2.5 2.5" stroke="#f59e0b" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <span>Angebot gültig bis: {new Date(offer.expiresAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
        </div>
      </div>

      <!-- Aktions-Buttons -->
      <div class="action-area">
        {#if error}
          <div class="action-error" role="alert">{error}</div>
        {/if}
        <button
          class="btn btn-confirm"
          on:click={() => handleAction('confirm')}
          disabled={actionLoading}
          aria-label="Termin annehmen"
        >
          {#if actionLoading}
            <span class="btn-spinner" aria-hidden="true"></span>
            Wird gebucht…
          {:else}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 10l5 5 7-8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Termin annehmen
          {/if}
        </button>

        <button
          class="btn btn-decline"
          on:click={() => handleAction('decline')}
          disabled={actionLoading}
          aria-label="Termin ablehnen"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Ablehnen
        </button>
      </div>
    {/if}
  </div>
</main>

<style>
  .confirm-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
    padding: 3rem 1rem;
    display: flex;
    align-items: center;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    width: 100%;
  }

  /* Loading */
  .loading-state {
    text-align: center;
    color: #94a3b8;
    padding: 4rem 0;
  }
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(59, 130, 246, 0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* State cards */
  .state-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1.25rem;
    padding: 3rem 2rem;
    text-align: center;
    backdrop-filter: blur(10px);
  }
  .state-card h1 { color: #f8fafc; margin: 1rem 0 0.75rem; font-size: 1.75rem; }
  .state-card p { color: #94a3b8; line-height: 1.6; margin-bottom: 1.5rem; }
  .state-error { border-color: rgba(239, 68, 68, 0.2); }
  .state-success { border-color: rgba(22, 163, 74, 0.2); }
  .state-icon { font-size: 3rem; margin-bottom: 0.5rem; }

  .success-icon-wrap { margin-bottom: 1.5rem; }
  .booking-ref {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 0.75rem;
    padding: 1rem 1.5rem;
    margin: 1rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  .booking-ref-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
  .booking-ref-code { font-size: 1.5rem; font-weight: 800; color: #93c5fd; letter-spacing: 0.05em; }
  .hint { font-size: 0.8rem !important; margin-top: 0.5rem !important; }

  /* Offer header */
  .offer-header { text-align: center; margin-bottom: 1.5rem; }
  .badge-urgent {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.25);
    color: #fbbf24;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.35rem 0.85rem;
    border-radius: 50px;
    margin-bottom: 1rem;
  }
  .page-title { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 800; color: #f8fafc; margin: 0 0 0.5rem; }
  .page-subtitle { color: #94a3b8; font-size: 0.95rem; }

  /* Offer card */
  .offer-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1.25rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    backdrop-filter: blur(10px);
  }
  .offer-detail {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .offer-detail:last-of-type { border-bottom: none; }
  .offer-detail-icon {
    width: 40px;
    height: 40px;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .detail-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 0.2rem; }
  .detail-value { font-size: 1.05rem; font-weight: 600; color: #f1f5f9; margin: 0; }
  .detail-sub { font-size: 0.85rem; color: #94a3b8; margin: 0.2rem 0 0; }

  .expiry-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.625rem 0.875rem;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.15);
    border-radius: 0.5rem;
    font-size: 0.8rem;
    color: #fbbf24;
  }

  /* Actions */
  .action-area { display: flex; flex-direction: column; gap: 0.75rem; }
  .action-error {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: #fca5a5;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    text-align: center;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 2rem;
    border-radius: 0.75rem;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    text-decoration: none;
    width: 100%;
  }
  .btn-confirm {
    background: linear-gradient(135deg, #16a34a, #15803d);
    color: #fff;
    box-shadow: 0 4px 16px rgba(22, 163, 74, 0.3);
    font-size: 1.1rem;
    padding: 1rem 2rem;
  }
  .btn-confirm:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(22, 163, 74, 0.4);
  }
  .btn-decline {
    background: transparent;
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .btn-decline:hover:not(:disabled) { background: rgba(255, 255, 255, 0.04); color: #f1f5f9; }
  .btn-primary {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: #fff;
    margin-top: 0.5rem;
  }
  .btn-secondary {
    background: transparent;
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.12);
    margin-top: 0.5rem;
  }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }

  .btn-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
</style>
