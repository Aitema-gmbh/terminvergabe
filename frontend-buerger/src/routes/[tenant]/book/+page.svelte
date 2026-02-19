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
  import Calendar from "$lib/components/Calendar.svelte";
  import TimeSlotPicker from "$lib/components/TimeSlotPicker.svelte";
  import Button from "$lib/components/Button.svelte";

  const tenant = $page.params.tenant;

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

  // Form fields
  let citizenName = $state("");
  let citizenEmail = $state("");
  let citizenPhone = $state("");
  let notes = $state("");

  // Load from query params
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    serviceId = params.get("serviceId") || "";
    locationId = params.get("locationId") || "";
    if (serviceId && locationId) {
      loadAvailableDays();
    }
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
      step = 5;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
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
      <li class:active={step >= 5}>5. Fertig</li>
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
          <label for="phone">{t("booking.phone")}</label>
          <input id="phone" type="tel" bind:value={citizenPhone} />
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
        <p><strong>Datum:</strong> {new Date(bookingResult.scheduledStart).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <p><strong>Uhrzeit:</strong> {new Date(bookingResult.scheduledStart).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
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

  .breadcrumb ol {
    display: flex;
    list-style: none;
    padding: 0;
    gap: 0;
  }

  .breadcrumb li {
    flex: 1;
    text-align: center;
    padding: 0.75rem 0.5rem;
    background: #f0f0f0;
    color: #999;
    font-size: 0.875rem;
    border-right: 2px solid white;
  }

  .breadcrumb li.active {
    background: #003366;
    color: white;
  }

  .breadcrumb li.done {
    background: #006633;
    color: white;
  }

  .breadcrumb li:first-child { border-radius: 8px 0 0 8px; }
  .breadcrumb li:last-child { border-radius: 0 8px 8px 0; border-right: none; }

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

  .loading {
    text-align: center;
    padding: 3rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e0e0e0;
    border-top: 4px solid #003366;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  h2 {
    color: #003366;
    margin: 1.5rem 0 1rem;
  }

  .no-slots {
    text-align: center;
    padding: 2rem;
    color: #666;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .booking-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-group label {
    font-weight: 600;
    font-size: 0.875rem;
    color: #333;
  }

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
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    margin-top: 1rem;
  }

  .success {
    text-align: center;
    padding: 2rem 0;
  }

  .success-icon {
    width: 80px;
    height: 80px;
    background: #006633;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    margin: 0 auto 1rem;
  }

  .booking-code {
    background: #e8f4fd;
    border-radius: 12px;
    padding: 1.5rem;
    margin: 1.5rem 0;
  }

  .booking-code .label {
    display: block;
    font-size: 0.875rem;
    color: #666;
  }

  .booking-code .code {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: 3px;
    color: #003366;
  }

  .booking-details {
    text-align: left;
    max-width: 400px;
    margin: 0 auto;
  }

  .booking-details p {
    margin: 0.5rem 0;
    padding: 0.5rem 0;
    border-bottom: 1px solid #eee;
  }
</style>
