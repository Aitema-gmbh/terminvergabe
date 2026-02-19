<script lang="ts">
</script>

<svelte:head>
  <title>Statistik - aitema|Termin</title>
</svelte:head>

<main class="page">
  <h1>Statistik</h1>
  <div class="stats-grid">
    <div class="stat-card">
      <h3>Durchschnittliche Wartezeit</h3>
      <span class="value">-- Min.</span>
    </div>
    <div class="stat-card">
      <h3>Termine heute</h3>
      <span class="value">--</span>
    </div>
    <div class="stat-card">
      <h3>No-Show-Rate</h3>
      <span class="value">-- %</span>
    </div>
    <div class="stat-card">
      <h3>Auslastung</h3>
      <span class="value">-- %</span>
    </div>
  </div>
</main>

<style>
  .page { max-width: 900px; margin: 0 auto; padding: 1rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  h1 { color: #003366; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
  .stat-card { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; }
  .stat-card h3 { margin: 0 0 0.5rem; font-size: 0.875rem; color: #666; }
  .value { font-size: 2rem; font-weight: 700; color: #003366; }
</style>
