<!-- T2: QR-Code Check-in Seite -->
<!-- Wird aufgerufen wenn Buerger QR-Code scannt: /checkin/:bookingCode -->
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const TENANT = import.meta.env.VITE_TENANT_SLUG || 'musterstadt';

  type CheckinStatus = 'loading' | 'success' | 'already' | 'error';

  let status: CheckinStatus = 'loading';
  let errorMsg = '';
  let appointment: any = null;

  onMount(async () => {
    const bookingCode = $page.params.bookingCode;
    if (!bookingCode) {
      status = 'error';
      errorMsg = 'Kein Buchungscode angegeben.';
      return;
    }

    try {
      const res = await fetch(
        `${API}/api/v1/${TENANT}/booking/checkin/${bookingCode}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      const data = await res.json();

      if (res.ok && data.data) {
        appointment = data.data;
        status = data.data.alreadyCheckedIn ? 'already' : 'success';
      } else {
        status = 'error';
        errorMsg = data.error || data.message || 'Check-in fehlgeschlagen.';
      }
    } catch (e: any) {
      status = 'error';
      errorMsg = e.message || 'Verbindungsfehler.';
    }
  });
</script>

<svelte:head>
  <title>Check-in – aitema|Termin</title>
</svelte:head>

<div class="checkin-page">
  {#if status === 'loading'}
    <div class="checkin-card loading">
      <div class="spinner"></div>
      <p>Check-in wird verarbeitet…</p>
    </div>

  {:else if status === 'success'}
    <div class="checkin-card success">
      <div class="icon">✅</div>
      <h1>Check-in erfolgreich!</h1>
      {#if appointment}
        <p class="service-name">{appointment.service?.name ?? 'Ihr Termin'}</p>
        <p class="location-name">{appointment.location?.name ?? ''}</p>
      {/if}
      <p class="hint">Sie sind nun eingecheckt. Bitte begeben Sie sich zum Wartebereich.</p>
      <a href="/" class="btn">Zur Startseite</a>
    </div>

  {:else if status === 'already'}
    <div class="checkin-card info">
      <div class="icon">ℹ️</div>
      <h1>Bereits eingecheckt</h1>
      <p class="hint">Sie wurden bereits fuer diesen Termin eingecheckt.</p>
      <a href="/" class="btn">Zur Startseite</a>
    </div>

  {:else}
    <div class="checkin-card error">
      <div class="icon">❌</div>
      <h1>Check-in fehlgeschlagen</h1>
      <p class="error-msg">{errorMsg}</p>
      <a href="/buchen" class="btn">Neuen Termin buchen</a>
    </div>
  {/if}
</div>

<style>
  .checkin-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    padding: 2rem;
  }

  .checkin-card {
    background: #fff;
    border-radius: 1rem;
    padding: 3rem 2rem;
    max-width: 420px;
    width: 100%;
    text-align: center;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  }

  .icon {
    font-size: 4rem;
    margin-bottom: 1.25rem;
    line-height: 1;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 0.75rem;
  }

  .service-name {
    font-size: 1rem;
    font-weight: 600;
    color: #1e3a5f;
    margin-bottom: 0.25rem;
  }

  .location-name {
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 1rem;
  }

  .hint {
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 2rem;
    line-height: 1.5;
  }

  .error-msg {
    font-size: 0.875rem;
    color: #dc2626;
    margin-bottom: 2rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    padding: 0.75rem 1.5rem;
    background: #1e3a5f;
    color: #fff;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.15s;
  }

  .btn:hover {
    background: #2d4f7c;
  }

  /* Spinner */
  .loading {
    color: #64748b;
    font-size: 0.875rem;
    gap: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid #e2e8f0;
    border-top-color: #1e3a5f;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
