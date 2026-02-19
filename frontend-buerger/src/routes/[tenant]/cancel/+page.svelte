<script lang="ts">
  import { page } from "$app/stores";
  import { t } from "$lib/i18n/index.js";
  import { cancelBooking, lookupBooking, type BookingResult } from "$lib/api.js";
  import Button from "$lib/components/Button.svelte";

  const tenant = $page.params.tenant;

  let bookingCode = $state("");
  let reason = $state("");
  let loading = $state(false);
  let error = $state("");
  let success = $state(false);
  let bookingInfo = $state<BookingResult | null>(null);

  async function lookup() {
    if (!bookingCode) return;
    loading = true;
    error = "";
    try {
      const res = await lookupBooking(tenant, bookingCode);
      bookingInfo = res.data;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function doCancel() {
    loading = true;
    error = "";
    try {
      await cancelBooking(tenant, bookingCode, reason || undefined);
      success = true;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{t("cancel.title")} - aitema|Termin</title>
</svelte:head>

<main class="cancel-page">
  <h1>{t("cancel.title")}</h1>

  {#if success}
    <div class="success-message" role="alert">
      <p>{t("cancel.success")}</p>
    </div>
  {:else}
    {#if error}
      <div class="error-message" role="alert">{error}</div>
    {/if}

    {#if !bookingInfo}
      <form onsubmit={(e) => { e.preventDefault(); lookup(); }}>
        <div class="form-group">
          <label for="code">{t("cancel.enterCode")}</label>
          <input
            id="code"
            type="text"
            bind:value={bookingCode}
            placeholder="z.B. MUC-AB12CD"
            required
            style="text-transform: uppercase"
          />
        </div>
        <Button type="submit" disabled={loading}>Termin suchen</Button>
      </form>
    {:else}
      <div class="booking-info">
        <h2>Termin gefunden</h2>
        <p><strong>Dienst:</strong> {bookingInfo.service.name}</p>
        <p><strong>Ort:</strong> {bookingInfo.location.name}</p>
        <p><strong>Datum:</strong> {new Date(bookingInfo.scheduledStart).toLocaleDateString("de-DE")}</p>
        <p><strong>Status:</strong> {bookingInfo.status}</p>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); doCancel(); }}>
        <div class="form-group">
          <label for="reason">{t("cancel.reason")}</label>
          <textarea id="reason" bind:value={reason} rows="3"></textarea>
        </div>
        <Button type="submit" variant="danger" disabled={loading}>{t("cancel.submit")}</Button>
      </form>
    {/if}
  {/if}
</main>

<style>
  .cancel-page {
    max-width: 500px;
    margin: 0 auto;
    padding: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  h1 { color: #003366; }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }

  label { font-weight: 600; font-size: 0.875rem; }

  input, textarea {
    padding: 0.625rem;
    border: 2px solid #ccc;
    border-radius: 6px;
    font-size: 1rem;
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: #003366;
    box-shadow: 0 0 0 3px rgba(0, 51, 102, 0.2);
  }

  .error-message {
    background: #fee;
    border: 1px solid #c00;
    color: #c00;
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .success-message {
    background: #e8f5e9;
    border: 1px solid #4caf50;
    color: #2e7d32;
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
    font-size: 1.125rem;
  }

  .booking-info {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .booking-info h2 { margin-top: 0; color: #003366; }
  .booking-info p { margin: 0.25rem 0; }
</style>
