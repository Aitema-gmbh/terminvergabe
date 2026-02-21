<script lang="ts">
  import { onMount } from 'svelte';

  let step = 0;
  const steps = ['Standort', 'Dienstleistung', 'Termin', 'Daten', 'Bestaetigung'];
  
  let locations: any[] = [];
  let services: any[] = [];
  let slots: any[] = [];
  let loading = false;
  
  // Selections
  let selectedLocation: any = null;
  let selectedService: any = null;
  let selectedDate = '';
  let selectedSlot: any = null;
  
  // Form
  let citizenName = '';
  let citizenEmail = '';
  let citizenPhone = '';
  
  // Result
  let booking: any = null;
  let error = '';

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const TENANT = import.meta.env.VITE_TENANT_SLUG || 'musterstadt';

  onMount(async () => {
    loading = true;
    try {
      const resp = await fetch(`${API}/api/v1/${TENANT}/locations`);
      const data = await resp.json();
      locations = data.locations || [];
    } catch (e) {
      console.error('Failed to load locations:', e);
    }
    loading = false;
  });

  async function loadServices() {
    if (!selectedLocation) return;
    loading = true;
    try {
      const resp = await fetch(
        `${API}/api/v1/${TENANT}/services?locationId=${selectedLocation.id}`
      );
      const data = await resp.json();
      services = data.services || [];
    } catch (e) {
      console.error('Failed to load services:', e);
    }
    loading = false;
  }

  async function loadSlots() {
    if (!selectedLocation || !selectedService || !selectedDate) return;
    loading = true;
    slots = [];
    try {
      const resp = await fetch(
        `${API}/api/v1/${TENANT}/slots?` +
        `locationId=${selectedLocation.id}&serviceId=${selectedService.id}&date=${selectedDate}`
      );
      const data = await resp.json();
      slots = data.slots || [];
    } catch (e) {
      console.error('Failed to load slots:', e);
    }
    loading = false;
  }

  async function submitBooking() {
    loading = true;
    error = '';
    try {
      const resp = await fetch(`${API}/api/v1/${TENANT}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedLocation.id,
          serviceId: selectedService.id,
          date: selectedDate,
          startTime: selectedSlot.start,
          citizenName,
          citizenEmail,
          citizenPhone,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        booking = data;
        step = 4;
      } else {
        error = data.error || 'Buchung fehlgeschlagen';
      }
    } catch (e: any) {
      error = e.message || 'Verbindungsfehler';
    }
    loading = false;
  }

  function selectLocation(loc: any) {
    selectedLocation = loc;
    step = 1;
    loadServices();
  }

  function selectService(svc: any) {
    selectedService = svc;
    step = 2;
  }

  function selectSlot(slot: any) {
    selectedSlot = slot;
    step = 3;
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
</script>

<svelte:head>
  <title>Termin buchen - aitema|Termin</title>
</svelte:head>

<!-- Page Header -->
<div class="page-hero">
  <div class="hero-text">
    <h1 class="page-title">Termin buchen</h1>
    <p class="page-subtitle">Schnell, einfach und sicher – buchen Sie Ihren Termin in wenigen Schritten</p>
  </div>
</div>

<!-- 5-Step Progress Bar -->
<nav class="booking-progress-bar" aria-label="Buchungsfortschritt">
  {#each steps as label, i}
    <div class="progress-step-wrap">
      <div class="progress-step-inner">
        <div class="step-circle-new"
             class:step-active={step === i}
             class:step-done={step > i}
             aria-current={step === i ? 'step' : undefined}>
          {#if step > i}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8l3.5 3.5L13 4" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {:else}
            <span>{i + 1}</span>
          {/if}
        </div>
        {#if i < steps.length - 1}
          <div class="connector-line" class:connector-done={step > i}></div>
        {/if}
      </div>
      <span class="step-label-new"
            class:label-active={step === i}
            class:label-done={step > i}>
        {label}
      </span>
    </div>
  {/each}
</nav>

{#if error}
  <div class="error-alert" role="alert">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="8" stroke="#991b1b" stroke-width="1.5"/>
      <path d="M9 5.5v4M9 11.5h.01" stroke="#991b1b" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
    {error}
  </div>
{/if}

<!-- Step 0: Standort -->
{#if step === 0}
  <section class="wizard-step" aria-label="Standort auswaehlen">
    <h2 class="step-heading">Waehlen Sie einen Standort</h2>
    {#if loading}
      <div class="loading-state" role="status">
        <div class="spinner"></div>
        <p>Standorte werden geladen...</p>
      </div>
    {:else if locations.length === 0}
      <div class="empty-state">
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
          <circle cx="26" cy="26" r="22" stroke="#e2e8f0" stroke-width="2"/>
          <path d="M26 16v10l6 4" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p>Keine Standorte verfuegbar.</p>
      </div>
    {:else}
      <div class="location-grid-new">
        {#each locations as loc}
          <button class="location-card-new" on:click={() => selectLocation(loc)}
                  aria-label="{loc.name} auswaehlen">
            <div class="loc-icon">
              <span aria-hidden="true">📍</span>
            </div>
            <div class="loc-body">
              <h3 class="loc-name">{loc.name}</h3>
              {#if loc.address}
                <p class="loc-addr">{loc.address}</p>
              {/if}
              {#if loc.city}
                <p class="loc-addr">{loc.postalCode} {loc.city}</p>
              {/if}
            </div>
            <div class="loc-arrow" aria-hidden="true">›</div>
          </button>
        {/each}
      </div>
    {/if}
  </section>
{/if}

<!-- Step 1: Dienstleistung -->
{#if step === 1}
  <section class="wizard-step" aria-label="Dienstleistung auswaehlen">
    <div class="step-header-row">
      <h2 class="step-heading">Dienstleistung auswaehlen</h2>
      <p class="step-context">
        📍 <strong>{selectedLocation?.name}</strong>
      </p>
    </div>
    {#if loading}
      <div class="loading-state" role="status">
        <div class="spinner"></div>
        <p>Dienstleistungen werden geladen...</p>
      </div>
    {:else if services.length === 0}
      <div class="empty-state">
        <p>Keine Dienstleistungen verfuegbar.</p>
      </div>
    {:else}
      <div class="service-grid-new">
        {#each services as svc}
          <button class="service-card-new" on:click={() => selectService(svc)}
                  aria-label="{svc.name}, ca. {svc.duration} Minuten">
            <div class="svc-icon" aria-hidden="true">⏱️</div>
            <div class="svc-body">
              <h3 class="svc-name">{svc.name}</h3>
              {#if svc.description}
                <p class="svc-desc">{svc.description}</p>
              {/if}
            </div>
            <span class="svc-duration-badge">{svc.duration || svc.durationMinutes} Min.</span>
          </button>
        {/each}
      </div>
    {/if}
    <div class="step-nav">
      <button class="btn-back" on:click={() => step = 0}>
        ← Zurück
      </button>
    </div>
  </section>
{/if}

<!-- Step 2: Termin -->
{#if step === 2}
  <section class="wizard-step" aria-label="Termin auswaehlen">
    <div class="step-header-row">
      <h2 class="step-heading">Datum und Uhrzeit wählen</h2>
      <p class="step-context">{selectedService?.name} bei {selectedLocation?.name}</p>
    </div>

    <div class="termin-card">
      <div class="date-picker-wrap">
        <label for="booking-date" class="date-label">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="3" width="12" height="11" rx="2" stroke="#3b82f6" stroke-width="1.3"/>
            <path d="M5 1v4M11 1v4M2 7h12" stroke="#3b82f6" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          Datum wählen
        </label>
        <input id="booking-date" type="date" class="date-input-new"
               bind:value={selectedDate} on:change={loadSlots}
               min={minDate} max={maxDate}>
      </div>

      {#if selectedDate}
        {#if loading}
          <div class="loading-state" role="status">
            <div class="spinner"></div>
            <p>Verfügbare Zeiten laden...</p>
          </div>
        {:else if slots.length === 0}
          <div class="empty-state small">
            <p>Keine freien Termine an diesem Tag.</p>
          </div>
        {:else}
          <div class="slots-section-new">
            <p class="slots-heading">Verfügbare Uhrzeiten</p>
            <div class="slots-grid-new" role="listbox" aria-label="Verfügbare Uhrzeiten">
              {#each slots as slot}
                <button
                  class="slot-btn-new"
                  class:slot-selected={selectedSlot === slot}
                  class:slot-taken={slot.taken}
                  role="option"
                  aria-selected={selectedSlot === slot}
                  disabled={slot.taken}
                  on:click={() => !slot.taken && selectSlot(slot)}
                >
                  {formatTime(slot.start)}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {/if}
    </div>

    <div class="step-nav">
      <button class="btn-back" on:click={() => step = 1}>← Zurück</button>
    </div>
  </section>
{/if}

<!-- Step 3: Persönliche Daten -->
{#if step === 3}
  <section class="wizard-step" aria-label="Persönliche Daten eingeben">
    <div class="step-header-row">
      <h2 class="step-heading">Ihre Daten</h2>
      <p class="step-context">
        {selectedService?.name} · {new Date(selectedDate).toLocaleDateString('de-DE')} um {formatTime(selectedSlot?.start)} Uhr
      </p>
    </div>

    <div class="form-layout">
      <div class="form-card-new">
        <div class="form-field">
          <label for="citizen-name" class="field-label">Name <span class="req">*</span></label>
          <input id="citizen-name" type="text" class="field-input"
                 class:field-valid={citizenName.length > 1}
                 class:field-error={citizenName.length === 0 && loading}
                 bind:value={citizenName} required
                 placeholder="Ihr vollständiger Name">
        </div>
        <div class="form-field">
          <label for="citizen-email" class="field-label">E-Mail</label>
          <input id="citizen-email" type="email" class="field-input"
                 class:field-valid={citizenEmail.includes('@')}
                 bind:value={citizenEmail}
                 placeholder="für Terminbestätigung">
        </div>
        <div class="form-field">
          <label for="citizen-phone" class="field-label">Telefon</label>
          <input id="citizen-phone" type="tel" class="field-input"
                 class:field-valid={citizenPhone.length > 5}
                 bind:value={citizenPhone}
                 placeholder="für Rückfragen">
        </div>

        {#if selectedService?.requiredDocs?.length > 0}
          <div class="docs-notice">
            <div class="docs-title">
              ⚠️ Benötigte Unterlagen
            </div>
            <ul class="docs-list">
              {#each selectedService.requiredDocs as doc}
                <li>{doc}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="form-actions-new">
          <button class="btn-back" on:click={() => step = 2}>← Zurück</button>
          <button class="btn-primary-new" on:click={submitBooking}
                  disabled={!citizenName || loading}>
            {#if loading}
              <div class="spinner spinner-sm spinner-white"></div>
              Wird gebucht...
            {:else}
              Termin buchen →
            {/if}
          </button>
        </div>
      </div>

      <!-- Buchungs-Summary Sidebar -->
      <aside class="summary-sidebar" aria-label="Buchungszusammenfassung">
        <h3 class="summary-title">Ihre Buchung</h3>
        <div class="summary-rows">
          <div class="summary-row">
            <span class="summary-icon" aria-hidden="true">📍</span>
            <div>
              <p class="summary-lbl">Standort</p>
              <p class="summary-val">{selectedLocation?.name}</p>
            </div>
          </div>
          <div class="summary-row">
            <span class="summary-icon" aria-hidden="true">📋</span>
            <div>
              <p class="summary-lbl">Dienstleistung</p>
              <p class="summary-val">{selectedService?.name}</p>
            </div>
          </div>
          <div class="summary-row">
            <span class="summary-icon" aria-hidden="true">🕐</span>
            <div>
              <p class="summary-lbl">Datum & Uhrzeit</p>
              <p class="summary-val">
                {new Date(selectedDate).toLocaleDateString('de-DE')} · {formatTime(selectedSlot?.start)} Uhr
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
{/if}

<!-- Step 4: Bestätigung -->
{#if step === 4 && booking}
  <section class="wizard-step" aria-label="Buchungsbestätigung">
    <div class="confirmation-card-new">
      <!-- Erfolgs-Icon -->
      <div class="success-icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="24" fill="#059669" opacity="0.15"/>
          <circle cx="24" cy="24" r="18" fill="#059669" opacity="0.2"/>
          <path d="M13 24l7.5 7.5L35 16" stroke="#059669" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <h2 class="confirmation-title">Termin erfolgreich gebucht!</h2>

      <div class="booking-ref">
        <p class="ref-label">Buchungsnummer</p>
        <p class="ref-value">{booking.bookingRef}</p>
      </div>

      <div class="detail-table">
        <div class="detail-row">
          <span class="detail-lbl">Dienstleistung</span>
          <span class="detail-val">{selectedService?.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-lbl">Standort</span>
          <span class="detail-val">{selectedLocation?.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-lbl">Datum</span>
          <span class="detail-val">
            {new Date(selectedDate).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-lbl">Uhrzeit</span>
          <span class="detail-val">{formatTime(selectedSlot?.start)} Uhr</span>
        </div>
      </div>

      {#if citizenEmail}
        <p class="email-confirm">
          ✉️ Bestätigung an <strong>{citizenEmail}</strong> gesendet.
        </p>
      {/if}

      <!-- QR-Code -->
      <div class="qr-area">
        <div class="qr-placeholder">
          <span>QR</span>
        </div>
        <p class="qr-hint">QR-Code zum Einchecken</p>
      </div>

      <div class="confirm-actions">
        <a href="/buchen" class="btn-primary-new">
          + Weiteren Termin buchen
        </a>
        <a href="/status" class="btn-secondary-new">
          Termin verwalten
        </a>
      </div>
    </div>
  </section>
{/if}

<style>
  /* ── Page Hero ────────────────────────────────────────── */
  .page-hero {
    background: linear-gradient(135deg, var(--aitema-navy) 0%, var(--aitema-blue) 100%);
    padding: 2.5rem 2rem 2rem;
    margin-bottom: 0;
    border-radius: 0;
  }
  .hero-text { max-width: 700px; }
  .page-title {
    font-size: 2rem; font-weight: 800; letter-spacing: -0.03em;
    color: #fff; margin-bottom: 0.375rem;
  }
  .page-subtitle { color: rgba(255,255,255,0.7); font-size: 1rem; }

  /* ── 5-Step Progress Bar ──────────────────────────────── */
  .booking-progress-bar {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    background: #fff;
    border-bottom: 1px solid var(--aitema-slate-200);
    padding: 1.5rem 1rem 1rem;
    overflow-x: auto;
    gap: 0;
  }
  .progress-step-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .progress-step-inner {
    display: flex;
    align-items: center;
  }
  .step-circle-new {
    width: 46px; height: 46px;
    border-radius: 50%;
    border: 2.5px solid var(--aitema-slate-300);
    background: #fff;
    color: var(--aitema-muted);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.9375rem; font-weight: 700;
    transition: all 0.25s ease;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }
  .step-circle-new.step-active {
    border-color: var(--aitema-accent);
    background: var(--aitema-accent);
    color: #fff;
    box-shadow: 0 0 0 5px rgba(59,130,246,0.18), 0 4px 14px rgba(59,130,246,0.4);
  }
  .step-circle-new.step-done {
    border-color: var(--aitema-emerald);
    background: var(--aitema-emerald);
    color: #fff;
  }
  .connector-line {
    width: 3.5rem; height: 3px;
    background: var(--aitema-slate-200);
    transition: background 0.3s ease;
    flex-shrink: 0;
  }
  .connector-line.connector-done {
    background: var(--aitema-emerald);
  }
  .step-label-new {
    font-size: 0.6875rem; font-weight: 500;
    color: var(--aitema-muted);
    white-space: nowrap;
    max-width: 80px;
    text-align: center;
    transition: color 0.2s;
  }
  .step-label-new.label-active { color: var(--aitema-accent); font-weight: 700; }
  .step-label-new.label-done { color: var(--aitema-emerald); font-weight: 600; }

  /* ── Error Alert ─────────────────────────────────────── */
  .error-alert {
    display: flex; align-items: center; gap: 0.625rem;
    background: #fef2f2; border: 1px solid #fca5a5;
    color: #991b1b; padding: 0.875rem 1.25rem;
    border-radius: 0.5rem; margin: 1.25rem 0;
    font-size: 0.875rem; font-weight: 500;
  }

  /* ── Wizard Step Wrapper ─────────────────────────────── */
  .wizard-step {
    padding: 2rem 0;
    animation: step-slide-in 0.22s ease;
  }
  @keyframes step-slide-in {
    from { opacity: 0; transform: translateX(14px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .step-heading { font-size: 1.375rem; font-weight: 800; color: var(--aitema-navy); margin-bottom: 0.25rem; }
  .step-header-row { margin-bottom: 1.5rem; }
  .step-context { font-size: 0.875rem; color: var(--aitema-muted); display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap; margin-top: 0.25rem; }

  /* ── Loading / Empty ─────────────────────────────────── */
  .loading-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.875rem;
    padding: 3rem; color: var(--aitema-muted); font-size: 0.9375rem;
  }
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.875rem;
    padding: 2.5rem; color: var(--aitema-muted); text-align: center;
  }
  .empty-state.small { padding: 1.5rem; }

  /* ── Step 1: Location Grid ───────────────────────────── */
  .location-grid-new {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
  .location-card-new {
    display: flex; align-items: center; gap: 1rem;
    padding: 1.375rem 1.5rem;
    background: #fff;
    border: 2px solid var(--aitema-slate-200);
    border-radius: 0.875rem;
    cursor: pointer; text-align: left;
    transition: all 0.18s ease;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  }
  .location-card-new:hover {
    border-color: var(--aitema-accent);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.12), 0 4px 16px rgba(59,130,246,0.15);
    transform: translateY(-2px);
  }
  .location-card-new:focus-visible { outline: 3px solid var(--aitema-accent); outline-offset: 2px; }
  .loc-icon {
    width: 48px; height: 48px; flex-shrink: 0;
    border-radius: 0.75rem; background: #eff6ff;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.375rem;
  }
  .loc-body { flex: 1; min-width: 0; }
  .loc-name { font-size: 1rem; font-weight: 700; color: var(--aitema-navy); margin-bottom: 0.2rem; }
  .loc-addr { font-size: 0.8125rem; color: var(--aitema-muted); margin: 0; }
  .loc-arrow { font-size: 1.5rem; color: var(--aitema-muted); flex-shrink: 0; }

  /* ── Step 2: Service Grid ────────────────────────────── */
  .service-grid-new {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .service-card-new {
    display: flex; flex-direction: column; align-items: flex-start;
    padding: 1.375rem 1.5rem;
    background: #fff;
    border: 2px solid var(--aitema-slate-200);
    border-radius: 0.875rem;
    cursor: pointer; text-align: left;
    transition: all 0.18s ease;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    gap: 0.5rem;
  }
  .service-card-new:hover {
    border-color: var(--aitema-accent);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.12), 0 4px 16px rgba(59,130,246,0.15);
    transform: translateY(-2px);
  }
  .service-card-new:focus-visible { outline: 3px solid var(--aitema-accent); outline-offset: 2px; }
  .svc-icon { font-size: 1.5rem; }
  .svc-body { flex: 1; }
  .svc-name { font-size: 0.9375rem; font-weight: 700; color: var(--aitema-navy); margin-bottom: 0.2rem; }
  .svc-desc { font-size: 0.8125rem; color: var(--aitema-muted); margin: 0; }
  .svc-duration-badge {
    display: inline-flex; align-items: center;
    background: var(--aitema-slate-100); color: var(--aitema-muted);
    padding: 0.2rem 0.75rem; border-radius: 9999px;
    font-size: 0.75rem; font-weight: 600;
    margin-top: 0.25rem;
  }

  /* ── Step 3: Termin / Date + Slots ──────────────────── */
  .termin-card {
    background: #fff;
    border: 1px solid var(--aitema-slate-200);
    border-radius: 0.875rem;
    padding: 1.75rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  }
  .date-picker-wrap { margin-bottom: 1.5rem; }
  .date-label {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.9375rem; font-weight: 600; color: var(--aitema-navy);
    margin-bottom: 0.5rem;
  }
  .date-input-new {
    padding: 0.75rem 1rem; border: 1.5px solid var(--aitema-slate-200);
    border-radius: 0.5rem; font-size: 0.9375rem; font-family: inherit;
    color: var(--aitema-text); background: #fff; cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    max-width: 220px;
  }
  .date-input-new:focus {
    border-color: var(--aitema-accent);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
    outline: none;
  }
  .slots-section-new { }
  .slots-heading { font-size: 0.9rem; font-weight: 600; color: var(--aitema-navy); margin-bottom: 0.875rem; }
  .slots-grid-new { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .slot-btn-new {
    padding: 0.5rem 1.25rem; border: 1.5px solid var(--aitema-slate-200);
    border-radius: 0.5rem; background: #fff; cursor: pointer;
    font-size: 0.875rem; font-weight: 600; color: var(--aitema-text);
    min-height: 44px; min-width: 80px; transition: all 0.15s;
  }
  .slot-btn-new:hover:not(:disabled) {
    border-color: var(--aitema-accent);
    background: #eff6ff;
    color: var(--aitema-accent);
  }
  .slot-btn-new.slot-selected {
    border-color: var(--aitema-accent);
    background: var(--aitema-accent);
    color: #fff;
    box-shadow: 0 4px 12px rgba(59,130,246,0.35);
  }
  .slot-btn-new.slot-taken {
    background: var(--aitema-slate-50);
    color: var(--aitema-slate-300);
    cursor: not-allowed;
    text-decoration: line-through;
    border-color: var(--aitema-slate-200);
  }
  .slot-btn-new:focus-visible { outline: 3px solid var(--aitema-accent); outline-offset: 2px; }

  /* ── Step 4: Formulardaten ──────────────────────────── */
  .form-layout {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    align-items: start;
  }
  .form-card-new {
    background: #fff; border: 1px solid var(--aitema-slate-200);
    border-radius: 0.875rem; padding: 1.75rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  }
  .form-field { margin-bottom: 1.25rem; }
  .field-label {
    display: block; font-size: 0.9375rem; font-weight: 600;
    color: var(--aitema-navy); margin-bottom: 0.5rem;
  }
  .req { color: var(--aitema-red); margin-left: 0.25rem; }
  .field-input {
    width: 100%; padding: 0.75rem 1rem;
    border: 1.5px solid var(--aitema-slate-200);
    border-radius: 0.5rem; font-size: 0.9375rem;
    font-family: inherit; color: var(--aitema-text); background: #fff;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .field-input:focus {
    border-color: var(--aitema-accent);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
    outline: none;
  }
  .field-input.field-valid { border-color: var(--aitema-emerald); }
  .field-input.field-error { border-color: var(--aitema-red); }

  .docs-notice {
    background: #fffbeb; border: 1px solid #fcd34d;
    border-radius: 0.5rem; padding: 1rem; margin-top: 0.5rem; margin-bottom: 1rem;
  }
  .docs-title { font-size: 0.875rem; font-weight: 700; color: #92400e; margin-bottom: 0.5rem; }
  .docs-list { margin-left: 1.25rem; font-size: 0.875rem; color: #78350f; }

  .form-actions-new {
    display: flex; gap: 0.75rem; align-items: center; margin-top: 1.5rem; flex-wrap: wrap;
  }

  /* Summary Sidebar */
  .summary-sidebar {
    background: linear-gradient(135deg, var(--aitema-navy) 0%, var(--aitema-blue) 100%);
    border-radius: 0.875rem; padding: 1.5rem; color: #fff;
    position: sticky; top: 88px;
  }
  .summary-title {
    font-size: 0.8125rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.07em; color: rgba(255,255,255,0.55); margin-bottom: 1.125rem;
  }
  .summary-rows { display: flex; flex-direction: column; gap: 1rem; }
  .summary-row { display: flex; align-items: flex-start; gap: 0.75rem; }
  .summary-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 2px; }
  .summary-lbl { font-size: 0.75rem; color: rgba(255,255,255,0.55); margin-bottom: 0.125rem; }
  .summary-val { font-size: 0.875rem; font-weight: 600; color: #fff; }

  /* ── Step 5: Bestätigung ────────────────────────────── */
  .confirmation-card-new {
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    border: 2px solid var(--aitema-emerald);
    border-radius: 1.25rem; padding: 2.5rem;
    max-width: 560px; margin: 0 auto;
    text-align: center;
    box-shadow: 0 8px 32px rgba(5,150,105,0.12);
    animation: step-slide-in 0.3s ease;
  }
  .success-icon { margin-bottom: 1.25rem; }
  .confirmation-title {
    font-size: 1.5rem; font-weight: 800; color: var(--aitema-navy); margin-bottom: 1.5rem;
  }
  .booking-ref {
    background: linear-gradient(135deg, var(--aitema-navy), var(--aitema-blue));
    border-radius: 0.875rem; padding: 1rem 1.5rem; margin-bottom: 1.5rem;
    display: inline-block; width: 100%;
  }
  .ref-label {
    font-size: 0.75rem; color: rgba(255,255,255,0.65);
    text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.25rem;
  }
  .ref-value { font-size: 1.625rem; font-weight: 800; color: #fff; letter-spacing: 0.06em; }

  .detail-table { text-align: left; margin-bottom: 1.25rem; }
  .detail-row {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 0.75rem 0; border-bottom: 1px solid rgba(5,150,105,0.15);
    font-size: 0.875rem; gap: 1rem;
  }
  .detail-row:last-child { border-bottom: none; }
  .detail-lbl { color: var(--aitema-muted); }
  .detail-val { font-weight: 600; color: var(--aitema-navy); text-align: right; }

  .email-confirm {
    font-size: 0.875rem; color: var(--aitema-emerald);
    margin-bottom: 1.5rem; display: flex; align-items: center;
    justify-content: center; gap: 0.375rem; flex-wrap: wrap;
  }

  .qr-area { margin-bottom: 2rem; }
  .qr-placeholder {
    width: 110px; height: 110px;
    border: 3px dashed #059669; border-radius: 0.875rem;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 0.625rem; background: #fff;
    font-size: 1.5rem; font-weight: 700; color: #059669;
  }
  .qr-hint { font-size: 0.75rem; color: var(--aitema-muted); }

  .confirm-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }

  /* ── Buttons ─────────────────────────────────────────── */
  .btn-primary-new {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.75rem 1.75rem; border-radius: 0.625rem;
    background: linear-gradient(135deg, var(--aitema-accent), var(--aitema-accent-hover));
    color: #fff; border: none; font-size: 0.9375rem; font-weight: 700;
    cursor: pointer; min-height: 48px;
    box-shadow: 0 4px 14px rgba(59,130,246,0.35);
    transition: all 0.15s ease; text-decoration: none;
  }
  .btn-primary-new:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(59,130,246,0.45);
    color: #fff;
  }
  .btn-primary-new:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn-primary-new:focus-visible { outline: 3px solid var(--aitema-amber); outline-offset: 3px; }

  .btn-secondary-new {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.75rem 1.75rem; border-radius: 0.625rem;
    background: #fff; color: var(--aitema-text);
    border: 1.5px solid var(--aitema-slate-200);
    font-size: 0.9375rem; font-weight: 600; cursor: pointer;
    min-height: 48px; transition: all 0.15s; text-decoration: none;
  }
  .btn-secondary-new:hover { background: var(--aitema-slate-50); border-color: var(--aitema-slate-300); color: var(--aitema-text); }

  .btn-back {
    display: inline-flex; align-items: center; gap: 0.375rem;
    padding: 0.5rem 1.125rem;
    background: #fff; border: 1px solid var(--aitema-slate-200);
    border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600;
    color: var(--aitema-muted); cursor: pointer; min-height: 40px;
    transition: all 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .btn-back:hover { background: var(--aitema-slate-100); color: var(--aitema-text); }

  .step-nav { display: flex; gap: 0.75rem; align-items: center; margin-top: 1.25rem; }

  /* ── Spinner ─────────────────────────────────────────── */
  .spinner {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2.5px solid var(--aitema-slate-200);
    border-top-color: var(--aitema-accent);
    animation: spin 0.7s linear infinite; flex-shrink: 0;
  }
  .spinner-sm { width: 16px; height: 16px; border-width: 2px; }
  .spinner-white { border-color: rgba(255,255,255,0.3); border-top-color: #fff; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Responsive ─────────────────────────────────────── */
  @media (max-width: 900px) {
    .form-layout { grid-template-columns: 1fr; }
    .summary-sidebar { position: static; order: -1; }
  }
  @media (max-width: 640px) {
    .page-hero { padding: 1.5rem 1rem 1.25rem; }
    .page-title { font-size: 1.5rem; }
    .booking-progress-bar { padding: 1rem 0.5rem 0.75rem; }
    .connector-line { width: 2rem; }
    .step-label-new { font-size: 0.625rem; max-width: 60px; }
    .step-circle-new { width: 38px; height: 38px; font-size: 0.875rem; }
    .wizard-step { padding: 1.25rem 0; }
    .location-grid-new { grid-template-columns: 1fr; }
    .service-grid-new { grid-template-columns: 1fr; }
    .confirmation-card-new { padding: 1.5rem; }
    .form-card-new { padding: 1.25rem; }
    .termin-card { padding: 1.25rem; }
  }
</style>
