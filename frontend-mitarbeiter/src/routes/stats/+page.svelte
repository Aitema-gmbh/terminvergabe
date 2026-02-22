<script lang="ts">
</script>

<svelte:head>
  <title>Statistik - aitema|Termin</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <h1 class="page-title">Statistik</h1>
    <p class="page-subtitle">Uebersicht der Tages- und Wochenleistungen</p>
  </div>

  <div class="stats-grid">
    <div class="stat-card blue">
      <span class="stat-icon" aria-hidden="true">&#8987;</span>
      <div class="stat-number">-- <span style="font-size:1rem;font-weight:500;color:var(--aitema-muted);">Min.</span></div>
      <div class="stat-label">Ø Wartezeit</div>
    </div>
    <div class="stat-card green">
      <span class="stat-icon" aria-hidden="true">&#128197;</span>
      <div class="stat-number">--</div>
      <div class="stat-label">Termine heute</div>
    </div>
    <div class="stat-card amber">
      <span class="stat-icon" aria-hidden="true">&#10060;</span>
      <div class="stat-number">-- <span style="font-size:1rem;font-weight:500;color:var(--aitema-muted);">%</span></div>
      <div class="stat-label">No-Show-Rate</div>
    </div>
    <div class="stat-card blue" style="--card-accent:var(--aitema-blue);">
      <span class="stat-icon" aria-hidden="true">&#128202;</span>
      <div class="stat-number">-- <span style="font-size:1rem;font-weight:500;color:var(--aitema-muted);">%</span></div>
      <div class="stat-label">Auslastung</div>
    </div>
  </div>

  <div class="alert alert-info">
    <span class="alert-icon">&#8505;</span>
    <span>Statistiken werden in Kuerze mit Echtzeitdaten befuellt.</span>
  </div>
</div>
