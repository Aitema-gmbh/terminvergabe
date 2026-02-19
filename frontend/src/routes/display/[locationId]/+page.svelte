<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';

  let displayData: any = null;
  let error = '';
  let intervalId: any;

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const TENANT = import.meta.env.VITE_TENANT_SLUG || 'musterstadt';

  $: locationId = $page.params.locationId;

  async function loadDisplay() {
    try {
      const resp = await fetch(`${API}/api/v1/${TENANT}/queue/display/${locationId}`);
      displayData = await resp.json();
    } catch (e: any) {
      error = e.message;
    }
  }

  onMount(() => {
    loadDisplay();
    // Refresh every 5 seconds
    intervalId = setInterval(loadDisplay, 5000);
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
</script>

<svelte:head>
  <title>Aufrufanzeige - aitema|Termin</title>
  <style>
    body { background: #0f172a !important; color: #f8fafc !important; }
    header, footer { display: none !important; }
    main { max-width: 100% !important; padding: 2rem !important; }
  </style>
</svelte:head>

<div class="display-board" role="status" aria-live="polite" aria-label="Aufrufanzeige">
  {#if displayData}
    <!-- Currently Called -->
    <section class="called-section">
      <h2>Jetzt aufgerufen</h2>
      <div class="called-grid">
        {#each displayData.called as entry}
          <div class="called-card">
            <div class="called-number">{entry.ticketNumber}</div>
            <div class="called-counter">{entry.counter}</div>
            <div class="called-service">{entry.service}</div>
          </div>
        {/each}
        {#if displayData.called.length === 0}
          <p class="no-calls">Derzeit keine Aufrufe</p>
        {/if}
      </div>
    </section>

    <!-- Waiting -->
    <section class="waiting-section">
      <h2>Wartend: {displayData.totalWaiting}</h2>
      <div class="waiting-list">
        {#each displayData.waiting.slice(0, 10) as entry, i}
          <div class="waiting-item">
            <span class="waiting-pos">{i + 1}.</span>
            <span class="waiting-number">{entry.ticketNumber}</span>
            <span class="waiting-service">{entry.service}</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- Footer info -->
    <div class="display-footer">
      <span>Aktualisiert: {formatTime(displayData.timestamp)}</span>
      <span>{displayData.inProgress} in Bearbeitung</span>
    </div>
  {:else if error}
    <p class="error">{error}</p>
  {:else}
    <p class="loading">Laden...</p>
  {/if}
</div>

<style>
  .display-board { min-height: 100vh; display: flex; flex-direction: column; gap: 2rem; }
  
  h2 { font-size: 1.5rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; }
  
  .called-section { flex: 1; }
  .called-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem; }
  .called-card {
    background: #1e3a5f; border-radius: 1rem; padding: 2rem;
    text-align: center; animation: pulse 2s infinite;
  }
  .called-number { font-size: 4rem; font-weight: 800; color: #fbbf24; letter-spacing: 0.05em; }
  .called-counter { font-size: 1.5rem; color: #f8fafc; margin-top: 0.5rem; font-weight: 600; }
  .called-service { font-size: 0.875rem; color: #94a3b8; margin-top: 0.25rem; }
  
  .waiting-section { flex-shrink: 0; }
  .waiting-list { display: flex; flex-wrap: wrap; gap: 0.75rem; }
  .waiting-item {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.5rem 1rem; background: #1e293b; border-radius: 0.5rem; font-size: 0.875rem;
  }
  .waiting-pos { color: #64748b; font-weight: 600; }
  .waiting-number { font-weight: 700; color: #e2e8f0; }
  .waiting-service { color: #94a3b8; font-size: 0.75rem; }
  
  .display-footer {
    display: flex; justify-content: space-between; padding-top: 1rem;
    border-top: 1px solid #334155; font-size: 0.875rem; color: #64748b;
  }
  
  .no-calls { color: #64748b; text-align: center; padding: 3rem; font-size: 1.25rem; }
  .loading { color: #64748b; text-align: center; padding: 3rem; }
  .error { color: #ef4444; text-align: center; padding: 3rem; }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
    50% { box-shadow: 0 0 20px 10px rgba(251, 191, 36, 0.1); }
  }
  
  @media (prefers-reduced-motion: reduce) {
    .called-card { animation: none; }
  }
</style>
