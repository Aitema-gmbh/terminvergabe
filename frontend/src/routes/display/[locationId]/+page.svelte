<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';

  let displayData: any = null;
  let error = '';
  let intervalId: any;
  let currentTime = '';
  let prevCalledNumber = '';
  let flashActive = false;

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const TENANT = import.meta.env.VITE_TENANT_SLUG || 'musterstadt';

  $: locationId = $page.params.locationId;

  async function loadDisplay() {
    try {
      const resp = await fetch(`${API}/api/v1/${TENANT}/queue/display/${locationId}`);
      const data = await resp.json();
      // Detect ticket change for flash animation
      const newNumber = data.called?.[0]?.ticketNumber || '';
      if (newNumber && newNumber !== prevCalledNumber) {
        flashActive = false;
        setTimeout(() => { flashActive = true; }, 50);
        prevCalledNumber = newNumber;
      }
      displayData = data;
    } catch (e: any) {
      error = e.message;
    }
  }

  function updateClock() {
    currentTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  onMount(() => {
    loadDisplay();
    updateClock();
    intervalId = setInterval(loadDisplay, 5000);
    const clockId = setInterval(updateClock, 1000);
    return () => { clearInterval(clockId); };
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  $: currentTicket = displayData?.called?.[0] || null;
  $: isServing = !!currentTicket;
  $: nextQueue = displayData?.waiting?.slice(0, 3) || [];
  $: totalWaiting = displayData?.totalWaiting || 0;
  $: inProgress = displayData?.inProgress || 0;
</script>

<svelte:head>
  <title>Aufrufanzeige – aitema|Termin</title>
  <style>
    body { margin: 0 !important; overflow: hidden !important; background: #0f172a !important; }
    header, footer { display: none !important; }
    main { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
  </style>
</svelte:head>

<div class="kiosk-display" role="status" aria-live="polite" aria-label="Aufrufanzeige">

  <!-- Top Bar -->
  <header class="display-topbar">
    <div class="brand">
      <div class="brand-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="7" fill="#3b82f6"/>
          <rect x="7" y="7" width="14" height="2" rx="1" fill="white"/>
          <rect x="7" y="11" width="10" height="2" rx="1" fill="white"/>
          <rect x="7" y="15" width="12" height="2" rx="1" fill="white"/>
          <rect x="7" y="19" width="8" height="2" rx="1" fill="white"/>
        </svg>
      </div>
      <span class="brand-name">aitema<span class="brand-pipe">|</span>Termin</span>
    </div>
    <div class="topbar-stats">
      <div class="stat-chip">
        <span class="stat-chip-value">{totalWaiting}</span>
        <span class="stat-chip-label">wartend</span>
      </div>
      <div class="stat-chip stat-chip-green">
        <span class="stat-chip-value">{inProgress}</span>
        <span class="stat-chip-label">in Bearb.</span>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  {#if displayData}
    <main class="display-main">

      <!-- Left: Current Ticket (large) -->
      <div class="current-ticket-panel">
        <p class="now-serving-label">
          {isServing ? 'JETZT DRAN' : 'BITTE WARTEN'}
        </p>

        {#if isServing && currentTicket}
          <div class="ticket-number-display" class:ticket-flash={flashActive}
               aria-label="Aktuelle Ticketnummer: {currentTicket.ticketNumber}">
            {currentTicket.ticketNumber}
          </div>
          {#if currentTicket.counter}
            <div class="counter-badge">
              <span class="counter-label">Schalter</span>
              <span class="counter-value">{currentTicket.counter}</span>
            </div>
          {/if}
          {#if currentTicket.service}
            <p class="current-service">{currentTicket.service}</p>
          {/if}
        {:else}
          <div class="ticket-number-display ticket-idle" aria-label="Kein aktiver Aufruf">
            –
          </div>
          <p class="idle-hint">Warten auf nächsten Aufruf...</p>
        {/if}

        <!-- Multiple called (if more counters) -->
        {#if displayData.called?.length > 1}
          <div class="multi-called" aria-label="Weitere Aufrufe">
            {#each displayData.called.slice(1) as entry}
              <div class="multi-called-card">
                <span class="multi-number">{entry.ticketNumber}</span>
                {#if entry.counter}
                  <span class="multi-counter">Schalter {entry.counter}</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Right: Queue List -->
      <aside class="queue-panel">
        <h2 class="queue-panel-title">Nächste Nummern</h2>
        {#if nextQueue.length > 0}
          <ul class="queue-list-display" aria-label="Nächste Tickets in der Warteschlange">
            {#each nextQueue as entry, i}
              <li class="queue-item-display" class:queue-first={i === 0}>
                <span class="q-rank">{i + 1}</span>
                <span class="q-number">{entry.ticketNumber}</span>
                {#if entry.service}
                  <span class="q-service">{entry.service}</span>
                {/if}
              </li>
            {/each}
          </ul>
        {:else}
          <div class="queue-empty">
            <p>Keine weiteren Nummern in der Warteschlange</p>
          </div>
        {/if}

        <!-- Waiting count -->
        <div class="waiting-count-display" aria-label="{totalWaiting} Personen warten">
          <span class="waiting-count-num">{totalWaiting}</span>
          <span class="waiting-count-lbl">
            {totalWaiting === 1 ? 'Person' : 'Personen'} wartend
          </span>
        </div>
      </aside>
    </main>

  {:else if error}
    <div class="display-error">
      <p>⚠ Verbindungsfehler: {error}</p>
      <p class="error-hint">Wird automatisch neu verbunden...</p>
    </div>
  {:else}
    <div class="display-loading">
      <div class="display-spinner"></div>
      <p>Aufrufanzeige wird geladen...</p>
    </div>
  {/if}

  <!-- Clock bottom right -->
  <div class="display-clock" aria-hidden="true">{currentTime}</div>

</div>

<style>
  /* ── Base ────────────────────────────────────────────── */
  .kiosk-display {
    width: 100vw; height: 100vh;
    overflow: hidden;
    display: flex; flex-direction: column;
    background: linear-gradient(160deg, #0a1628 0%, #0f172a 40%, #111b2e 100%);
    color: #f8fafc;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    position: relative;
    user-select: none;
  }

  /* ── Top Bar ────────────────────────────────────────── */
  .display-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 2rem;
    background: rgba(255,255,255,0.04);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
  }
  .brand { display: flex; align-items: center; gap: 0.625rem; }
  .brand-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .brand-name { font-size: 1.0625rem; font-weight: 800; color: rgba(255,255,255,0.9); }
  .brand-pipe { color: #3b82f6; }

  .topbar-stats { display: flex; gap: 0.75rem; }
  .stat-chip {
    display: flex; flex-direction: column; align-items: center;
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 0.625rem; padding: 0.375rem 1rem; min-width: 72px;
  }
  .stat-chip-green { border-color: rgba(5,150,105,0.3); background: rgba(5,150,105,0.1); }
  .stat-chip-value { font-size: 1.375rem; font-weight: 800; line-height: 1; color: #fff; }
  .stat-chip-label { font-size: 0.625rem; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.07em; }

  /* ── Main Layout ────────────────────────────────────── */
  .display-main {
    flex: 1; display: flex; overflow: hidden;
  }

  /* ── Left: Current Ticket ───────────────────────────── */
  .current-ticket-panel {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 2rem 3rem;
    position: relative;
    border-right: 1px solid rgba(255,255,255,0.06);
  }

  /* Radial glow behind ticket number */
  .current-ticket-panel::before {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%);
    pointer-events: none;
  }

  .now-serving-label {
    font-size: 1.25rem; font-weight: 800;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: rgba(255,255,255,0.45);
    margin-bottom: 1.25rem;
    position: relative; z-index: 1;
  }

  .ticket-number-display {
    font-size: clamp(6rem, 16vw, 12rem);
    font-weight: 900; letter-spacing: -0.03em; line-height: 1;
    color: #3b82f6;
    text-shadow:
      0 0 40px rgba(59,130,246,0.5),
      0 0 80px rgba(59,130,246,0.25);
    position: relative; z-index: 1;
    margin-bottom: 1.5rem;
    transition: all 0.3s ease;
  }
  .ticket-number-display.ticket-idle {
    color: rgba(255,255,255,0.15);
    text-shadow: none;
  }

  @keyframes ticket-pop {
    0%   { transform: scale(0.85); opacity: 0.3; }
    60%  { transform: scale(1.06); }
    100% { transform: scale(1); opacity: 1; }
  }
  .ticket-number-display.ticket-flash {
    animation: ticket-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .counter-badge {
    display: flex; flex-direction: column; align-items: center;
    background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3);
    border-radius: 1rem; padding: 0.625rem 2rem;
    margin-bottom: 1rem; position: relative; z-index: 1;
  }
  .counter-label { font-size: 0.6875rem; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.1em; }
  .counter-value { font-size: 1.5rem; font-weight: 800; color: #3b82f6; }

  .current-service {
    font-size: 1rem; color: rgba(255,255,255,0.5); letter-spacing: 0.02em;
    position: relative; z-index: 1;
  }
  .idle-hint { font-size: 0.9375rem; color: rgba(255,255,255,0.25); position: relative; z-index: 1; }

  /* Multiple called (secondary) */
  .multi-called {
    display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;
    margin-top: 2rem; position: relative; z-index: 1;
  }
  .multi-called-card {
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 0.875rem; padding: 1rem 1.5rem;
    display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
  }
  .multi-number { font-size: 2.5rem; font-weight: 800; color: rgba(255,255,255,0.6); }
  .multi-counter { font-size: 0.75rem; color: rgba(255,255,255,0.35); }

  /* ── Right: Queue Panel ────────────────────────────── */
  .queue-panel {
    width: 360px; flex-shrink: 0;
    display: flex; flex-direction: column;
    background: rgba(255,255,255,0.025);
    padding: 2rem 1.75rem;
    gap: 1rem;
  }
  .queue-panel-title {
    font-size: 0.75rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.12em;
    color: rgba(255,255,255,0.35);
    margin-bottom: 0.5rem;
  }

  .queue-list-display {
    list-style: none; display: flex; flex-direction: column; gap: 0.75rem;
  }
  .queue-item-display {
    display: flex; align-items: center; gap: 1rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 0.875rem; padding: 1rem 1.25rem;
    transition: all 0.2s ease;
    animation: queue-slide-in 0.3s ease;
  }
  @keyframes queue-slide-in {
    from { opacity: 0; transform: translateX(16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .queue-item-display.queue-first {
    background: rgba(59,130,246,0.1);
    border-color: rgba(59,130,246,0.25);
  }
  .q-rank {
    font-size: 0.75rem; font-weight: 600;
    color: rgba(255,255,255,0.3);
    min-width: 1.25rem;
  }
  .q-number {
    font-size: 2rem; font-weight: 800;
    color: rgba(255,255,255,0.7);
    flex: 1;
    font-variant-numeric: tabular-nums;
  }
  .queue-item-display.queue-first .q-number { color: #93c5fd; }
  .q-service {
    font-size: 0.75rem; color: rgba(255,255,255,0.3);
    text-align: right; max-width: 100px; line-height: 1.3;
  }

  .queue-empty {
    color: rgba(255,255,255,0.25); font-size: 0.875rem;
    text-align: center; padding: 1.5rem 0;
  }

  /* Waiting count */
  .waiting-count-display {
    margin-top: auto;
    display: flex; flex-direction: column; align-items: center;
    padding: 1.25rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 0.875rem;
  }
  .waiting-count-num {
    font-size: 2.5rem; font-weight: 900;
    color: rgba(255,255,255,0.7); line-height: 1;
  }
  .waiting-count-lbl {
    font-size: 0.75rem; color: rgba(255,255,255,0.35);
    text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.25rem;
  }

  /* ── Clock ──────────────────────────────────────────── */
  .display-clock {
    position: fixed; bottom: 1.25rem; right: 1.75rem;
    font-size: 1.375rem; font-weight: 700;
    color: rgba(255,255,255,0.3);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.05em;
    pointer-events: none;
  }

  /* ── Error / Loading ────────────────────────────────── */
  .display-error, .display-loading {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 1rem;
    color: rgba(255,255,255,0.4); font-size: 1.125rem;
  }
  .error-hint { font-size: 0.875rem; color: rgba(255,255,255,0.25); }
  .display-spinner {
    width: 40px; height: 40px; border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: #3b82f6;
    animation: disp-spin 0.8s linear infinite;
  }
  @keyframes disp-spin { to { transform: rotate(360deg); } }

  /* ── Responsive ─────────────────────────────────────── */
  @media (max-width: 900px) {
    .display-main { flex-direction: column; }
    .current-ticket-panel { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 1.5rem 1rem; flex: none; }
    .queue-panel { width: 100%; flex-direction: row; flex-wrap: wrap; padding: 1rem; gap: 0.75rem; }
    .queue-list-display { flex-direction: row; flex-wrap: wrap; gap: 0.5rem; }
    .queue-item-display { min-width: 120px; }
    .waiting-count-display { margin-top: 0; }
    .ticket-number-display { font-size: clamp(5rem, 22vw, 8rem); }
  }
  @media (max-width: 480px) {
    .display-topbar { padding: 0.75rem 1rem; }
    .current-ticket-panel { padding: 1rem; }
    .now-serving-label { font-size: 0.875rem; letter-spacing: 0.15em; }
    .display-clock { font-size: 1rem; bottom: 0.75rem; right: 1rem; }
  }
</style>
