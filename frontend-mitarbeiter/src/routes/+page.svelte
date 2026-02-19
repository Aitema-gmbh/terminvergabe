<script lang="ts">
  import { onMount } from "svelte";

  let todayStats = $state({
    appointments: 0,
    completed: 0,
    waiting: 0,
    noShow: 0,
  });

  let currentTime = $state(new Date());

  onMount(() => {
    const timer = setInterval(() => {
      currentTime = new Date();
    }, 1000);
    return () => clearInterval(timer);
  });
</script>

<svelte:head>
  <title>aitema|Termin - Mitarbeiter</title>
</svelte:head>

<main class="dashboard">
  <header>
    <h1>aitema<span class="accent">|</span>Termin</h1>
    <div class="clock">{currentTime.toLocaleTimeString("de-DE")}</div>
  </header>

  <div class="stats-grid">
    <div class="stat-card">
      <span class="stat-value">{todayStats.appointments}</span>
      <span class="stat-label">Termine heute</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{todayStats.completed}</span>
      <span class="stat-label">Erledigt</span>
    </div>
    <div class="stat-card warning">
      <span class="stat-value">{todayStats.waiting}</span>
      <span class="stat-label">Wartend</span>
    </div>
    <div class="stat-card danger">
      <span class="stat-value">{todayStats.noShow}</span>
      <span class="stat-label">Nicht erschienen</span>
    </div>
  </div>

  <nav class="quick-actions">
    <a href="/queue" class="action-btn primary">Warteschlange</a>
    <a href="/appointments" class="action-btn">Termine</a>
    <a href="/stats" class="action-btn">Statistik</a>
  </nav>
</main>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 2px solid #003366;
  }

  header h1 { margin: 0; font-size: 1.5rem; color: #003366; }
  .accent { color: #ff9900; }
  .clock { font-size: 1.5rem; font-weight: 700; color: #003366; font-variant-numeric: tabular-nums; }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 2rem 0;
  }

  .stat-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 1.5rem;
    text-align: center;
    border-left: 4px solid #003366;
  }

  .stat-card.warning { border-left-color: #ff9900; }
  .stat-card.danger { border-left-color: #cc0000; }

  .stat-value {
    display: block;
    font-size: 2.5rem;
    font-weight: 700;
    color: #003366;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .quick-actions {
    display: flex;
    gap: 1rem;
    margin: 2rem 0;
  }

  .action-btn {
    flex: 1;
    padding: 1rem;
    text-align: center;
    background: white;
    border: 2px solid #003366;
    border-radius: 8px;
    color: #003366;
    text-decoration: none;
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .action-btn:hover { background: #003366; color: white; }
  .action-btn.primary { background: #003366; color: white; }
  .action-btn.primary:hover { background: #004d99; }
</style>
