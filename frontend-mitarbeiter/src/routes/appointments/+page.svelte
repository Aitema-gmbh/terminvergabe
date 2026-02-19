<script lang="ts">
  let appointments = $state<any[]>([]);
</script>

<svelte:head>
  <title>Termine - aitema|Termin</title>
</svelte:head>

<main class="page">
  <h1>Heutige Termine</h1>
  <div class="appointment-list">
    {#if appointments.length === 0}
      <p class="empty">Keine Termine fuer heute.</p>
    {:else}
      {#each appointments as appt}
        <div class="appointment-card">
          <div class="time">{new Date(appt.scheduledStart).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</div>
          <div class="details">
            <strong>{appt.citizenName}</strong>
            <span>{appt.service?.name}</span>
          </div>
          <div class="status">{appt.status}</div>
        </div>
      {/each}
    {/if}
  </div>
</main>

<style>
  .page { max-width: 800px; margin: 0 auto; padding: 1rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  h1 { color: #003366; }
  .empty { text-align: center; padding: 3rem; color: #999; background: #f5f5f5; border-radius: 8px; }
  .appointment-card { display: flex; align-items: center; gap: 1rem; padding: 1rem; margin: 0.5rem 0; background: white; border: 1px solid #e0e0e0; border-radius: 8px; }
  .time { font-size: 1.25rem; font-weight: 700; color: #003366; min-width: 60px; }
  .details { flex: 1; }
  .details strong { display: block; }
  .details span { font-size: 0.875rem; color: #666; }
  .status { font-size: 0.75rem; padding: 0.25rem 0.5rem; background: #e0e0e0; border-radius: 4px; text-transform: uppercase; }
</style>
