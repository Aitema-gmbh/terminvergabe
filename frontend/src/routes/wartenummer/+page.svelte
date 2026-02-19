<script lang="ts">
  let locationId = '';
  let serviceId = '';
  let citizenName = '';
  let ticket: any = null;
  let error = '';
  let loading = false;

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const TENANT = import.meta.env.VITE_TENANT_SLUG || 'musterstadt';

  async function getTicket() {
    if (!locationId || !serviceId) {
      error = 'Bitte waehlen Sie Standort und Dienstleistung.';
      return;
    }
    loading = true;
    error = '';
    try {
      const resp = await fetch(`${API}/api/v1/${TENANT}/queue/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, serviceId, citizenName }),
      });
      const data = await resp.json();
      if (data.success) {
        ticket = data;
      } else {
        error = data.error || 'Fehler beim Erstellen der Wartenummer';
      }
    } catch (e: any) {
      error = e.message || 'Verbindungsfehler';
    }
    loading = false;
  }
</script>

<svelte:head>
  <title>Wartenummer ziehen - aitema|Termin</title>
</svelte:head>

<h1 style="font-size: 1.75rem; margin-bottom: 1.5rem;">Wartenummer ziehen</h1>

{#if !ticket}
  <div class="card" style="max-width: 500px;">
    <p style="margin-bottom: 1.5rem; color: var(--color-text-secondary);">
      Kein Termin? Kein Problem! Ziehen Sie hier eine Wartenummer fuer Ihren Besuch.
    </p>

    {#if error}
      <div class="alert-error" role="alert">{error}</div>
    {/if}

    <div class="form-group">
      <label for="q-name">Name (optional)</label>
      <input id="q-name" type="text" class="form-control" bind:value={citizenName}
             placeholder="Ihr Name">
    </div>

    <button class="btn btn-primary btn-lg" on:click={getTicket}
            disabled={loading} style="width: 100%; justify-content: center;">
      {loading ? 'Bitte warten...' : 'Wartenummer ziehen'}
    </button>
  </div>
{:else}
  <div class="card ticket-card" style="max-width: 400px; text-align: center;">
    <h2 style="font-size: 0.875rem; color: var(--color-text-muted); margin-bottom: 0.5rem;">
      Ihre Wartenummer
    </h2>
    <div class="ticket-number" aria-label="Wartenummer {ticket.ticketNumber}">
      {ticket.ticketNumber}
    </div>
    {#if ticket.estimatedWait !== null && ticket.estimatedWait !== undefined}
      <p style="margin-top: 1rem; color: var(--color-text-secondary);">
        Geschaetzte Wartezeit: <strong>ca. {ticket.estimatedWait} Minuten</strong>
      </p>
    {/if}
    <p style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 1rem;">
      Bitte behalten Sie diese Nummer und warten Sie auf den Aufruf.
    </p>
  </div>
{/if}

<style>
  .ticket-number {
    font-size: 4rem; font-weight: 800; color: var(--color-primary);
    padding: 2rem; margin: 1rem 0;
    background: #f0f9ff; border: 3px solid var(--color-primary);
    border-radius: 1rem; letter-spacing: 0.1em;
  }
  .ticket-card { padding: 2rem; }
  .alert-error { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; padding: 0.75rem 1rem; border-radius: 0.375rem; margin-bottom: 1rem; }
</style>
