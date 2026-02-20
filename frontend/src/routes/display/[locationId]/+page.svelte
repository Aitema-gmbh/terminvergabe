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
  .display-board {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1a2942 100%);
    color: #f8fafc;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2rem;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .display-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .display-brand {
    font-size: 1.125rem;
    font-weight: 800;
    color: rgba(255,255,255,0.9);
    letter-spacing: -0.025em;
  }
  .display-brand span { color: #3b82f6; }
  .display-clock {
    font-size: 1.25rem;
    font-weight: 700;
    color: rgba(255,255,255,0.5);
    font-variant-numeric: tabular-nums;
  }

  h2 {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255,255,255,0.4);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 1.25rem;
  }

  .called-section { flex: 1; }
  .called-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem; }
  .called-card {
    background: linear-gradient(135deg, #1e3a5f, #1e40af);
    border: 1px solid rgba(59,130,246,0.2);
    border-radius: 1.25rem;
    padding: 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
    animation: calledPulse 2.5s ease infinite;
  }
  .called-card::before {
    content: "";
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(to right, #3b82f6, #10b981);
  }
  .called-number {
    font-size: 5rem;
    font-weight: 900;
    color: #fbbf24;
    letter-spacing: 0.05em;
    line-height: 1;
    text-shadow: 0 0 30px rgba(251,191,36,0.3);
  }
  .called-counter {
    font-size: 1.375rem;
    color: #f8fafc;
    margin-top: 0.75rem;
    font-weight: 600;
  }
  .called-service {
    font-size: 0.875rem;
    color: rgba(255,255,255,0.5);
    margin-top: 0.375rem;
  }

  .waiting-section { flex-shrink: 0; }
  .waiting-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .waiting-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 0.625rem;
    font-size: 0.875rem;
    transition: background 200ms ease;
  }
  .waiting-pos { color: rgba(255,255,255,0.3); font-weight: 600; min-width: 1.5rem; }
  .waiting-number { font-weight: 800; color: #e2e8f0; font-size: 1rem; }
  .waiting-service { color: rgba(255,255,255,0.4); font-size: 0.75rem; }

  .display-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid rgba(255,255,255,0.06);
    font-size: 0.8125rem;
    color: rgba(255,255,255,0.3);
  }
  .display-footer span { display: flex; align-items: center; gap: 0.375rem; }

  .no-calls {
    color: rgba(255,255,255,0.3);
    text-align: center;
    padding: 4rem;
    font-size: 1.25rem;
    font-style: italic;
  }
  .loading {
    color: rgba(255,255,255,0.4);
    text-align: center;
    padding: 4rem;
    font-size: 1.25rem;
  }
  .error { color: #ef4444; text-align: center; padding: 3rem; }

  @keyframes calledPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.2); }
    50%       { box-shadow: 0 0 30px 10px rgba(59,130,246,0.08); }
  }

  @media (prefers-reduced-motion: reduce) {
    .called-card { animation: none; }
  }
</style>
