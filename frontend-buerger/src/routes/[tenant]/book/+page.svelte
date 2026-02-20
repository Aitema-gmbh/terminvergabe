<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { t } from "$lib/i18n/index.js";
  import {
    getAvailableDays,
    getAvailableSlots,
    createBooking,
    type TimeSlot,
    type AvailableDay,
    type BookingResult,
  } from "$lib/api.js";
  import {
    pushStore,
    subscribePush,
    unsubscribePush,
    registerServiceWorker,
  } from "$lib/push.js";
  import Calendar from "$lib/components/Calendar.svelte";
  import TimeSlotPicker from "$lib/components/TimeSlotPicker.svelte";
  import Button from "$lib/components/Button.svelte";

  const tenant = $page.params.tenant;

  // ── Schritte: 1 Dienst | 2 Datum | 3 Uhrzeit | 4 Daten | 5 Benachrichtigungen | 6 Fertig ──
  let step = $state(1);
  let serviceId = $state("");
  let locationId = $state("");
  let selectedDate = $state("");
  let selectedSlot = $state<TimeSlot | null>(null);
  let availableDays = $state<AvailableDay[]>([]);
  let availableSlots = $state<TimeSlot[]>([]);
  let loading = $state(false);
  let error = $state("");
  let bookingResult = $state<BookingResult | null>(null);

  // Persoenliche Daten
  let citizenName = $state("");
  let citizenEmail = $state("");
  let citizenPhone = $state("");
  let notes = $state("");

  // Opt-in Benachrichtigungen
  let smsOptIn = $state(false);
  let pushOptIn = $state(false);
  let emailOptIn = $state(true); // E-Mail standardmaessig aktiv
  let notifLoading = $state(false);
  let pushSubscribed = $state(false);

  // Push-Store beobachten
  $effect(() => {
    pushSubscribed = $pushStore.status === "subscribed";
  });

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    serviceId = params.get("serviceId") || "";
    locationId = params.get("locationId") || "";
    if (serviceId && locationId) {
      loadAvailableDays();
    }
    // SW vorregistrieren, damit Subscription schneller klappt
    await registerServiceWorker();
  });

  async function loadAvailableDays() {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    loading = true;
    error = "";
    try {
      const res = await getAvailableDays(tenant, serviceId, locationId, month);
      availableDays = res.data;
      step = 2;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function onDateSelected(date: string) {
    selectedDate = date;
    loading = true;
    error = "";
    try {
      const res = await getAvailableSlots(tenant, serviceId, locationId, date);
      availableSlots = res.data;
      step = 3;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function onSlotSelected(slot: TimeSlot) {
    selectedSlot = slot;
    step = 4;
  }

  async function submitBooking() {
    if (!selectedSlot || !citizenName) return;
    loading = true;
    error = "";
    try {
      const res = await createBooking(tenant, {
        serviceId,
        locationId,
        slotStart: selectedSlot.startTime,
        citizenName,
        citizenEmail: citizenEmail || undefined,
        citizenPhone: citizenPhone || undefined,
        notes: notes || undefined,
      });
      bookingResult = res.data;
      // Weiter zu Benachrichtigungs-Schritt
      step = 5;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function handlePushToggle() {
    if (!bookingResult) return;
    notifLoading = true;
    try {
      if (!pushSubscribed) {
        const ok = await subscribePush(bookingResult.bookingCode, "/api");
        if (ok) pushOptIn = true;
      } else {
        await unsubscribePush("/api");
        pushOptIn = false;
      }
    } finally {
      notifLoading = false;
    }
  }

  async function savePreferencesAndFinish() {
    if (!bookingResult) { step = 6; return; }
    notifLoading = true;
    try {
      await fetch(`/api/notifications/preferences/${bookingResult.bookingCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smsOptIn,
          pushOptIn,
          emailOptIn,
          reminderChannels: [
            ...(emailOptIn ? ["email"] : []),
            ...(smsOptIn ? ["sms"] : []),
            ...(pushOptIn ? ["push"] : []),
          ],
        }),
      });
    } catch {
      // Nicht-kritisch: Praeferenzen koennen spaeter noch geaendert werden
    } finally {
      notifLoading = false;
      step = 6;
    }
  }
</script>

<svelte:head>
  <title>{t("nav.book")} - aitema|Termin</title>
</svelte:head>

<main class="booking-page">

  <!-- BOOKING PROGRESS BAR -->
  <div class="booking-progress" aria-label="Buchungsschritte">
    {#each [
      {n:1, label:'Dienst'},
      {n:2, label:'Datum'},
      {n:3, label:'Uhrzeit'},
      {n:4, label:'Daten'},
      {n:5, label:'Info'},
      {n:6, label:'Fertig'}
    ] as s, i}
      <div class="progress-step">
        <div class="progress-step-inner">
          {#if i > 0}
            <div class="progress-line" class:done={step > s.n}></div>
          {/if}
          <div
            class="progress-circle"
            class:active={step === s.n}
            class:done={step > s.n}
            aria-current={step === s.n ? 'step' : undefined}
          >
            <span>{s.n}</span>
          </div>
        </div>
        <div class="progress-label" class:active={step === s.n} class:done={step > s.n}>
          {s.label}
        </div>
      </div>
    {/each}
  </div>

  {#if error}
    <div class="alert alert-error" role="alert" style="margin: 1rem 1.5rem;">
      <span class="alert-icon">&#9888;</span>
      <span style="flex:1">{error}</span>
      <button onclick={() => (error = "")} style="background:none;border:none;cursor:pointer;font-size:1.25rem;color:inherit;" aria-label="Schliessen">&times;</button>
    </div>
  {/if}

  <div class="booking-content">

    {#if loading}
      <div class="loading-state">
        <div class="spinner" aria-hidden="true"></div>
        <p style="color: var(--aitema-muted);">{t("common.loading")}</p>
      </div>

    {:else if step === 2}
      <section aria-label={t("booking.selectDate")}>
        <h2 class="step-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          {t("booking.selectDate")}
        </h2>
        <Calendar {availableDays} onSelect={onDateSelected} />
      </section>

    {:else if step === 3}
      <section aria-label={t("booking.selectTime")}>
        <h2 class="step-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="flex-shrink:0"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          {t("booking.selectTime")}
          <span class="step-date-badge">{selectedDate}</span>
        </h2>
        {#if availableSlots.length === 0}
          <div class="alert alert-warning">
            <span class="alert-icon">&#8505;</span>
            <span>{t("booking.noSlots")}</span>
          </div>
        {:else}
          <TimeSlotPicker slots={availableSlots} onSelect={onSlotSelected} />
        {/if}
        <div class="step-nav">
          <button class="btn btn-secondary" onclick={() => (step = 2)}>{t("common.back")}</button>
        </div>
      </section>

    {:else if step === 4}
      <section aria-label={t("booking.enterDetails")}>
        <h2 class="step-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="flex-shrink:0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          {t("booking.enterDetails")}
        </h2>
        <form onsubmit={(e) => { e.preventDefault(); submitBooking(); }} class="booking-form">
          <div class="form-group">
            <label class="form-label" for="name">{t("booking.name")} <span class="required">*</span></label>
            <input id="name" type="text" bind:value={citizenName} required minlength="2" class="form-input" placeholder="Max Mustermann" />
          </div>
          <div class="form-group">
            <label class="form-label" for="email">{t("booking.email")}</label>
            <input id="email" type="email" bind:value={citizenEmail} class="form-input" placeholder="max@beispiel.de" />
          </div>
          <div class="form-group">
            <label class="form-label" for="phone">
              {t("booking.phone")}
              {#if citizenPhone}<span class="form-hint" style="font-weight:400"> (fuer SMS-Erinnerungen)</span>{/if}
            </label>
            <input id="phone" type="tel" bind:value={citizenPhone} class="form-input" placeholder="+49 ..." />
          </div>
          <div class="form-group">
            <label class="form-label" for="notes">{t("booking.notes")}</label>
            <textarea id="notes" bind:value={notes} rows="3" class="form-input form-textarea"></textarea>
          </div>
          <div class="step-nav">
            <button type="button" class="btn btn-secondary" onclick={() => (step = 3)}>{t("common.back")}</button>
            <button type="submit" class="btn btn-primary">{t("booking.submit")}</button>
          </div>
        </form>
      </section>

    {:else if step === 5 && bookingResult}
      <section class="notif-step" aria-label="Benachrichtigungseinstellungen">
        <h2 class="step-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="flex-shrink:0"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Benachrichtigungen
        </h2>
        <p class="step-intro">
          Moechten Sie an Ihren Termin erinnert werden?
          Alle Kanaele sind freiwillig und koennen jederzeit widerrufen werden.
        </p>

        <!-- E-Mail -->
        {#if citizenEmail}
          <div class="notif-card" class:active={emailOptIn}>
            <div class="notif-card-header">
              <span class="notif-icon" aria-hidden="true">&#9993;</span>
              <div class="notif-info">
                <strong>E-Mail-Erinnerung</strong>
                <span>{citizenEmail}</span>
              </div>
              <label class="toggle" aria-label="E-Mail-Erinnerung aktivieren">
                <input type="checkbox" bind:checked={emailOptIn} />
                <span class="toggle-slider"></span>
              </label>
            </div>
            {#if emailOptIn}
              <p class="notif-detail">24 Stunden vor Ihrem Termin erhalten Sie eine Erinnerung per E-Mail.</p>
            {/if}
          </div>
        {/if}

        <!-- SMS -->
        {#if citizenPhone}
          <div class="notif-card" class:active={smsOptIn}>
            <div class="notif-card-header">
              <span class="notif-icon" aria-hidden="true">&#128241;</span>
              <div class="notif-info">
                <strong>SMS-Erinnerung</strong>
                <span>{citizenPhone}</span>
              </div>
              <label class="toggle" aria-label="SMS-Erinnerung aktivieren">
                <input type="checkbox" bind:checked={smsOptIn} />
                <span class="toggle-slider"></span>
              </label>
            </div>
            {#if smsOptIn}
              <p class="notif-detail">Sie erhalten eine SMS 24h vor Ihrem Termin sowie ein Update, wenn Sie an der Reihe sind.</p>
              <p class="notif-legal">Durch Aktivierung stimmen Sie der Verarbeitung Ihrer Mobilnummer gemaess DSGVO Art. 6 Abs. 1a zu. Widerruf jederzeit moeglich.</p>
            {/if}
          </div>
        {:else}
          <div class="notif-card" style="opacity:0.5;pointer-events:none">
            <div class="notif-card-header">
              <span class="notif-icon" aria-hidden="true">&#128241;</span>
              <div class="notif-info">
                <strong>SMS-Erinnerung</strong>
                <span style="color:var(--aitema-muted)">Keine Telefonnummer angegeben</span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Push -->
        <div class="notif-card" class:active={pushSubscribed}>
          <div class="notif-card-header">
            <span class="notif-icon" aria-hidden="true">&#128276;</span>
            <div class="notif-info">
              <strong>Browser-Benachrichtigungen (Push)</strong>
              {#if pushSubscribed}
                <span style="color:var(--aitema-emerald);font-weight:600">Aktiv auf diesem Geraet</span>
              {:else if .status === 'unsupported'}
                <span style="color:var(--aitema-muted)">Von diesem Browser nicht unterstuetzt</span>
              {:else if .status === 'denied'}
                <span style="color:var(--aitema-muted)">Berechtigung verweigert (Browser-Einstellungen)</span>
              {:else}
                <span>Echtzeit-Updates direkt im Browser</span>
              {/if}
            </div>
            {#if .status !== 'unsupported' && .status !== 'denied'}
              <button
                class="btn btn-sm" class:btn-primary={!pushSubscribed} class:btn-secondary={pushSubscribed}
                onclick={handlePushToggle}
                disabled={notifLoading}
                aria-label={pushSubscribed ? 'Push deaktivieren' : 'Push aktivieren'}
              >
                {#if notifLoading}
                  <span class="spinner spinner-sm" aria-hidden="true"></span>
                {:else if pushSubscribed}
                  Deaktivieren
                {:else}
                  Aktivieren
                {/if}
              </button>
            {/if}
          </div>
          {#if pushSubscribed}
            <p class="notif-detail">Sie erhalten Echtzeit-Updates zur Warteschlange und eine Erinnerung 1 Stunde vor Ihrem Termin.</p>
          {/if}
        </div>

        <div class="step-nav">
          <button class="btn btn-secondary" onclick={() => (step = 4)}>Zurueck</button>
          <button class="btn btn-primary" onclick={savePreferencesAndFinish} disabled={notifLoading}>
            {notifLoading ? 'Speichere...' : 'Abschliessen'}
          </button>
        </div>
      </section>

    {:else if step === 6 && bookingResult}
      <section class="success-section animate-fade-in" aria-label={t("booking.success")}>
        <div class="confirmation-box">
          <div class="confirmation-icon" aria-hidden="true">&#10003;</div>
          <h2 style="color: #166534; margin-bottom: 0.5rem;">{t("booking.success")}</h2>
          <p style="color: #166534; margin-bottom: 1.5rem;">Ihre Buchung wurde erfolgreich abgesendet.</p>
          <div class="confirmation-number">{bookingResult.bookingCode}</div>
          <p style="font-size: 0.875rem; color: var(--aitema-muted); margin-bottom: 1.5rem;">Bitte notieren Sie Ihren Buchungscode.</p>
        </div>

        <div class="card" style="margin-top: 1.5rem;">
          <div class="card-header">
            Termindetails
          </div>
          <div class="card-body">
            <dl class="detail-list">
              <div class="detail-row">
                <dt>Dienst</dt>
                <dd>{bookingResult.service.name}</dd>
              </div>
              <div class="detail-row">
                <dt>Ort</dt>
                <dd>{bookingResult.location.name}</dd>
              </div>
              <div class="detail-row">
                <dt>Datum</dt>
                <dd>{new Date(bookingResult.scheduledStart).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</dd>
              </div>
              <div class="detail-row">
                <dt>Uhrzeit</dt>
                <dd>{new Date(bookingResult.scheduledStart).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</dd>
              </div>
            </dl>
          </div>
          {#if emailOptIn || smsOptIn || pushSubscribed}
            <div class="card-footer">
              <div>
                <p style="font-size: 0.875rem; font-weight: 600; color: var(--aitema-navy); margin-bottom: 0.375rem;">Aktive Erinnerungen:</p>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                  {#if emailOptIn}<span class="badge badge-blue">E-Mail</span>{/if}
                  {#if smsOptIn}<span class="badge badge-green">SMS</span>{/if}
                  {#if pushSubscribed}<span class="badge badge-slate">Push</span>{/if}
                </div>
              </div>
            </div>
          {/if}
        </div>
      </section>
    {/if}

  </div>
</main>

<style>
  .booking-page {
    max-width: 720px;
    margin: 0 auto;
    padding-bottom: 3rem;
    font-family: "Inter", system-ui, sans-serif;
  }

  .booking-content {
    padding: 2rem 1.5rem 1rem;
  }

  .step-title {
    font-size: 1.375rem;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }
  .step-date-badge {
    font-size: 0.875rem;
    font-weight: 500;
    background: #dbeafe;
    color: #1e40af;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    margin-left: 0.5rem;
  }
  .step-intro {
    color: #64748b;
    font-size: 0.9375rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .step-nav {
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    margin-top: 1.5rem;
  }

  /* booking form */
  .booking-form { display: flex; flex-direction: column; }

  /* form-label required */
  .required { color: #dc2626; }

  /* notif cards */
  .notif-card {
    border: 1.5px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1rem 1.25rem;
    margin-bottom: 0.875rem;
    transition: border-color 150ms ease, background 150ms ease;
  }
  .notif-card.active { border-color: #3b82f6; background: rgba(59,130,246,0.02); }
  .notif-card-header { display: flex; align-items: center; gap: 0.75rem; }
  .notif-icon { font-size: 1.5rem; flex-shrink: 0; }
  .notif-info { flex: 1; display: flex; flex-direction: column; font-size: 0.9rem; }
  .notif-info strong { color: #0f172a; }
  .notif-info span   { color: #64748b; font-size: 0.8125rem; margin-top: 0.125rem; }
  .notif-detail { font-size: 0.8125rem; color: #64748b; margin: 0.5rem 0 0; line-height: 1.4; }
  .notif-legal  { font-size: 0.75rem; color: #94a3b8; margin: 0.35rem 0 0; border-top: 1px solid #f1f5f9; padding-top: 0.35rem; }

  /* success / detail list */
  .success-section { padding-top: 1rem; }
  .detail-list { display: flex; flex-direction: column; gap: 0; }
  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f1f5f9;
    font-size: 0.9375rem;
    gap: 1rem;
  }
  .detail-row:last-child { border-bottom: none; }
  .detail-row dt { color: #64748b; font-weight: 500; }
  .detail-row dd { color: #0f172a; font-weight: 600; text-align: right; }

  @media (max-width: 600px) {
    .booking-content { padding: 1.5rem 1rem 1rem; }
    .step-nav { flex-direction: column-reverse; }
    .step-nav button { width: 100%; justify-content: center; }
  }
</style>
