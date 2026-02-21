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
  
  // D2: Video-Termin
  let appointmentType: 'inperson' | 'video' = 'inperson';

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
      const resp = await fetch(`${API}/api/v1/${TENANT}/book`, {
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
          appointmentType,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        booking = data;
        // T2: QR-Code aus Antwort
        if (data.appointment?.qrCodeDataUrl) {
          booking.qrCodeDataUrl = data.appointment.qrCodeDataUrl;
        } else if (data.qrCodeDataUrl) {
          booking.qrCodeDataUrl = data.qrCodeDataUrl;
        }
        step = 4;
        // M1: Plausible Custom Event – Termin gebucht
        if (typeof window !== 'undefined' && (window as any).plausible) {
          (window as any).plausible('termin_gebucht', { props: { service: selectedService?.name } });
        }
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
  <h1 class="page-title">Termin buchen</h1>
  <p class="page-subtitle">Schnell, einfach und sicher – buchen Sie Ihren Termin in wenigen Schritten</p>
</div>

<!-- Progress Steps -->
<nav class="progress-nav" aria-label="Buchungsfortschritt">
  <!-- Progress Bar Background -->
  <div class="progress-track">
    <div class="progress-fill" style="width: {step === 4 ? 100 : (step / (steps.length - 1)) * 100}%"></div>
  </div>
  <ol class="step-list">
    {#each steps as s, i}
      <li
        class="step-item"
        class:step-active={step === i}
        class:step-done={step > i}
        aria-current={step === i ? 'step' : undefined}
      >
        <div class="step-circle">
          {#if step > i}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 7L5.5 10.5L12 3.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {:else}
            <span>{i + 1}</span>
          {/if}
        </div>
        <span class="step-label">{s}</span>
      </li>
    {/each}
  </ol>
</nav>

{#if error}
  <div class="alert-error" role="alert">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="#991b1b" stroke-width="1.5"/>
      <path d="M8 5v3M8 10h.01" stroke="#991b1b" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    {error}
  </div>
{/if}

<!-- Step 0: Location -->
{#if step === 0}
  <section class="step-section" aria-label="Standort waehlen">
    <h2 class="section-title">Waehlen Sie einen Standort</h2>
    {#if loading}
      <div class="loading-state" role="status">
        <div class="spinner"></div>
        <p>Standorte werden geladen...</p>
      </div>
    {:else if locations.length === 0}
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="20" stroke="#e2e8f0" stroke-width="2"/>
          <path d="M24 14v10l6 4" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p>Keine Standorte verfuegbar.</p>
      </div>
    {:else}
      <div class="location-grid">
        {#each locations as loc}
          <button class="location-card" on:click={() => selectLocation(loc)}
                  aria-label="{loc.name} auswaehlen">
            <div class="location-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#3b82f6" opacity="0.15"/>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#3b82f6" stroke-width="1.5"/>
                <circle cx="12" cy="9" r="2.5" fill="#3b82f6"/>
              </svg>
            </div>
            <div class="location-info">
              <h3 class="location-name">{loc.name}</h3>
              {#if loc.address}
                <p class="location-address">{loc.address}</p>
              {/if}
              {#if loc.city}
                <p class="location-address">{loc.postalCode} {loc.city}</p>
              {/if}
            </div>
            <svg class="location-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M7 10h6M10 7l3 3-3 3" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        {/each}
      </div>
    {/if}
  </section>
{/if}

<!-- Step 1: Service -->
{#if step === 1}
  <section class="step-section" aria-label="Dienstleistung waehlen">
    <div class="section-header">
      <h2 class="section-title">Waehlen Sie eine Dienstleistung</h2>
      <p class="section-subtitle">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#3b82f6" stroke-width="2"/>
          <circle cx="12" cy="9" r="2.5" fill="#3b82f6"/>
        </svg>
        Standort: <strong>{selectedLocation?.name}</strong>
      </p>
    </div>
    {#if loading}
      <div class="loading-state" role="status">
        <div class="spinner"></div>
        <p>Dienstleistungen werden geladen...</p>
      </div>
    {:else}
      <div class="service-list">
        {#each services as svc}
          <button class="service-card" on:click={() => selectService(svc)}
                  aria-label="{svc.name} auswaehlen, Dauer ca. {svc.duration} Minuten">
            <div class="service-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="14" height="14" rx="3" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
                <path d="M7 10h6M10 7v6" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="service-info">
              <h3 class="service-name">{svc.name}</h3>
              {#if svc.description}
                <p class="service-desc">{svc.description}</p>
              {/if}
            </div>
            <div class="service-meta">
              <span class="duration-badge">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" stroke="#64748b" stroke-width="1.2"/>
                  <path d="M6 3v3l2 1.5" stroke="#64748b" stroke-width="1.2" stroke-linecap="round"/>
                </svg>
                {svc.duration} Min.
              </span>
              {#if svc.fee}
                <span class="fee-badge">{svc.fee.toFixed(2)} EUR</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    {/if}
    <button class="back-btn" on:click={() => step = 0}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Zurueck
    </button>
  </section>
{/if}

<!-- Step 2: Date & Slot -->
{#if step === 2}
  <section class="step-section" aria-label="Termin waehlen">
    <div class="section-header">
      <h2 class="section-title">Waehlen Sie Datum und Uhrzeit</h2>
      <p class="section-subtitle">{selectedService?.name} bei {selectedLocation?.name}</p>
    </div>

    <div class="date-card">
      <div class="form-group">
        <label for="booking-date">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="3" width="12" height="11" rx="2" stroke="#3b82f6" stroke-width="1.3"/>
            <path d="M5 1v4M11 1v4M2 7h12" stroke="#3b82f6" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          Datum waehlen
        </label>
        <input id="booking-date" type="date" class="form-control date-input"
               bind:value={selectedDate} on:change={loadSlots}
               min={minDate} max={maxDate}>
      </div>

      {#if selectedDate}
        {#if loading}
          <div class="loading-state" role="status">
            <div class="spinner"></div>
            <p>Verfuegbare Zeiten werden geladen...</p>
          </div>
        {:else if slots.length === 0}
          <div class="empty-state small">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <circle cx="18" cy="18" r="15" stroke="#e2e8f0" stroke-width="1.5"/>
              <path d="M18 11v7M18 22h.01" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <p>Keine freien Termine an diesem Tag verfuegbar.</p>
          </div>
        {:else}
          <div class="slots-section">
            <p class="slots-label">Verfuegbare Uhrzeiten:</p>
            <div class="slots-grid" role="listbox" aria-label="Verfuegbare Uhrzeiten">
              {#each slots as slot}
                <button
                  class="slot-btn"
                  class:slot-selected={selectedSlot === slot}
                  role="option"
                  aria-selected={selectedSlot === slot}
                  on:click={() => selectSlot(slot)}
                >
                  {formatTime(slot.start)}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {/if}
    </div>

    <button class="back-btn" on:click={() => step = 1}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Zurueck
    </button>
  </section>
{/if}

<!-- Step 3: Personal Data -->
{#if step === 3}
  <section class="step-section" aria-label="Persoenliche Daten">
    <div class="section-header">
      <h2 class="section-title">Ihre Daten</h2>
      <p class="section-subtitle">
        {selectedService?.name} &bull;
        {new Date(selectedDate).toLocaleDateString('de-DE')} um
        {formatTime(selectedSlot?.start)} Uhr
      </p>
    </div>

    <div class="form-split">
      <div class="form-card">
        <div class="form-group">
          <label for="citizen-name">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="4.5" r="2.5" stroke="#3b82f6" stroke-width="1.3"/>
              <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#3b82f6" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            Name *
          </label>
          <input id="citizen-name" type="text" class="form-control"
                 bind:value={citizenName} required
                 placeholder="Ihr vollstaendiger Name">
        </div>
        <div class="form-group">
          <label for="citizen-email">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="#3b82f6" stroke-width="1.3"/>
              <path d="M1 4.5l6 4 6-4" stroke="#3b82f6" stroke-width="1.3"/>
            </svg>
            E-Mail
          </label>
          <input id="citizen-email" type="email" class="form-control"
                 bind:value={citizenEmail}
                 placeholder="fuer Terminbestaetigung">
        </div>
        <div class="form-group">
          <label for="citizen-phone">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="3" y="1" width="8" height="12" rx="2" stroke="#3b82f6" stroke-width="1.3"/>
              <circle cx="7" cy="10.5" r="0.75" fill="#3b82f6"/>
            </svg>
            Telefon
          </label>
          <input id="citizen-phone" type="tel" class="form-control"
                 bind:value={citizenPhone}
                 placeholder="fuer Rueckfragen">
        </div>

        {#if selectedService?.requiredDocs?.length > 0}
          <div class="docs-notice" role="note">
            <div class="docs-title">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1L2 4v4c0 3.31 2.58 6.41 6 7.16C11.42 14.41 14 11.31 14 8V4L8 1z" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.3"/>
                <path d="M8 5v3M8 10h.01" stroke="#92400e" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              Benoetigte Unterlagen
            </div>
            <ul class="docs-list">
              {#each selectedService.requiredDocs as doc}
                <li>{doc}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="form-actions">
          <button class="back-btn" on:click={() => step = 2}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Zurueck
          </button>
          <button class="btn btn-primary btn-lg" on:click={submitBooking}
                  disabled={!citizenName || loading}>
            {#if loading}
              <div class="spinner spinner-sm spinner-white"></div>
              Wird gebucht...
            {:else}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 8h12M8 2l6 6-6 6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Termin buchen
            {/if}
          </button>
        </div>
      </div>

      <!-- Booking Summary Sidebar -->
      <div class="booking-summary">
        <h3 class="summary-title">Ihre Buchung</h3>
        <div class="summary-items">
          <div class="summary-item">
            <span class="summary-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#3b82f6" stroke-width="2"/>
              </svg>
            </span>
            <div>
              <p class="summary-label">Standort</p>
              <p class="summary-value">{selectedLocation?.name}</p>
            </div>
          </div>
          <div class="summary-item">
            <span class="summary-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <rect x="1" y="1" width="12" height="12" rx="2" stroke="#3b82f6" stroke-width="1.3"/>
                <path d="M4 1v3M10 1v3M1 6h12" stroke="#3b82f6" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
            </span>
            <div>
              <p class="summary-label">Dienstleistung</p>
              <p class="summary-value">{selectedService?.name}</p>
            </div>
          </div>
          <div class="summary-item">
            <span class="summary-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5.5" stroke="#3b82f6" stroke-width="1.3"/>
                <path d="M7 4v3l2 1.5" stroke="#3b82f6" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
            </span>
            <div>
              <p class="summary-label">Datum &amp; Zeit</p>
              <p class="summary-value">
                {new Date(selectedDate).toLocaleDateString('de-DE')}
                um {formatTime(selectedSlot?.start)} Uhr
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
{/if}

<!-- Step 4: Confirmation -->
{#if step === 4 && booking}
  <section class="step-section" aria-label="Buchungsbestaetigung">
    <div class="confirmation-card">
      <div class="confirmation-icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="20" fill="#ecfdf5"/>
          <path d="M10 20L17 27L30 13" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h2 class="confirmation-title">Termin erfolgreich gebucht!</h2>
      <div class="booking-ref-box">
        <p class="booking-ref-label">Ihre Buchungsnummer</p>
        <p class="booking-ref-value">{booking.bookingRef}</p>
      </div>

      <div class="confirmation-details">
        <div class="detail-row">
          <span class="detail-label">Dienstleistung</span>
          <span class="detail-value">{selectedService?.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Standort</span>
          <span class="detail-value">{selectedLocation?.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Datum</span>
          <span class="detail-value">{new Date(selectedDate).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Uhrzeit</span>
          <span class="detail-value">{formatTime(selectedSlot?.start)} Uhr</span>
        </div>
      </div>

      {#if citizenEmail}
        <p class="email-note">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="#059669" stroke-width="1.3"/>
            <path d="M1 4.5l6 4 6-4" stroke="#059669" stroke-width="1.3"/>
          </svg>
          Eine Bestaetigung wurde an <strong>{citizenEmail}</strong> gesendet.
        </p>
      {/if}

      <!-- T2: QR-Code zum Check-in -->
      <div class="qr-container">
        {#if booking.qrCodeDataUrl}
          <img src={booking.qrCodeDataUrl} alt="QR-Code fuer Check-in" width="160" height="160" style="border-radius:0.5rem;border:1px solid #e5e7eb;"/>
        {:else}
          <div class="qr-box"><div class="qr-inner">QR</div></div>
        {/if}
        <p class="qr-hint">QR-Code am Terminal scannen fuer schnellen Check-in</p>
      </div>

      <div class="confirmation-actions">
        <a href="/buchen" class="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1v12M1 7h12" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Weiteren Termin buchen
        </a>
        <a href="{API}/api/v1/appointments/{booking.bookingRef}/ical" download="termin.ics" class="btn" style="display:inline-flex;align-items:center;gap:0.375rem;">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M4 1v3M10 1v3M1 6h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          Kalender (.ics)
        </a>
        <a href="/status" class="btn">
          Termin verwalten
        </a>
      </div>
    </div>
  </section>
{/if}

<style>
  /* Hero */
  .page-hero {
    margin-bottom: 2rem;
    padding: 2rem 0 0;
  }
  .page-title {
    font-size: 2rem; font-weight: 800; letter-spacing: -0.025em;
    color: var(--aitema-navy); margin-bottom: 0.375rem;
  }
  .page-subtitle {
    color: var(--aitema-muted); font-size: 1rem;
  }

  /* Progress Nav */
  .progress-nav { margin-bottom: 2.5rem; position: relative; }
  .progress-track {
    position: absolute; top: 20px; left: 0; right: 0; height: 2px;
    background: var(--aitema-slate-200); z-index: 0;
  }
  .progress-fill {
    height: 100%; background: linear-gradient(90deg, var(--aitema-accent), var(--aitema-emerald));
    transition: width 0.4s ease; border-radius: 1px;
  }
  .step-list {
    display: flex; list-style: none; position: relative; z-index: 1;
  }
  .step-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    color: var(--aitema-muted);
  }
  .step-circle {
    width: 40px; height: 40px; border-radius: 50%;
    background: #fff; border: 2px solid var(--aitema-slate-200);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.875rem; font-weight: 700; transition: all 0.2s;
  }
  .step-item.step-active .step-circle {
    background: var(--aitema-accent); border-color: var(--aitema-accent);
    color: #fff; box-shadow: 0 0 0 4px rgba(59,130,246,0.15);
  }
  .step-item.step-done .step-circle {
    background: var(--aitema-emerald); border-color: var(--aitema-emerald); color: #fff;
  }
  .step-label {
    font-size: 0.75rem; font-weight: 500; text-align: center;
  }
  .step-item.step-active .step-label { color: var(--aitema-accent); font-weight: 700; }
  .step-item.step-done .step-label { color: var(--aitema-emerald); }

  /* Alert */
  .alert-error {
    display: flex; align-items: center; gap: 0.5rem;
    background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b;
    padding: 0.875rem 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;
    font-size: 0.875rem; font-weight: 500;
  }

  /* Section */
  .step-section { animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

  .section-header { margin-bottom: 1.5rem; }
  .section-title { font-size: 1.375rem; font-weight: 700; color: var(--aitema-navy); margin-bottom: 0.25rem; }
  .section-subtitle { font-size: 0.875rem; color: var(--aitema-muted); display: flex; align-items: center; gap: 0.375rem; }

  /* Location Cards */
  .location-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
  .location-card {
    display: flex; align-items: center; gap: 1rem; padding: 1.25rem 1.5rem;
    background: #fff; border: 1.5px solid var(--aitema-slate-200); border-radius: 0.75rem;
    cursor: pointer; text-align: left; transition: all 0.15s;
    box-shadow: var(--shadow-sm);
  }
  .location-card:hover {
    border-color: var(--aitema-accent);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1), var(--shadow-md);
    transform: translateY(-1px);
  }
  .location-card:focus-visible { outline: 3px solid var(--aitema-accent); outline-offset: 2px; }
  .location-icon { flex-shrink: 0; width: 44px; height: 44px; border-radius: 0.625rem; background: #eff6ff; display: flex; align-items: center; justify-content: center; }
  .location-info { flex: 1; min-width: 0; }
  .location-name { font-size: 1rem; font-weight: 700; color: var(--aitema-navy); margin-bottom: 0.125rem; }
  .location-address { font-size: 0.8125rem; color: var(--aitema-muted); margin: 0; }
  .location-arrow { flex-shrink: 0; }

  /* Service Cards */
  .service-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
  .service-card {
    display: flex; align-items: center; gap: 1rem; padding: 1.125rem 1.5rem;
    background: #fff; border: 1.5px solid var(--aitema-slate-200); border-radius: 0.75rem;
    cursor: pointer; text-align: left; transition: all 0.15s; box-shadow: var(--shadow-sm);
  }
  .service-card:hover {
    border-color: var(--aitema-accent);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1), var(--shadow-md);
  }
  .service-card:focus-visible { outline: 3px solid var(--aitema-accent); outline-offset: 2px; }
  .service-icon { flex-shrink: 0; width: 40px; height: 40px; border-radius: 0.5rem; background: #eff6ff; display: flex; align-items: center; justify-content: center; }
  .service-info { flex: 1; min-width: 0; }
  .service-name { font-size: 0.9375rem; font-weight: 700; color: var(--aitema-navy); margin-bottom: 0.125rem; }
  .service-desc { font-size: 0.8125rem; color: var(--aitema-muted); margin: 0; }
  .service-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; flex-shrink: 0; }
  .duration-badge {
    display: inline-flex; align-items: center; gap: 0.25rem;
    padding: 0.25rem 0.625rem; background: var(--aitema-slate-100);
    border-radius: 9999px; font-size: 0.75rem; font-weight: 600;
    color: var(--aitema-muted);
  }
  .fee-badge {
    font-size: 0.75rem; font-weight: 600; color: var(--aitema-emerald);
  }

  /* Date/Slots */
  .date-card {
    background: #fff; border: 1px solid var(--aitema-slate-200);
    border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem;
    box-shadow: var(--shadow-md);
  }
  .date-input { max-width: 220px; cursor: pointer; }
  .slots-section { margin-top: 1.25rem; }
  .slots-label { font-size: 0.875rem; font-weight: 600; color: var(--aitema-navy); margin-bottom: 0.75rem; }
  .slots-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .slot-btn {
    padding: 0.5rem 1.125rem; border: 1.5px solid var(--aitema-slate-200);
    border-radius: 0.5rem; background: #fff; cursor: pointer;
    font-size: 0.875rem; font-weight: 600; color: var(--aitema-text);
    min-height: 44px; min-width: 80px; transition: all 0.15s;
  }
  .slot-btn:hover { border-color: var(--aitema-accent); background: #eff6ff; color: var(--aitema-accent); }
  .slot-btn.slot-selected { border-color: var(--aitema-accent); background: var(--aitema-accent); color: #fff; }
  .slot-btn:focus-visible { outline: 3px solid var(--aitema-accent); outline-offset: 2px; }

  /* Form Split */
  .form-split { display: grid; grid-template-columns: 1fr 360px; gap: 1.5rem; margin-bottom: 1.5rem; align-items: start; }
  .form-card {
    background: #fff; border: 1px solid var(--aitema-slate-200);
    border-radius: 0.75rem; padding: 1.5rem; box-shadow: var(--shadow-md);
  }
  .form-actions { display: flex; gap: 0.75rem; align-items: center; margin-top: 1.5rem; flex-wrap: wrap; }
  .booking-summary {
    background: linear-gradient(135deg, var(--aitema-navy) 0%, var(--aitema-blue) 100%);
    border-radius: 0.75rem; padding: 1.5rem; color: #fff;
    position: sticky; top: 88px;
  }
  .summary-title { font-size: 0.875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.6); margin-bottom: 1rem; }
  .summary-items { display: flex; flex-direction: column; gap: 1rem; }
  .summary-item { display: flex; align-items: flex-start; gap: 0.75rem; }
  .summary-icon { width: 28px; height: 28px; background: rgba(255,255,255,0.1); border-radius: 0.375rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
  .summary-label { font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-bottom: 0.125rem; }
  .summary-value { font-size: 0.875rem; font-weight: 600; }

  /* Docs notice */
  .docs-notice {
    background: #fffbeb; border: 1px solid #fcd34d;
    border-radius: 0.5rem; padding: 1rem; margin-top: 1rem;
  }
  .docs-title { display: flex; align-items: center; gap: 0.375rem; font-size: 0.875rem; font-weight: 700; color: #92400e; margin-bottom: 0.5rem; }
  .docs-list { margin-left: 1.25rem; font-size: 0.875rem; color: #78350f; }

  /* Back button */
  .back-btn {
    display: inline-flex; align-items: center; gap: 0.375rem;
    padding: 0.5rem 1rem; background: #fff; border: 1px solid var(--aitema-slate-200);
    border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600;
    color: var(--aitema-muted); cursor: pointer; min-height: 40px;
    transition: all 0.15s; box-shadow: var(--shadow-sm);
  }
  .back-btn:hover { background: var(--aitema-slate-100); color: var(--aitema-text); }

  /* Confirmation */
  .confirmation-card {
    background: #fff; border: 1px solid var(--aitema-slate-200);
    border-radius: 1rem; padding: 2.5rem; max-width: 540px; margin: 0 auto;
    text-align: center; box-shadow: var(--shadow-lg);
  }
  .confirmation-icon { margin-bottom: 1.25rem; }
  .confirmation-title { font-size: 1.5rem; font-weight: 800; color: var(--aitema-navy); margin-bottom: 1.5rem; }
  .booking-ref-box {
    background: linear-gradient(135deg, var(--aitema-navy), var(--aitema-blue));
    border-radius: 0.75rem; padding: 1rem 1.5rem; margin-bottom: 1.5rem;
  }
  .booking-ref-label { font-size: 0.75rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
  .booking-ref-value { font-size: 1.5rem; font-weight: 800; color: #fff; letter-spacing: 0.05em; }
  .confirmation-details { text-align: left; margin-bottom: 1.5rem; }
  .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--aitema-slate-100); font-size: 0.875rem; }
  .detail-label { color: var(--aitema-muted); }
  .detail-value { font-weight: 600; color: var(--aitema-navy); text-align: right; }
  .email-note { display: flex; align-items: center; justify-content: center; gap: 0.375rem; font-size: 0.875rem; color: var(--aitema-emerald); margin-bottom: 1.5rem; }
  .qr-container { margin-bottom: 2rem; }
  .qr-box { width: 96px; height: 96px; border: 2px dashed var(--aitema-slate-200); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem; }
  .qr-inner { font-size: 1.25rem; font-weight: 700; color: var(--aitema-muted); }
  .qr-hint { font-size: 0.75rem; color: var(--aitema-muted); }
  .confirmation-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }

  /* Loading & Empty States */
  .loading-state { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 2.5rem; color: var(--aitema-muted); font-size: 0.875rem; }
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 2.5rem; color: var(--aitema-muted); text-align: center; }
  .empty-state.small { padding: 1.5rem; }

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

  /* Responsive */
  @media (max-width: 768px) {
    .page-title { font-size: 1.5rem; }
    .step-label { display: none; }
    .step-circle { width: 32px; height: 32px; font-size: 0.75rem; }
    .progress-track { top: 16px; }
    .location-grid { grid-template-columns: 1fr; }
    .form-split { grid-template-columns: 1fr; }
    .booking-summary { position: static; order: -1; }
    .confirmation-card { padding: 1.5rem; }
  }

  /* ── D2: Video-Typ-Auswahl ─────────────────────────────────── */
  .video-type-selector {
    margin: 1.5rem 0;
    padding: 1.25rem;
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.15);
    border-radius: 1rem;
  }
  .video-type-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 1rem;
  }
  .video-type-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  .type-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.25rem 1rem;
    background: rgba(255, 255, 255, 0.04);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    color: #94a3b8;
  }
  .type-card:hover { border-color: rgba(59, 130, 246, 0.4); color: #cbd5e1; }
  .type-card-active {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
    color: #93c5fd;
  }
  .type-card-icon { font-size: 1.75rem; }
  .type-card-title { font-size: 0.9375rem; font-weight: 700; }
  .type-card-sub { font-size: 0.75rem; opacity: 0.75; }
  .video-hint {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: #64748b;
    line-height: 1.5;
    margin: 0;
    padding: 0.5rem 0.75rem;
    background: rgba(255,255,255,0.02);
    border-radius: 0.5rem;
  }

  /* ── D2: Video-Box in Confirmation ─────────────────────────── */
  .video-box {
    background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.06));
    border: 1px solid rgba(59, 130, 246, 0.25);
    border-radius: 1rem;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.25rem;
  }
  .video-box-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #93c5fd;
    font-size: 1rem;
    margin-bottom: 0.35rem;
  }
  .video-box-sub { font-size: 0.85rem; color: #64748b; margin-bottom: 1rem; }
  .btn-video-join {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: #fff;
    font-weight: 700;
    font-size: 0.9375rem;
    border-radius: 0.625rem;
    text-decoration: none;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  .btn-video-join:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }
  .video-privacy {
    font-size: 0.75rem;
    color: #475569;
    margin-top: 0.75rem;
    margin-bottom: 0;
    line-height: 1.4;
  }
</style>
