<script lang="ts">
  import { onMount } from 'svelte';

  // ============================================================
  // State
  // ============================================================
  let activeTab: 'hours' | 'services' | 'counters' | 'display' | 'notifications' | 'branding' = 'hours';
  let loading = true;
  let saving = false;
  let saveMessage = '';

  // Opening Hours
  let openingHours: { day: string; dayLabel: string; open: boolean; from: string; to: string }[] = [
    { day: 'monday', dayLabel: 'Montag', open: true, from: '08:00', to: '16:00' },
    { day: 'tuesday', dayLabel: 'Dienstag', open: true, from: '08:00', to: '16:00' },
    { day: 'wednesday', dayLabel: 'Mittwoch', open: true, from: '08:00', to: '12:00' },
    { day: 'thursday', dayLabel: 'Donnerstag', open: true, from: '08:00', to: '18:00' },
    { day: 'friday', dayLabel: 'Freitag', open: true, from: '08:00', to: '12:00' },
    { day: 'saturday', dayLabel: 'Samstag', open: false, from: '09:00', to: '12:00' },
    { day: 'sunday', dayLabel: 'Sonntag', open: false, from: '', to: '' },
  ];

  // Services
  let servicesList: { id: string; name: string; category: string; durationMinutes: number; active: boolean }[] = [];

  // Counters / Resources
  let counters: { id: string; name: string; serviceIds: string[] }[] = [];

  // Display Config
  let displayConfig = {
    layout: 'standard',
    theme: 'dark',
    primaryColor: '#1e3a5f',
    accentColor: '#fbbf24',
    showClock: true,
    showDate: true,
    showRunningText: false,
    runningText: '',
    maxCalledVisible: 6,
    maxWaitingVisible: 12,
    logoUrl: '',
  };

  // Notifications
  let notificationSettings = {
    emailConfirmation: true,
    emailReminder: true,
    reminderHoursBefore: 24,
    smsEnabled: false,
    smsReminder: false,
  };

  // Branding
  let branding = {
    primaryColor: '#1e3a5f',
    secondaryColor: '#3b82f6',
    accentColor: '#fbbf24',
    headerText: '',
    footerText: '',
  };

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const TENANT = import.meta.env.VITE_TENANT_SLUG || 'musterstadt';

  // ============================================================
  // Data Loading
  // ============================================================
  async function loadSettings() {
    loading = true;
    try {
      const [servicesResp] = await Promise.all([
        fetch(`${API}/api/v1/${TENANT}/services`),
      ]);
      const servicesData = await servicesResp.json();
      servicesList = (servicesData.services || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category || 'Sonstiges',
        durationMinutes: s.durationMinutes || 15,
        active: s.active !== false,
      }));
    } catch (e) {
      console.error('Settings load failed:', e);
    }
    loading = false;
  }

  // ============================================================
  // Save Handlers
  // ============================================================
  async function saveOpeningHours() {
    saving = true;
    saveMessage = '';
    try {
      await fetch(`${API}/api/v1/admin/settings/opening-hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantSlug: TENANT, openingHours }),
      });
      saveMessage = 'Oeffnungszeiten gespeichert.';
    } catch (e) {
      saveMessage = 'Fehler beim Speichern.';
    }
    saving = false;
    setTimeout(() => { saveMessage = ''; }, 3000);
  }

  async function toggleService(service: any) {
    service.active = !service.active;
    servicesList = [...servicesList];
    try {
      await fetch(`${API}/api/v1/admin/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: service.active }),
      });
    } catch (e) {
      console.error('Toggle failed:', e);
      service.active = !service.active;
      servicesList = [...servicesList];
    }
  }

  async function saveDisplayConfig_() {
    saving = true;
    saveMessage = '';
    try {
      await fetch(`${API}/api/v1/admin/settings/display`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantSlug: TENANT, config: displayConfig }),
      });
      saveMessage = 'Display-Einstellungen gespeichert.';
    } catch (e) {
      saveMessage = 'Fehler beim Speichern.';
    }
    saving = false;
    setTimeout(() => { saveMessage = ''; }, 3000);
  }

  async function saveNotifications() {
    saving = true;
    saveMessage = '';
    try {
      await fetch(`${API}/api/v1/admin/settings/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantSlug: TENANT, settings: notificationSettings }),
      });
      saveMessage = 'Benachrichtigungen gespeichert.';
    } catch (e) {
      saveMessage = 'Fehler beim Speichern.';
    }
    saving = false;
    setTimeout(() => { saveMessage = ''; }, 3000);
  }

  async function saveBranding() {
    saving = true;
    saveMessage = '';
    try {
      await fetch(`${API}/api/v1/admin/settings/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantSlug: TENANT, branding }),
      });
      saveMessage = 'Branding gespeichert.';
    } catch (e) {
      saveMessage = 'Fehler beim Speichern.';
    }
    saving = false;
    setTimeout(() => { saveMessage = ''; }, 3000);
  }

  const tabs = [
    { id: 'hours', label: 'Oeffnungszeiten' },
    { id: 'services', label: 'Dienstleistungen' },
    { id: 'counters', label: 'Schalter' },
    { id: 'display', label: 'Display' },
    { id: 'notifications', label: 'Benachrichtigungen' },
    { id: 'branding', label: 'Branding' },
  ] as const;

  onMount(loadSettings);
</script>

<svelte:head>
  <title>Einstellungen - aitema|Termin</title>
</svelte:head>

<div class="settings-page">
  <header class="settings-header">
    <h1>Einstellungen</h1>
    {#if saveMessage}
      <span class="save-message" role="status">{saveMessage}</span>
    {/if}
  </header>

  <!-- Tab Navigation -->
  <nav class="tab-nav" role="tablist" aria-label="Einstellungsbereiche">
    {#each tabs as tab}
      <button class="tab-btn" class:tab-btn--active={activeTab === tab.id}
              on:click={() => { activeTab = tab.id; }}
              role="tab" aria-selected={activeTab === tab.id}
              aria-controls="panel-{tab.id}">
        {tab.label}
      </button>
    {/each}
  </nav>

  {#if loading}
    <div class="loading-state" role="status">Einstellungen werden geladen...</div>
  {:else}

    <!-- Opening Hours -->
    {#if activeTab === 'hours'}
    <section id="panel-hours" role="tabpanel" class="settings-panel">
      <h2>Oeffnungszeiten</h2>
      <div class="hours-list">
        {#each openingHours as day}
          <div class="hours-row">
            <label class="toggle-label">
              <input type="checkbox" bind:checked={day.open} class="toggle-input" />
              <span class="toggle-switch"></span>
              <span class="day-name">{day.dayLabel}</span>
            </label>
            {#if day.open}
              <div class="time-inputs">
                <input type="time" bind:value={day.from} class="form-control time-input"
                       aria-label="{day.dayLabel} von" />
                <span class="time-sep">bis</span>
                <input type="time" bind:value={day.to} class="form-control time-input"
                       aria-label="{day.dayLabel} bis" />
              </div>
            {:else}
              <span class="closed-label">Geschlossen</span>
            {/if}
          </div>
        {/each}
      </div>
      <button class="btn btn-primary" on:click={saveOpeningHours} disabled={saving}>
        {saving ? 'Speichern...' : 'Oeffnungszeiten speichern'}
      </button>
    </section>
    {/if}

    <!-- Services -->
    {#if activeTab === 'services'}
    <section id="panel-services" role="tabpanel" class="settings-panel">
      <h2>Dienstleistungen verwalten</h2>
      <div class="services-list">
        {#each servicesList as service}
          <div class="service-row">
            <div class="service-info">
              <span class="service-name">{service.name}</span>
              <span class="service-meta">{service.category} | {service.durationMinutes} Min.</span>
            </div>
            <label class="toggle-label">
              <input type="checkbox" checked={service.active}
                     on:change={() => toggleService(service)} class="toggle-input" />
              <span class="toggle-switch"></span>
              <span class="sr-only">{service.active ? 'Aktiv' : 'Inaktiv'}</span>
            </label>
          </div>
        {/each}
        {#if servicesList.length === 0}
          <p class="empty-state">Keine Dienstleistungen konfiguriert.</p>
        {/if}
      </div>
    </section>
    {/if}

    <!-- Counters -->
    {#if activeTab === 'counters'}
    <section id="panel-counters" role="tabpanel" class="settings-panel">
      <h2>Schalter-Zuordnung</h2>
      <p class="panel-description">
        Hier koennen Sie Schalter anlegen und Dienstleistungen zuordnen.
      </p>
      {#each counters as counter}
        <div class="counter-card">
          <strong>{counter.name}</strong>
          <div class="counter-services">
            {#each counter.serviceIds as sid}
              <span class="badge">{servicesList.find(s => s.id === sid)?.name || sid}</span>
            {/each}
          </div>
        </div>
      {/each}
      {#if counters.length === 0}
        <div class="empty-state">
          <p>Noch keine Schalter konfiguriert.</p>
          <p class="hint">Schalter werden in der Administrations-Oberflaeche verwaltet.</p>
        </div>
      {/if}
    </section>
    {/if}

    <!-- Display Configuration -->
    {#if activeTab === 'display'}
    <section id="panel-display" role="tabpanel" class="settings-panel">
      <h2>Display-Konfiguration</h2>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Layout</span>
          <select bind:value={displayConfig.layout} class="form-control">
            <option value="standard">Standard</option>
            <option value="split">Geteilt</option>
            <option value="fullscreen">Vollbild</option>
            <option value="minimal">Minimal</option>
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Theme</span>
          <select bind:value={displayConfig.theme} class="form-control">
            <option value="dark">Dunkel</option>
            <option value="light">Hell</option>
            <option value="high-contrast">Hoher Kontrast</option>
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Primaerfarbe</span>
          <input type="color" bind:value={displayConfig.primaryColor} class="form-control color-input" />
        </label>
        <label class="form-group">
          <span class="form-label">Akzentfarbe</span>
          <input type="color" bind:value={displayConfig.accentColor} class="form-control color-input" />
        </label>
        <label class="form-group">
          <span class="form-label">Max. angezeigte Aufrufe</span>
          <input type="number" bind:value={displayConfig.maxCalledVisible}
                 min="1" max="20" class="form-control" />
        </label>
        <label class="form-group">
          <span class="form-label">Max. angezeigte Wartende</span>
          <input type="number" bind:value={displayConfig.maxWaitingVisible}
                 min="1" max="50" class="form-control" />
        </label>
      </div>
      <div class="form-toggles">
        <label class="toggle-label">
          <input type="checkbox" bind:checked={displayConfig.showClock} class="toggle-input" />
          <span class="toggle-switch"></span>
          Uhr anzeigen
        </label>
        <label class="toggle-label">
          <input type="checkbox" bind:checked={displayConfig.showDate} class="toggle-input" />
          <span class="toggle-switch"></span>
          Datum anzeigen
        </label>
        <label class="toggle-label">
          <input type="checkbox" bind:checked={displayConfig.showRunningText} class="toggle-input" />
          <span class="toggle-switch"></span>
          Lauftext anzeigen
        </label>
      </div>
      {#if displayConfig.showRunningText}
        <label class="form-group" style="margin-top: 0.75rem;">
          <span class="form-label">Lauftext</span>
          <input type="text" bind:value={displayConfig.runningText}
                 placeholder="Herzlich willkommen im Buergeramt..."
                 class="form-control" />
        </label>
      {/if}
      <label class="form-group" style="margin-top: 0.75rem;">
        <span class="form-label">Logo-URL</span>
        <input type="url" bind:value={displayConfig.logoUrl}
               placeholder="https://example.com/logo.png"
               class="form-control" />
      </label>
      <button class="btn btn-primary" style="margin-top: 1rem;" on:click={saveDisplayConfig_} disabled={saving}>
        {saving ? 'Speichern...' : 'Display-Einstellungen speichern'}
      </button>
    </section>
    {/if}

    <!-- Notifications -->
    {#if activeTab === 'notifications'}
    <section id="panel-notifications" role="tabpanel" class="settings-panel">
      <h2>Benachrichtigungen</h2>
      <div class="form-toggles">
        <label class="toggle-label">
          <input type="checkbox" bind:checked={notificationSettings.emailConfirmation} class="toggle-input" />
          <span class="toggle-switch"></span>
          E-Mail-Bestaetigung bei Buchung
        </label>
        <label class="toggle-label">
          <input type="checkbox" bind:checked={notificationSettings.emailReminder} class="toggle-input" />
          <span class="toggle-switch"></span>
          E-Mail-Erinnerung vor Termin
        </label>
        {#if notificationSettings.emailReminder}
          <label class="form-group inline-group">
            <span class="form-label">Erinnerung Stunden vorher:</span>
            <input type="number" bind:value={notificationSettings.reminderHoursBefore}
                   min="1" max="72" class="form-control" style="width: 80px;" />
          </label>
        {/if}
        <label class="toggle-label">
          <input type="checkbox" bind:checked={notificationSettings.smsEnabled} class="toggle-input" />
          <span class="toggle-switch"></span>
          SMS aktivieren (optional)
        </label>
        {#if notificationSettings.smsEnabled}
          <label class="toggle-label">
            <input type="checkbox" bind:checked={notificationSettings.smsReminder} class="toggle-input" />
            <span class="toggle-switch"></span>
            SMS-Erinnerung vor Termin
          </label>
        {/if}
      </div>
      <button class="btn btn-primary" style="margin-top: 1.5rem;" on:click={saveNotifications} disabled={saving}>
        {saving ? 'Speichern...' : 'Benachrichtigungen speichern'}
      </button>
    </section>
    {/if}

    <!-- Branding -->
    {#if activeTab === 'branding'}
    <section id="panel-branding" role="tabpanel" class="settings-panel">
      <h2>Tenant-Branding</h2>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Primaerfarbe</span>
          <input type="color" bind:value={branding.primaryColor} class="form-control color-input" />
        </label>
        <label class="form-group">
          <span class="form-label">Sekundaerfarbe</span>
          <input type="color" bind:value={branding.secondaryColor} class="form-control color-input" />
        </label>
        <label class="form-group">
          <span class="form-label">Akzentfarbe</span>
          <input type="color" bind:value={branding.accentColor} class="form-control color-input" />
        </label>
      </div>
      <label class="form-group" style="margin-top: 0.75rem;">
        <span class="form-label">Header-Text</span>
        <input type="text" bind:value={branding.headerText}
               placeholder="Stadt Musterstadt - Buergerservice"
               class="form-control" />
      </label>
      <label class="form-group">
        <span class="form-label">Footer-Text</span>
        <input type="text" bind:value={branding.footerText}
               placeholder="Powered by aitema|Termin"
               class="form-control" />
      </label>
      <button class="btn btn-primary" style="margin-top: 1rem;" on:click={saveBranding} disabled={saving}>
        {saving ? 'Speichern...' : 'Branding speichern'}
      </button>
    </section>
    {/if}

  {/if}
</div>

<style>
  .settings-page { padding: 1.5rem; max-width: 900px; }
  .settings-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  .settings-header h1 { font-size: 1.5rem; margin: 0; }
  .save-message { font-size: 0.875rem; color: #16a34a; font-weight: 600; }

  /* Tabs */
  .tab-nav { display: flex; gap: 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 1.5rem; overflow-x: auto; }
  .tab-btn {
    padding: 0.75rem 1.25rem; background: none; border: none; border-bottom: 2px solid transparent;
    cursor: pointer; font-size: 0.875rem; color: #6b7280; font-weight: 500;
    min-height: 48px; white-space: nowrap; margin-bottom: -2px;
  }
  .tab-btn:hover { color: #111827; }
  .tab-btn--active { color: #1e3a5f; border-bottom-color: #1e3a5f; font-weight: 700; }
  .tab-btn:focus-visible { outline: 2px solid #2563eb; outline-offset: -2px; }

  /* Panels */
  .settings-panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem; }
  .settings-panel h2 { font-size: 1.125rem; margin: 0 0 1rem; }
  .panel-description { color: #6b7280; font-size: 0.875rem; margin-bottom: 1rem; }

  /* Hours */
  .hours-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
  .hours-row { display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: #f9fafb; border-radius: 0.5rem; flex-wrap: wrap; }
  .day-name { font-weight: 600; min-width: 100px; }
  .time-inputs { display: flex; align-items: center; gap: 0.5rem; }
  .time-input { width: 110px; }
  .time-sep { color: #6b7280; font-size: 0.875rem; }
  .closed-label { color: #9ca3af; font-style: italic; font-size: 0.875rem; }

  /* Services */
  .services-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .service-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.75rem 1rem; background: #f9fafb; border-radius: 0.5rem;
  }
  .service-info { display: flex; flex-direction: column; }
  .service-name { font-weight: 600; }
  .service-meta { font-size: 0.75rem; color: #6b7280; }

  /* Counters */
  .counter-card { padding: 1rem; background: #f9fafb; border-radius: 0.5rem; margin-bottom: 0.75rem; }
  .counter-services { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; }
  .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; background: #eff6ff; color: #1d4ed8; font-size: 0.75rem; }

  /* Toggle Switch */
  .toggle-label { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; min-height: 48px; }
  .toggle-input { position: absolute; opacity: 0; width: 0; height: 0; }
  .toggle-switch {
    position: relative; width: 44px; height: 24px; background: #d1d5db; border-radius: 12px;
    transition: background 0.2s; flex-shrink: 0;
  }
  .toggle-switch::after {
    content: ''; position: absolute; top: 2px; left: 2px;
    width: 20px; height: 20px; background: #fff; border-radius: 50%;
    transition: transform 0.2s;
  }
  .toggle-input:checked + .toggle-switch { background: #1e3a5f; }
  .toggle-input:checked + .toggle-switch::after { transform: translateX(20px); }
  .toggle-input:focus-visible + .toggle-switch { outline: 3px solid #2563eb; outline-offset: 2px; }

  /* Form */
  .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
  .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
  .form-label { font-size: 0.875rem; color: #374151; font-weight: 500; }
  .form-control {
    padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;
    font-size: 0.875rem; min-height: 44px; background: #fff;
  }
  .form-control:focus { outline: 2px solid #2563eb; outline-offset: 1px; border-color: #2563eb; }
  .color-input { padding: 0.25rem; height: 44px; cursor: pointer; }
  .form-toggles { display: flex; flex-direction: column; gap: 0.5rem; }
  .inline-group { flex-direction: row; align-items: center; gap: 0.75rem; margin-left: 3.25rem; }

  /* Buttons */
  .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; cursor: pointer; border: 1px solid #d1d5db; background: #fff; min-height: 48px; font-weight: 600; }
  .btn:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-primary { background: #1e3a5f; color: #fff; border-color: #1e3a5f; }
  .btn-primary:hover:not(:disabled) { background: #2d5a8e; }

  .loading-state { text-align: center; padding: 3rem; color: #6b7280; }
  .empty-state { text-align: center; padding: 2rem; color: #9ca3af; }
  .hint { font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0; }

  @media (max-width: 768px) {
    .tab-nav { gap: 0; }
    .tab-btn { padding: 0.5rem 0.75rem; font-size: 0.8rem; }
    .hours-row { flex-direction: column; align-items: flex-start; }
    .form-grid { grid-template-columns: 1fr; }
  }

  @media (prefers-reduced-motion: reduce) {
    .toggle-switch, .toggle-switch::after { transition: none; }
  }
</style>
