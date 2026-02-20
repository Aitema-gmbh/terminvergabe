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
  <nav class="breadcrumb" aria-label="Buchungsschritte">
    <ol>
      <li class:active={step >= 1} class:done={step > 1}>1. Dienst</li>
      <li class:active={step >= 2} class:done={step > 2}>2. Datum</li>
      <li class:active={step >= 3} class:done={step > 3}>3. Uhrzeit</li>
      <li class:active={step >= 4} class:done={step > 4}>4. Daten</li>
      <li class:active={step >= 5} class:done={step > 5}>5. Info</li>
      <li class:active={step >= 6}>6. Fertig</li>
    </ol>
  </nav>

  {#if error}
    <div class="error-banner" role="alert">
      <p>{error}</p>
      <button onclick={() => (error = "")}>Schliessen</button>
    </div>
  {/if}

  {#if loading}
    <div class="loading" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <p>{t("common.loading")}</p>
    </div>

  {:else if step === 2}
    <section aria-label={t("booking.selectDate")}>
      <h2>{t("booking.selectDate")}</h2>
      <Calendar {availableDays} onSelect={onDateSelected} />
    </section>

  {:else if step === 3}
    <section aria-label={t("booking.selectTime")}>
      <h2>{t("booking.selectTime")} - {selectedDate}</h2>
      {#if availableSlots.length === 0}
        <p class="no-slots">{t("booking.noSlots")}</p>
      {:else}
        <TimeSlotPicker slots={availableSlots} onSelect={onSlotSelected} />
      {/if}
      <Button variant="secondary" onclick={() => (step = 2)}>{t("common.back")}</Button>
    </section>

  {:else if step === 4}
    <section aria-label={t("booking.enterDetails")}>
      <h2>{t("booking.enterDetails")}</h2>
      <form onsubmit={(e) => { e.preventDefault(); submitBooking(); }} class="booking-form">
        <div class="form-group">
          <label for="name">{t("booking.name")} *</label>
          <input id="name" type="text" bind:value={citizenName} required minlength="2" />
        </div>
        <div class="form-group">
          <label for="email">{t("booking.email")}</label>
          <input id="email" type="email" bind:value={citizenEmail} />
        </div>
        <div class="form-group">
          <label for="phone">
            {t("booking.phone")}
            {#if citizenPhone}
              <span class="hint">(fuer SMS-Erinnerungen)</span>
            {/if}
          </label>
          <input id="phone" type="tel" bind:value={citizenPhone}
            placeholder="+49 ..." />
        </div>
        <div class="form-group">
          <label for="notes">{t("booking.notes")}</label>
          <textarea id="notes" bind:value={notes} rows="3"></textarea>
        </div>
        <div class="form-actions">
          <Button variant="secondary" onclick={() => (step = 3)}>{t("common.back")}</Button>
          <Button type="submit" variant="primary">{t("booking.submit")}</Button>
        </div>
      </form>
    </section>

  {:else if step === 5 && bookingResult}
    <!-- Benachrichtigungs-Opt-in -->
    <section class="notif-step" aria-label="Benachrichtigungseinstellungen">
      <h2>Benachrichtigungen</h2>
      <p class="notif-intro">
        Moechten Sie an Ihren Termin erinnert werden?
        Alle Kanale sind freiwillig und koennen jederzeit widerrufen werden.
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
            <p class="notif-detail">
              Sie erhalten eine SMS 24h vor Ihrem Termin sowie ein Update,
              wenn Sie an der Reihe sind. Max. 5 SMS/Stunde.
            </p>
            <p class="notif-legal">
              Durch Aktivierung stimmen Sie der Verarbeitung Ihrer Mobilnummer
              gemaess DSGVO Art. 6 Abs. 1a zu. Widerruf jederzeit moeglich.
            </p>
          {/if}
        </div>
      {:else}
        <div class="notif-card disabled">
          <div class="notif-card-header">
            <span class="notif-icon" aria-hidden="true">&#128241;</span>
            <div class="notif-info">
              <strong>SMS-Erinnerung</strong>
              <span class="muted">Keine Telefonnummer angegeben</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Web Push -->
      <div class="notif-card" class:active={pushSubscribed}>
        <div class="notif-card-header">
          <span class="notif-icon" aria-hidden="true">&#128276;</span>
          <div class="notif-info">
            <strong>Browser-Benachrichtigungen (Push)</strong>
            {#if pushSubscribed}
              <span class="status-ok">Aktiv auf diesem Geraet</span>
            {:else if $pushStore.status === "unsupported"}
              <span class="muted">Von diesem Browser nicht unterstuetzt</span>
            {:else if $pushStore.status === "denied"}
              <span class="muted">Berechtigung verweigert (Browser-Einstellungen)</span>
            {:else}
              <span>Echtzeit-Updates direkt im Browser</span>
            {/if}
          </div>
          {#if $pushStore.status !== "unsupported" && $pushStore.status !== "denied"}
            <button
              class="toggle-btn"
              class:active={pushSubscribed}
              onclick={handlePushToggle}
              disabled={notifLoading}
              aria-label={pushSubscribed ? "Push deaktivieren" : "Push aktivieren"}
            >
              {#if notifLoading}
                <span class="mini-spinner" aria-hidden="true"></span>
              {:else if pushSubscribed}
                Deaktivieren
              {:else}
                Aktivieren
              {/if}
            </button>
          {/if}
        </div>
        {#if pushSubscribed}
          <p class="notif-detail">
            Sie erhalten Echtzeit-Updates zur Warteschlange und eine Erinnerung
            1 Stunde vor Ihrem Termin.
          </p>
        {/if}
      </div>

      <div class="form-actions">
        <Button variant="secondary" onclick={() => (step = 4)}>Zurueck</Button>
        <Button
          variant="primary"
          onclick={savePreferencesAndFinish}
          disabled={notifLoading}
        >
          {notifLoading ? "Speichere..." : "Abschliessen"}
        </Button>
      </div>
    </section>

  {:else if step === 6 && bookingResult}
    <section class="success" aria-label={t("booking.success")}>
      <div class="success-icon" aria-hidden="true">&#10003;</div>
      <h2>{t("booking.success")}</h2>
      <div class="booking-code">
        <span class="label">{t("booking.code")}:</span>
        <span class="code">{bookingResult.bookingCode}</span>
      </div>
      <div class="booking-details">
        <p><strong>Dienst:</strong> {bookingResult.service.name}</p>
        <p><strong>Ort:</strong> {bookingResult.location.name}</p>
        <p>
          <strong>Datum:</strong>
          {new Date(bookingResult.scheduledStart).toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <p>
          <strong>Uhrzeit:</strong>
          {new Date(bookingResult.scheduledStart).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })} Uhr
        </p>
      </div>

      {#if emailOptIn || smsOptIn || pushSubscribed}
        <div class="notif-summary">
          <p><strong>Aktive Erinnerungen:</strong></p>
          <ul>
            {#if emailOptIn}<li>E-Mail an {citizenEmail}</li>{/if}
            {#if smsOptIn}<li>SMS an {citizenPhone}</li>{/if}
            {#if pushSubscribed}<li>Browser-Push auf diesem Geraet</li>{/if}
          </ul>
        </div>
      {/if}
    </section>
  {/if}
</main>

<style>
  .booking-page {
    max-width: 700px;
    margin: 0 auto;
    padding: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  /* ── Breadcrumb ── */
  .breadcrumb ol {
    display: flex;
    list-style: none;
    padding: 0;
    gap: 0;
  }

  .breadcrumb li {
    flex: 1;
    text-align: center;
    padding: 0.75rem 0.25rem;
    background: #f0f0f0;
    color: #999;
    font-size: 0.8rem;
    border-right: 2px solid white;
  }

  .breadcrumb li.active { background: #003366; color: white; }
  .breadcrumb li.done   { background: #006633; color: white; }
  .breadcrumb li:first-child { border-radius: 8px 0 0 8px; }
  .breadcrumb li:last-child  { border-radius: 0 8px 8px 0; border-right: none; }

  /* ── Fehler-Banner ── */
  .error-banner {
    background: #fee;
    border: 1px solid #c00;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .error-banner p { margin: 0; color: #c00; }
  .error-banner button { background: none; border: none; color: #c00; cursor: pointer; font-size: 1.25rem; }

  /* ── Ladeindikator ── */
  .loading { text-align: center; padding: 3rem; }
  .spinner {
    width: 40px; height: 40px;
    border: 4px solid #e0e0e0;
    border-top: 4px solid #003366;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  h2 { color: #003366; margin: 1.5rem 0 1rem; }

  .no-slots {
    text-align: center; padding: 2rem;
    color: #666; background: #f5f5f5; border-radius: 8px;
  }

  /* ── Buchungsformular ── */
  .booking-form { display: flex; flex-direction: column; gap: 1rem; }

  .form-group { display: flex; flex-direction: column; gap: 0.25rem; }

  .form-group label {
    font-weight: 600; font-size: 0.875rem; color: #333;
    display: flex; align-items: center; gap: 0.4rem;
  }
  .hint { font-weight: 400; color: #666; font-size: 0.8rem; }

  .form-group input,
  .form-group textarea {
    padding: 0.625rem;
    border: 2px solid #ccc;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }
  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #003366;
    box-shadow: 0 0 0 3px rgba(0, 51, 102, 0.2);
  }

  .form-actions {
    display: flex; gap: 1rem;
    justify-content: space-between;
    margin-top: 1rem;
  }

  /* ── Benachrichtigungs-Schritt ── */
  .notif-step { padding-bottom: 2rem; }

  .notif-intro {
    color: #555; margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  .notif-card {
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    padding: 1rem;
    margin-bottom: 1rem;
    transition: border-color 0.2s, background 0.2s;
  }
  .notif-card.active { border-color: #003366; background: #f0f4fb; }
  .notif-card.disabled { opacity: 0.5; pointer-events: none; }

  .notif-card-header {
    display: flex; align-items: center; gap: 0.75rem;
  }

  .notif-icon { font-size: 1.5rem; flex-shrink: 0; }

  .notif-info {
    flex: 1; display: flex; flex-direction: column;
    font-size: 0.9rem;
  }
  .notif-info strong { color: #222; }
  .notif-info span   { color: #555; font-size: 0.8rem; margin-top: 0.15rem; }
  .muted             { color: #aaa !important; }
  .status-ok         { color: #006633 !important; font-weight: 600; }

  /* Toggle-Switch */
  .toggle { position: relative; display: inline-flex; cursor: pointer; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-slider {
    position: relative; display: inline-block;
    width: 44px; height: 24px;
    background: #ccc; border-radius: 24px;
    transition: background 0.2s;
  }
  .toggle-slider::before {
    content: "";
    position: absolute;
    left: 3px; top: 3px;
    width: 18px; height: 18px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }
  .toggle input:checked + .toggle-slider { background: #003366; }
  .toggle input:checked + .toggle-slider::before { transform: translateX(20px); }

  .toggle-btn {
    padding: 0.375rem 0.75rem;
    border: 2px solid #003366;
    border-radius: 6px;
    background: white;
    color: #003366;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    flex-shrink: 0;
  }
  .toggle-btn.active { background: #003366; color: white; }
  .toggle-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .mini-spinner {
    display: inline-block;
    width: 14px; height: 14px;
    border: 2px solid rgba(0,51,102,0.3);
    border-top-color: #003366;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    vertical-align: middle;
  }

  .notif-detail {
    font-size: 0.8rem; color: #555;
    margin: 0.5rem 0 0; line-height: 1.4;
  }
  .notif-legal {
    font-size: 0.75rem; color: #888;
    margin: 0.35rem 0 0; line-height: 1.4;
    border-top: 1px solid #eee;
    padding-top: 0.35rem;
  }

  /* ── Erfolgs-Schritt ── */
  .success { text-align: center; padding: 2rem 0; }

  .success-icon {
    width: 80px; height: 80px;
    background: #006633; color: white;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 2.5rem;
    margin: 0 auto 1rem;
  }

  .booking-code {
    background: #e8f4fd;
    border-radius: 12px;
    padding: 1.5rem;
    margin: 1.5rem 0;
  }
  .booking-code .label { display: block; font-size: 0.875rem; color: #666; }
  .booking-code .code  {
    font-size: 2rem; font-weight: 700;
    letter-spacing: 3px; color: #003366;
  }

  .booking-details {
    text-align: left;
    max-width: 400px;
    margin: 0 auto;
  }
  .booking-details p {
    margin: 0.5rem 0; padding: 0.5rem 0;
    border-bottom: 1px solid #eee;
  }

  .notif-summary {
    background: #f0f4fb;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1.5rem;
    text-align: left;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
    font-size: 0.9rem;
  }
  .notif-summary p { margin: 0 0 0.5rem; }
  .notif-summary ul { margin: 0; padding-left: 1.25rem; }
  .notif-summary li { margin: 0.25rem 0; }
</style>
