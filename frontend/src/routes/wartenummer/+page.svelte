<script lang="ts">
  import { onMount } from 'svelte';

  let locationId = '';
  let serviceId = '';
  let citizenName = '';
  let ticket: any = null;
  let error = '';
  let loading = false;
  let locations: any[] = [];
  let services: any[] = [];
  let loadingLocations = true;

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const TENANT = import.meta.env.VITE_TENANT_SLUG || 'musterstadt';

  onMount(async () => {
    try {
      const r = await fetch(`${API}/api/v1/${TENANT}/locations`);
      const d = await r.json();
      locations = d.locations || [];
      if (locations.length === 1) {
        locationId = locations[0].id;
        await loadServices();
      }
    } catch {}
    loadingLocations = false;
  });

  async function loadServices() {
    if (!locationId) return;
    services = [];
    try {
      const r = await fetch(`${API}/api/v1/${TENANT}/services?locationId=${locationId}`);
      const d = await r.json();
      services = d.services || [];
    } catch {}
  }

  async function getTicket() {
    if (!locationId) { error = 'Bitte wählen Sie einen Standort.'; return; }
    loading = true;
    error = '';
    try {
      const resp = await fetch(`${API}/api/v1/${TENANT}/queue/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, serviceId: serviceId || undefined, citizenName: citizenName || undefined }),
      });
      const data = await resp.json();
      if (data.success || data.data) {
        ticket = data.data || data;
      } else {
        error = data.error || 'Fehler beim Erstellen der Wartenummer';
      }
    } catch (e: any) {
      error = e.message || 'Verbindungsfehler';
    }
    loading = false;
  }

  function reset() { ticket = null; error = ''; serviceId = ''; citizenName = ''; }
</script>

<svelte:head>
  <title>Wartenummer ziehen – aitema|Termin</title>
</svelte:head>

<!-- Hero -->
<div class="queue-hero">
  <div class="container">
    <h1 class="queue-hero-title">Wartenummer ziehen</h1>
    <p class="queue-hero-sub">
      Kein Termin? Ziehen Sie hier eine Wartenummer und warten Sie bequem.
    </p>
  </div>
</div>

<div class="container queue-container">
  {#if !ticket}
    <div class="queue-form-card card">
      <div class="queue-form-header card-header">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" stroke="#3b82f6" stroke-width="1.5"/>
          <path d="M10 6v4l3 2" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Ihre Angaben
      </div>
      <div class="card-body">
        {#if error}
          <div class="alert alert-error" role="alert" style="margin-bottom: 1.25rem;">
            <svg class="alert-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="#dc2626" stroke-width="1.3"/>
              <path d="M8 5v3M8 10h.01" stroke="#dc2626" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            {error}
          </div>
        {/if}

        <!-- Location -->
        {#if loadingLocations}
          <div class="loading-state" style="padding: 1.5rem;">
            <div class="spinner"></div>
            <p>Standorte werden geladen...</p>
          </div>
        {:else if locations.length > 1}
          <div class="form-group">
            <label for="q-location" class="form-label">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1C4.24 1 2 3.24 2 6c0 3.75 5 8 5 8s5-4.25 5-8c0-2.76-2.24-5-5-5z" stroke="#3b82f6" stroke-width="1.3"/>
                <circle cx="7" cy="6" r="2" fill="#3b82f6"/>
              </svg>
              Standort <span class="required">*</span>
            </label>
            <select id="q-location" class="form-input form-select" bind:value={locationId}
                    on:change={loadServices} required>
              <option value="">Standort wählen...</option>
              {#each locations as loc}
                <option value={loc.id}>{loc.name}{loc.city ? ' – ' + loc.city : ''}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Service (optional) -->
        {#if services.length > 0}
          <div class="form-group">
            <label for="q-service" class="form-label">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="12" height="12" rx="2" stroke="#3b82f6" stroke-width="1.3"/>
                <path d="M4 7h6M7 4v6" stroke="#3b82f6" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              Dienstleistung <span class="optional">(optional)</span>
            </label>
            <select id="q-service" class="form-input form-select" bind:value={serviceId}>
              <option value="">Allgemeine Warteschlange</option>
              {#each services as svc}
                <option value={svc.id}>{svc.name}{svc.durationMinutes ? ' (~' + svc.durationMinutes + ' Min.)' : ''}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Name -->
        <div class="form-group">
          <label for="q-name" class="form-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="4.5" r="2.5" stroke="#3b82f6" stroke-width="1.3"/>
              <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#3b82f6" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            Name <span class="optional">(optional)</span>
          </label>
          <input id="q-name" type="text" class="form-input" bind:value={citizenName}
                 placeholder="Ihr Name für den Aufruf">
        </div>

        <button class="btn btn-primary btn-full btn-lg" on:click={getTicket}
                disabled={loading || (!locationId && locations.length > 1)} aria-busy={loading}>
          {#if loading}
            <div class="spinner spinner-sm spinner-white"></div>
            Wartenummer wird erstellt...
          {:else}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="2" y="3" width="14" height="13" rx="2" stroke="white" stroke-width="1.5"/>
              <path d="M6 7h6M9 4v6" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Wartenummer ziehen
          {/if}
        </button>
      </div>

      <!-- Info Footer -->
      <div class="card-footer" style="text-align: center; font-size: 0.8125rem;">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="6" stroke="#64748b" stroke-width="1.2"/>
          <path d="M7 5.5v3M7 10h.01" stroke="#64748b" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        Ihre Wartenummer wird sofort angezeigt und ist am Bildschirm sichtbar.
      </div>
    </div>
  {:else}
    <!-- Ticket Display -->
    <div class="ticket-display">
      <div class="ticket-success-icon" aria-hidden="true">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="28" fill="#dcfce7"/>
          <path d="M15 28l9 9L41 18" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h2 class="ticket-title">Ihre Wartenummer</h2>
      <div class="ticket-number-display" aria-label="Wartenummer {ticket.ticketNumber || ticket.data?.ticketNumber}">
        {ticket.ticketNumber || ticket.data?.ticketNumber || '—'}
      </div>

      {#if ticket.estimatedWaitMinutes > 0 || ticket.data?.estimatedWaitMinutes > 0}
        <div class="ticket-wait-info">
          <div class="ticket-wait-label">Geschätzte Wartezeit</div>
          <div class="ticket-wait-value">
            ca. {ticket.estimatedWaitMinutes || ticket.data?.estimatedWaitMinutes} Minuten
          </div>
        </div>
      {/if}

      <div class="ticket-notice">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="#3b82f6" stroke-width="1.3"/>
          <path d="M8 5.5v3M8 10h.01" stroke="#3b82f6" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        Bitte behalten Sie diese Nummer und warten Sie auf Ihren Aufruf auf dem Display.
      </div>

      <div class="ticket-actions">
        <button class="btn btn-secondary" on:click={reset}>
          Neue Wartenummer
        </button>
        <a href="/display" class="btn btn-outline">
          Anzeigetafel öffnen
        </a>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Hero */
  .queue-hero {
    background: linear-gradient(135deg, var(--aitema-navy) 0%, var(--aitema-blue) 100%);
    padding: 2.5rem 1.5rem;
  }
  .queue-hero-title {
    font-size: 1.75rem; font-weight: 800;
    color: #fff; margin-bottom: 0.375rem; letter-spacing: -0.025em;
  }
  .queue-hero-sub { font-size: 0.9375rem; color: rgba(255,255,255,0.7); margin: 0; }

  /* Container */
  .queue-container { padding-top: 2rem; padding-bottom: 4rem; max-width: 520px; }

  /* Form Card */
  .queue-form-card { }

  .required { color: var(--aitema-red); margin-left: 0.25rem; }
  .optional { color: var(--aitema-muted); font-weight: 400; font-size: 0.875em; margin-left: 0.25rem; }

  /* Ticket Display */
  .ticket-display {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; padding: 2rem 1.5rem;
    background: #fff; border: 1px solid var(--aitema-slate-200);
    border-radius: 1rem; box-shadow: var(--shadow-lg);
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }

  .ticket-success-icon { margin-bottom: 1.25rem; }
  .ticket-title {
    font-size: 0.875rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--aitema-muted); margin-bottom: 0.75rem;
  }
  .ticket-number-display {
    font-size: 5rem; font-weight: 900; letter-spacing: 0.1em;
    background: linear-gradient(135deg, var(--aitema-accent), var(--aitema-emerald));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 1.5rem;
    filter: drop-shadow(0 2px 8px rgba(59,130,246,0.2));
  }
  .ticket-wait-info {
    background: var(--aitema-slate-50); border: 1px solid var(--aitema-slate-200);
    border-radius: 0.625rem; padding: 0.875rem 2rem;
    margin-bottom: 1.5rem;
  }
  .ticket-wait-label { font-size: 0.75rem; color: var(--aitema-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
  .ticket-wait-value { font-size: 1.25rem; font-weight: 800; color: var(--aitema-navy); }
  .ticket-notice {
    display: flex; align-items: flex-start; gap: 0.625rem;
    background: #dbeafe; border: 1px solid #93c5fd; border-radius: 0.5rem;
    padding: 0.875rem 1rem; font-size: 0.875rem; color: #1e40af;
    text-align: left; margin-bottom: 2rem; max-width: 360px;
  }
  .ticket-notice svg { flex-shrink: 0; margin-top: 1px; }
  .ticket-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; }

  /* Spinner */
  .spinner {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2.5px solid var(--aitema-slate-200);
    border-top-color: var(--aitema-accent);
    animation: spin 0.7s linear infinite;
  }
  .spinner-sm { width: 16px; height: 16px; border-width: 2px; }
  .spinner-white { border-color: rgba(255,255,255,0.3); border-top-color: #fff; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .loading-state { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; color: var(--aitema-muted); font-size: 0.875rem; }
</style>
