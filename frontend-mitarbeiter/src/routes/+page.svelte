<script lang="ts">
  import { onMount } from "svelte";

  let todayStats = ({
    appointments: 0,
    completed: 0,
    waiting: 0,
    noShow: 0,
  });

  let currentTime = (new Date());

  onMount(() => {
    const timer = setInterval(() => {
      currentTime = new Date();
    }, 1000);
    return () => clearInterval(timer);
  });
</script>

<svelte:head>
  <title>aitema|Termin - Mitarbeiter</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
</svelte:head>

<main class="staff-main">
  <div class="staff-dashboard">

    <!-- HEADER -->
    <header class="staff-header">
      <div style="display:flex;align-items:center;gap:0.875rem;">
        <div class="staff-logo-icon">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="7" fill="#3b82f6"/>
            <rect x="7" y="7" width="14" height="2" rx="1" fill="white"/>
            <rect x="7" y="11" width="10" height="2" rx="1" fill="white"/>
            <rect x="7" y="15" width="12" height="2" rx="1" fill="white"/>
            <rect x="7" y="19" width="8" height="2" rx="1" fill="white"/>
          </svg>
        </div>
        <div>
          <h1 style="font-size:1.25rem;margin:0;">aitema<span style="color:#3b82f6;">|</span>Termin</h1>
          <p style="font-size:0.8125rem;color:var(--aitema-muted);margin:0;">Mitarbeiter-Dashboard</p>
        </div>
      </div>
      <div class="staff-clock" aria-live="polite" aria-label="Aktuelle Uhrzeit">
        {currentTime.toLocaleTimeString("de-DE")}
      </div>
    </header>

    <!-- STAT GRID -->
    <div class="stat-grid" role="region" aria-label="Tagesstatistik">
      <div class="stat-card blue">
        <span class="stat-icon" aria-hidden="true">&#128197;</span>
        <div class="stat-number">{todayStats.appointments}</div>
        <div class="stat-label">Termine heute</div>
      </div>
      <div class="stat-card green">
        <span class="stat-icon" aria-hidden="true">&#10003;</span>
        <div class="stat-number">{todayStats.completed}</div>
        <div class="stat-label">Erledigt</div>
      </div>
      <div class="stat-card amber">
        <span class="stat-icon" aria-hidden="true">&#9201;</span>
        <div class="stat-number">{todayStats.waiting}</div>
        <div class="stat-label">Wartend</div>
      </div>
      <div class="stat-card red">
        <span class="stat-icon" aria-hidden="true">&#215;</span>
        <div class="stat-number">{todayStats.noShow}</div>
        <div class="stat-label">Nicht erschienen</div>
      </div>
    </div>

    <!-- ACTION GRID -->
    <div class="action-grid" role="navigation" aria-label="Schnellzugriff">
      <a href="/queue" class="action-tile primary">
        <span class="action-tile-icon" aria-hidden="true">&#128101;</span>
        Warteschlange
      </a>
      <a href="/appointments" class="action-tile">
        <span class="action-tile-icon" aria-hidden="true">&#128197;</span>
        Termine
      </a>
      <a href="/stats" class="action-tile">
        <span class="action-tile-icon" aria-hidden="true">&#128202;</span>
        Statistik
      </a>
    </div>

    <!-- INFO BANNER -->
    <div class="alert alert-info" role="status">
      <span class="alert-icon">&#8505;</span>
      <span>Alle Daten werden in Echtzeit aktualisiert. Letzte Aktualisierung: {currentTime.toLocaleTimeString("de-DE")}</span>
    </div>

  </div>
</main>

<style>
  .staff-main {
    min-height: 100vh;
    background: var(--aitema-slate-50, #f8fafc);
    font-family: "Inter", system-ui, sans-serif;
  }

  .staff-logo-icon {
    width: 40px; height: 40px;
    border-radius: 10px;
    background: #0f172a;
    display: flex; align-items: center; justify-content: center;
  }

  .staff-clock {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--aitema-navy, #0f172a);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.025em;
  }

  /* re-use global classes but define locally if needed */
  :global(.stat-card.red::before) {
    background: linear-gradient(to right, #dc2626, #ef4444);
  }
</style>
