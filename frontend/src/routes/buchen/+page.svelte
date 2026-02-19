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

  // Get tomorrow as min date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
</script>

<svelte:head>
  <title>Termin buchen - aitema|Termin</title>
</svelte:head>

<h1 style="font-size: 1.75rem; margin-bottom: 1.5rem;">Termin buchen</h1>

<!-- Progress Steps -->
<nav class="steps" aria-label="Buchungsfortschritt">
  <ol class="step-list">
    {#each steps as s, i}
      <li
        class="step"
        class:step--active={step === i}
        class:step--done={step > i}
        aria-current={step === i ? 'step' : undefined}
      >
        <span class="step-number">{i + 1}</span>
        <span class="step-label">{s}</span>
      </li>
    {/each}
  </ol>
</nav>

{#if error}
  <div class="alert alert-error" role="alert">{error}</div>
{/if}

<!-- Step 0: Location -->
{#if step === 0}
  <section aria-label="Standort waehlen">
    <h2>Waehlen Sie einen Standort</h2>
    {#if loading}
      <p role="status" class="loading">Standorte werden geladen...</p>
    {:else if locations.length === 0}
      <p class="empty">Keine Standorte verfuegbar.</p>
    {:else}
      <div class="card-grid">
        {#each locations as loc}
          <button class="card location-card" on:click={() => selectLocation(loc)}
                  aria-label="{loc.name} auswaehlen">
            <h3>{loc.name}</h3>
            {#if loc.address}
              <p class="text-muted">{loc.address}</p>
            {/if}
            {#if loc.city}
              <p class="text-muted">{loc.postalCode} {loc.city}</p>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </section>
{/if}

<!-- Step 1: Service -->
{#if step === 1}
  <section aria-label="Dienstleistung waehlen">
    <h2>Waehlen Sie eine Dienstleistung</h2>
    <p class="subtitle">Standort: <strong>{selectedLocation?.name}</strong></p>
    {#if loading}
      <p role="status" class="loading">Dienstleistungen werden geladen...</p>
    {:else}
      <div class="service-list">
        {#each services as svc}
          <button class="card service-card" on:click={() => selectService(svc)}
                  aria-label="{svc.name} auswaehlen, Dauer ca. {svc.duration} Minuten">
            <div class="service-main">
              <h3>{svc.name}</h3>
              {#if svc.description}
                <p class="text-muted">{svc.description}</p>
              {/if}
            </div>
            <div class="service-meta">
              <span class="duration">ca. {svc.duration} Min.</span>
              {#if svc.fee}
                <span class="fee">{svc.fee.toFixed(2)} EUR</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    {/if}
    <button class="btn" on:click={() => step = 0}>&larr; Zurueck</button>
  </section>
{/if}

<!-- Step 2: Date & Slot -->
{#if step === 2}
  <section aria-label="Termin waehlen">
    <h2>Waehlen Sie Datum und Uhrzeit</h2>
    <p class="subtitle">{selectedService?.name} bei {selectedLocation?.name}</p>
    
    <div class="form-group">
      <label for="booking-date">Datum</label>
      <input id="booking-date" type="date" class="form-control"
             bind:value={selectedDate} on:change={loadSlots}
             min={minDate} max={maxDate}
             style="max-width: 250px;">
    </div>

    {#if selectedDate}
      {#if loading}
        <p role="status" class="loading">Verfuegbare Zeiten werden geladen...</p>
      {:else if slots.length === 0}
        <p class="empty">Keine freien Termine an diesem Tag verfuegbar.</p>
      {:else}
        <div class="slots-grid" role="listbox" aria-label="Verfuegbare Uhrzeiten">
          {#each slots as slot}
            <button
              class="slot-btn"
              class:slot-btn--selected={selectedSlot === slot}
              role="option"
              aria-selected={selectedSlot === slot}
              on:click={() => selectSlot(slot)}
            >
              {formatTime(slot.start)}
            </button>
          {/each}
        </div>
      {/if}
    {/if}
    
    <button class="btn" on:click={() => step = 1} style="margin-top: 1rem;">&larr; Zurueck</button>
  </section>
{/if}

<!-- Step 3: Personal Data -->
{#if step === 3}
  <section aria-label="Persoenliche Daten">
    <h2>Ihre Daten</h2>
    <p class="subtitle">
      {selectedService?.name} am {new Date(selectedDate).toLocaleDateString('de-DE')}
      um {formatTime(selectedSlot?.start)} Uhr
    </p>

    <div class="card" style="max-width: 500px;">
      <div class="form-group">
        <label for="citizen-name">Name *</label>
        <input id="citizen-name" type="text" class="form-control"
               bind:value={citizenName} required
               placeholder="Ihr vollstaendiger Name">
      </div>
      <div class="form-group">
        <label for="citizen-email">E-Mail</label>
        <input id="citizen-email" type="email" class="form-control"
               bind:value={citizenEmail}
               placeholder="fuer Terminbestaetigung">
      </div>
      <div class="form-group">
        <label for="citizen-phone">Telefon</label>
        <input id="citizen-phone" type="tel" class="form-control"
               bind:value={citizenPhone}
               placeholder="fuer Rueckfragen">
      </div>

      {#if selectedService?.requiredDocs?.length > 0}
        <div class="required-docs" role="note">
          <h3>Benoetigte Unterlagen</h3>
          <ul>
            {#each selectedService.requiredDocs as doc}
              <li>{doc}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
        <button class="btn" on:click={() => step = 2}>&larr; Zurueck</button>
        <button class="btn btn-primary btn-lg" on:click={submitBooking}
                disabled={!citizenName || loading}>
          {loading ? 'Wird gebucht...' : 'Termin buchen'}
        </button>
      </div>
    </div>
  </section>
{/if}

<!-- Step 4: Confirmation -->
{#if step === 4 && booking}
  <section aria-label="Buchungsbestaetigung">
    <div class="confirmation card" style="max-width: 500px; text-align: center;">
      <div class="confirmation-icon" aria-hidden="true">&#10003;</div>
      <h2>Termin gebucht!</h2>
      <p class="booking-ref">Buchungsnummer: <strong>{booking.bookingRef}</strong></p>
      
      <div class="confirmation-details">
        <div class="detail-row">
          <span class="detail-label">Dienstleistung</span>
          <span>{selectedService?.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Standort</span>
          <span>{selectedLocation?.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Datum</span>
          <span>{new Date(selectedDate).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Uhrzeit</span>
          <span>{formatTime(selectedSlot?.start)} Uhr</span>
        </div>
      </div>

      {#if citizenEmail}
        <p class="text-muted" style="margin-top: 1rem;">
          Eine Bestaetigung wurde an {citizenEmail} gesendet.
        </p>
      {/if}

      <div style="margin-top: 2rem; display: flex; gap: 0.75rem; justify-content: center;">
        <a href="/buchen" class="btn btn-primary">Weiteren Termin buchen</a>
        <a href="/status" class="btn">Termin verwalten</a>
      </div>
    </div>
  </section>
{/if}

<style>
  h2 { font-size: 1.25rem; margin-bottom: 1rem; }
  .subtitle { font-size: 0.875rem; color: var(--color-text-muted); margin-bottom: 1.5rem; }
  .loading { color: var(--color-text-muted); text-align: center; padding: 2rem; }
  .empty { color: #9ca3af; text-align: center; padding: 2rem; }
  .text-muted { color: var(--color-text-muted); font-size: 0.875rem; margin: 0.25rem 0; }

  .steps { margin-bottom: 2rem; }
  .step-list { display: flex; list-style: none; }
  .step { flex: 1; display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem;
          border-bottom: 3px solid #e5e7eb; color: #9ca3af; font-size: 0.875rem; }
  .step--active { border-bottom-color: var(--color-primary) !important; color: var(--color-text) !important; font-weight: 600; }
  .step--done { border-bottom-color: var(--color-accent) !important; color: var(--color-accent) !important; }
  .step-number {
    display: inline-flex; width: 24px; height: 24px; border-radius: 50%;
    background: #e5e7eb; color: #6b7280; align-items: center; justify-content: center;
    font-size: 0.75rem; font-weight: 700;
  }
  .step--active .step-number { background: var(--color-primary); color: #fff; }
  .step--done .step-number { background: var(--color-accent); color: #fff; }

  .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; }
  .location-card { text-align: left; cursor: pointer; transition: border-color 0.15s; }
  .location-card:hover { border-color: var(--color-primary); }
  .location-card h3 { font-size: 1rem; margin-bottom: 0.25rem; }

  .service-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .service-card { display: flex; justify-content: space-between; align-items: center; text-align: left; cursor: pointer; }
  .service-card:hover { border-color: var(--color-primary); }
  .service-card h3 { font-size: 1rem; margin-bottom: 0.25rem; }
  .service-meta { text-align: right; }
  .duration { display: block; font-size: 0.875rem; font-weight: 600; color: var(--color-primary); }
  .fee { display: block; font-size: 0.75rem; color: var(--color-text-muted); }

  .slots-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0; }
  .slot-btn {
    padding: 0.5rem 1rem; border: 2px solid var(--color-border); border-radius: var(--radius);
    background: #fff; cursor: pointer; font-size: 0.875rem; font-weight: 600;
    min-height: 44px; min-width: 80px;
  }
  .slot-btn:hover { border-color: var(--color-primary); background: #f0f9ff; }
  .slot-btn--selected { border-color: var(--color-primary); background: var(--color-primary); color: #fff; }
  .slot-btn:focus-visible { outline: 3px solid var(--color-primary-light); outline-offset: 2px; }

  .required-docs { background: #fffbeb; border: 1px solid #fcd34d; border-radius: var(--radius); padding: 1rem; margin: 1rem 0; }
  .required-docs h3 { font-size: 0.875rem; color: var(--color-warning); margin-bottom: 0.5rem; }
  .required-docs ul { margin-left: 1.5rem; font-size: 0.875rem; }

  .confirmation-icon {
    width: 64px; height: 64px; border-radius: 50%; background: #f0fdf4;
    color: var(--color-accent); font-size: 2rem; display: flex;
    align-items: center; justify-content: center; margin: 0 auto 1rem;
    border: 3px solid var(--color-accent);
  }
  .booking-ref { font-size: 1.125rem; margin: 1rem 0; }
  .confirmation-details { text-align: left; margin: 1.5rem 0; }
  .detail-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; }
  .detail-label { color: var(--color-text-muted); }

  .alert-error { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; padding: 0.75rem 1rem; border-radius: var(--radius); margin-bottom: 1rem; }

  @media (max-width: 768px) {
    .step-list { flex-direction: column; }
    .step { border-bottom: none; border-left: 3px solid #e5e7eb; }
    .step--active { border-left-color: var(--color-primary) !important; }
    .step--done { border-left-color: var(--color-accent) !important; }
    .service-card { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
    .service-meta { text-align: left; }
  }
</style>
