<script lang="ts">
  import { onMount } from 'svelte';

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const TENANT = import.meta.env.VITE_TENANT_SLUG || 'musterstadt';

  let services: any[] = [];
  let locations: any[] = [];
  let loading = false;
  let success = false;
  let error = '';
  let position = 0;

  // Form fields
  let name = '';
  let phone = '';
  let email = '';
  let selectedServiceId = '';
  let selectedLocationId = '';
  let preferredFrom = '';
  let preferredTo = '';

  onMount(async () => {
    loading = true;
    try {
      const [sResp, lResp] = await Promise.all([
        fetch(`${API}/api/v1/${TENANT}/services`),
        fetch(`${API}/api/v1/${TENANT}/locations`),
      ]);
      const sData = await sResp.json();
      const lData = await lResp.json();
      services = sData.services || sData.data || [];
      locations = lData.locations || lData.data || [];
    } catch (e) {
      console.error('Load error:', e);
    }
    loading = false;
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';
    if (!name.trim() || !phone.trim() || !selectedServiceId) {
      error = 'Bitte Name, Telefon und Dienstleistung angeben.';
      return;
    }
    loading = true;
    try {
      const body: any = {
        serviceId: selectedServiceId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
      };
      if (selectedLocationId) body.locationId = selectedLocationId;
      if (preferredFrom && preferredTo) {
        body.preferredDates = [{ from: preferredFrom, to: preferredTo }];
      }

      const resp = await fetch(`${API}/api/v1/${TENANT}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Fehler beim Eintragen');
      position = data.position || 1;
      success = true;
    } catch (e: any) {
      error = e.message || 'Ein Fehler ist aufgetreten.';
    }
    loading = false;
  }
</script>

<svelte:head>
  <title>Warteliste – aitema|Termin</title>
</svelte:head>

<main class="waitlist-page">
  <div class="container">
    {#if success}
      <!-- Erfolgsmeldung -->
      <div class="success-card">
        <div class="success-icon" aria-hidden="true">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="28" fill="#dcfce7"/>
            <path d="M18 28l7 7 13-14" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1 class="success-title">Auf der Warteliste!</h1>
        <p class="success-text">
          Sie wurden erfolgreich eingetragen. Ihre Position: <strong>#{position}</strong>
        </p>
        <p class="success-sub">
          Sobald ein passender Termin frei wird, erhalten Sie eine SMS an <strong>{phone}</strong>.
          Sie haben dann <strong>2 Stunden</strong> Zeit zur Bestätigung.
        </p>
        <a href="/" class="btn btn-primary">Zur Startseite</a>
      </div>
    {:else}
      <!-- Header -->
      <div class="page-header">
        <div class="page-header-badge">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="6" stroke="#3b82f6" stroke-width="1.3"/>
          </svg>
          Warteliste
        </div>
        <h1 class="page-title">Auf die Warteliste</h1>
        <p class="page-subtitle">
          Kein passender Termin gefunden? Tragen Sie sich ein – wir benachrichtigen Sie sofort per SMS, wenn ein Termin frei wird.
        </p>
      </div>

      <!-- Formular -->
      <form class="waitlist-form" on:submit={handleSubmit} novalidate>
        {#if error}
          <div class="form-error" role="alert">{error}</div>
        {/if}

        <!-- Persönliche Daten -->
        <section class="form-section">
          <h2 class="form-section-title">Ihre Daten</h2>

          <div class="form-group">
            <label for="wl-name" class="form-label">Name <span class="required">*</span></label>
            <input
              id="wl-name"
              type="text"
              class="form-input"
              bind:value={name}
              placeholder="Max Mustermann"
              required
              autocomplete="name"
            />
          </div>

          <div class="form-group">
            <label for="wl-phone" class="form-label">Telefon (für SMS) <span class="required">*</span></label>
            <input
              id="wl-phone"
              type="tel"
              class="form-input"
              bind:value={phone}
              placeholder="+49 151 12345678"
              required
              autocomplete="tel"
            />
          </div>

          <div class="form-group">
            <label for="wl-email" class="form-label">E-Mail <span class="optional">(optional)</span></label>
            <input
              id="wl-email"
              type="email"
              class="form-input"
              bind:value={email}
              placeholder="max@beispiel.de"
              autocomplete="email"
            />
          </div>
        </section>

        <!-- Dienstleistung -->
        <section class="form-section">
          <h2 class="form-section-title">Dienstleistung</h2>

          <div class="form-group">
            <label for="wl-service" class="form-label">Dienstleistung <span class="required">*</span></label>
            {#if loading}
              <div class="skeleton-input"></div>
            {:else}
              <select id="wl-service" class="form-select" bind:value={selectedServiceId} required>
                <option value="">Bitte wählen…</option>
                {#each services as svc}
                  <option value={svc.id}>{svc.name}</option>
                {/each}
              </select>
            {/if}
          </div>

          <div class="form-group">
            <label for="wl-location" class="form-label">Standort <span class="optional">(optional)</span></label>
            {#if loading}
              <div class="skeleton-input"></div>
            {:else}
              <select id="wl-location" class="form-select" bind:value={selectedLocationId}>
                <option value="">Beliebiger Standort</option>
                {#each locations as loc}
                  <option value={loc.id}>{loc.name}</option>
                {/each}
              </select>
            {/if}
          </div>
        </section>

        <!-- Bevorzugte Zeiträume -->
        <section class="form-section">
          <h2 class="form-section-title">Bevorzugter Zeitraum <span class="optional">(optional)</span></h2>
          <div class="date-range-row">
            <div class="form-group">
              <label for="wl-from" class="form-label">Von</label>
              <input
                id="wl-from"
                type="date"
                class="form-input"
                bind:value={preferredFrom}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div class="form-group">
              <label for="wl-to" class="form-label">Bis</label>
              <input
                id="wl-to"
                type="date"
                class="form-input"
                bind:value={preferredTo}
                min={preferredFrom || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </section>

        <!-- DSGVO -->
        <p class="dsgvo-note">
          Mit der Eintragung stimmen Sie zu, dass wir Sie per SMS über freie Termine informieren.
          Ihre Daten werden ausschließlich für diesen Zweck verwendet und danach gelöscht.
        </p>

        <button type="submit" class="btn btn-primary btn-full" disabled={loading}>
          {#if loading}
            <span class="btn-spinner" aria-hidden="true"></span>
            Wird eingetragen…
          {:else}
            Auf Warteliste eintragen
          {/if}
        </button>
      </form>
    {/if}
  </div>
</main>

<style>
  .waitlist-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
    padding: 3rem 1rem;
  }

  .container {
    max-width: 680px;
    margin: 0 auto;
  }

  /* Page header */
  .page-header {
    text-align: center;
    margin-bottom: 2.5rem;
  }
  .page-header-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #93c5fd;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.35rem 0.85rem;
    border-radius: 50px;
    margin-bottom: 1rem;
  }
  .page-title {
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    font-weight: 800;
    color: #f8fafc;
    margin: 0 0 0.75rem;
  }
  .page-subtitle {
    color: #94a3b8;
    font-size: 1rem;
    line-height: 1.6;
    max-width: 520px;
    margin: 0 auto;
  }

  /* Form */
  .waitlist-form {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1.25rem;
    padding: 2rem;
    backdrop-filter: blur(10px);
  }
  .form-error {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
  }
  .form-section {
    margin-bottom: 2rem;
  }
  .form-section-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: #cbd5e1;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .form-group {
    margin-bottom: 1rem;
  }
  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #e2e8f0;
    margin-bottom: 0.35rem;
  }
  .required { color: #f87171; }
  .optional { color: #64748b; font-weight: 400; font-size: 0.8rem; }
  .form-input,
  .form-select {
    width: 100%;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.625rem;
    padding: 0.75rem 1rem;
    color: #f8fafc;
    font-size: 0.9375rem;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }
  .form-input::placeholder { color: #475569; }
  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
  .form-select option { background: #1e3a5f; color: #f8fafc; }

  .date-range-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .skeleton-input {
    height: 48px;
    border-radius: 0.625rem;
    background: rgba(255, 255, 255, 0.06);
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }

  .dsgvo-note {
    font-size: 0.8rem;
    color: #64748b;
    line-height: 1.5;
    margin-bottom: 1.5rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 2rem;
    border-radius: 0.75rem;
    font-weight: 700;
    font-size: 0.9375rem;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    text-decoration: none;
  }
  .btn-primary {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: #fff;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.35);
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45);
  }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-full { width: 100%; }

  .btn-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Success */
  .success-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1.25rem;
    padding: 3rem 2rem;
    text-align: center;
    backdrop-filter: blur(10px);
  }
  .success-icon { margin-bottom: 1.5rem; }
  .success-title {
    font-size: 2rem;
    font-weight: 800;
    color: #f8fafc;
    margin: 0 0 1rem;
  }
  .success-text {
    color: #e2e8f0;
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }
  .success-sub {
    color: #94a3b8;
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: 2rem;
  }
</style>
