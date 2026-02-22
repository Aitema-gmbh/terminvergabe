<script lang="ts">
  let appointments = $state<any[]>([]);
</script>

<svelte:head>
  <title>Termine - aitema|Termin</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <h1 class="page-title">Heutige Termine</h1>
    <p class="page-subtitle">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>

  <div style="display:flex;flex-direction:column;gap:0.625rem;">
    {#if appointments.length === 0}
      <div style="text-align:center;padding:3rem 2rem;background:white;border:1px solid var(--aitema-slate-200);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);">
        <div style="width:3.5rem;height:3.5rem;background:var(--aitema-slate-100);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:1.5rem;" aria-hidden="true">📅</div>
        <p style="color:var(--aitema-muted);font-size:0.9375rem;">Keine Termine fuer heute.</p>
      </div>
    {:else}
      {#each appointments as appt}
        <div class="appointment-card">
          <div class="appt-time">
            {new Date(appt.scheduledStart).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div class="appt-details">
            <strong>{appt.citizenName}</strong>
            <span>{appt.service?.name}</span>
          </div>
          <span class="status-badge {appt.status?.toLowerCase() ?? 'scheduled'}">{appt.status}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>
