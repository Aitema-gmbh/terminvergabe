<script lang="ts">
  import { onMount } from 'svelte';

  // ============================================================
  // State
  // ============================================================
  let dailyStats: any = null;
  let weeklyReport: any = null;
  let waitDistribution: any[] = [];
  let serviceAnalytics: any[] = [];
  let loading = true;
  let error = '';
  let selectedDate = new Date().toISOString().split('T')[0];
  let exportFrom = '';
  let exportTo = '';

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const TENANT = import.meta.env.VITE_TENANT_SLUG || 'musterstadt';

  // Set default export range (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  exportFrom = thirtyDaysAgo.toISOString().split('T')[0];
  exportTo = today.toISOString().split('T')[0];

  // ============================================================
  // Data Loading
  // ============================================================
  async function loadAllData() {
    loading = true;
    error = '';
    try {
      const [dailyResp, weeklyResp, waitResp, servicesResp] = await Promise.all([
        fetch(`${API}/api/v1/${TENANT}/stats/daily?date=${selectedDate}`),
        fetch(`${API}/api/v1/${TENANT}/stats/weekly`),
        fetch(`${API}/api/v1/${TENANT}/stats/wait-times?from=${exportFrom}&to=${exportTo}`),
        fetch(`${API}/api/v1/${TENANT}/stats/services?from=${exportFrom}&to=${exportTo}`),
      ]);

      const [dailyData, weeklyData, waitData, servicesData] = await Promise.all([
        dailyResp.json(),
        weeklyResp.json(),
        waitResp.json(),
        servicesResp.json(),
      ]);

      dailyStats = dailyData.data || null;
      weeklyReport = weeklyData.data || null;
      waitDistribution = waitData.data || [];
      serviceAnalytics = servicesData.data || [];
    } catch (e: any) {
      error = 'Daten konnten nicht geladen werden: ' + e.message;
    }
    loading = false;
  }

  async function handleDateChange() {
    await loadAllData();
  }

  function downloadCSV() {
    const url = `${API}/api/v1/${TENANT}/stats/export?format=csv&from=${exportFrom}&to=${exportTo}`;
    window.open(url, '_blank');
  }

  // ============================================================
  // Helpers
  // ============================================================
  function maxBarValue(arr: { count: number }[]): number {
    if (!arr || arr.length === 0) return 1;
    return Math.max(...arr.map(a => a.count), 1);
  }

  function maxHourlyValue(): number {
    if (!dailyStats?.hourlyBreakdown) return 1;
    return Math.max(...dailyStats.hourlyBreakdown.map((h: any) => h.count), 1);
  }

  function noShowRate(): string {
    if (!dailyStats || dailyStats.totalAppointments === 0) return '0';
    return Math.round((dailyStats.noShows / dailyStats.totalAppointments) * 100).toString();
  }

  onMount(loadAllData);
</script>

<svelte:head>
  <title>Statistik - aitema|Termin</title>
</svelte:head>

<div class="stats-page">
  <header class="stats-header">
    <div>
      <h1>Statistik</h1>
      <p class="stats-subtitle">Auswertungen und Kapazitaetsmanagement</p>
    </div>
    <div class="header-actions">
      <input type="date" bind:value={selectedDate} on:change={handleDateChange}
             class="form-control" aria-label="Datum waehlen" />
      <button class="btn btn-outline" on:click={downloadCSV} aria-label="CSV exportieren">
        CSV Export
      </button>
    </div>
  </header>

  {#if loading}
    <div class="loading-state" role="status">
      <p>Statistiken werden geladen...</p>
    </div>
  {:else if error}
    <div class="error-state" role="alert">
      <p>{error}</p>
      <button class="btn" on:click={loadAllData}>Erneut versuchen</button>
    </div>
  {:else}

    <!-- KPI Cards -->
    <section class="kpi-grid" aria-label="Kennzahlen heute">
      <div class="kpi-card">
        <span class="kpi-value">{dailyStats?.totalAppointments ?? 0}</span>
        <span class="kpi-label">Termine</span>
      </div>
      <div class="kpi-card kpi-card--accent">
        <span class="kpi-value">{dailyStats?.walkIns ?? 0}</span>
        <span class="kpi-label">Walk-ins</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-value">{dailyStats?.avgWaitMinutes ?? 0} Min.</span>
        <span class="kpi-label">Wartezeit</span>
      </div>
      <div class="kpi-card kpi-card--warning">
        <span class="kpi-value">{noShowRate()}%</span>
        <span class="kpi-label">No-Show-Rate</span>
      </div>
      <div class="kpi-card kpi-card--success">
        <span class="kpi-value">{dailyStats?.completed ?? 0}</span>
        <span class="kpi-label">Abgeschlossen</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-value">{dailyStats?.avgServiceMinutes ?? 0} Min.</span>
        <span class="kpi-label">Bedienzeit</span>
      </div>
    </section>

    <!-- Hourly Breakdown Chart -->
    {#if dailyStats?.hourlyBreakdown && dailyStats.hourlyBreakdown.length > 0}
    <section class="chart-section" aria-label="Tagesverlauf">
      <h2>Tagesverlauf <span class="chart-date">{selectedDate}</span></h2>
      <div class="bar-chart" role="img" aria-label="Termine pro Stunde">
        {#each dailyStats.hourlyBreakdown as hour}
          <div class="bar-col">
            <div class="bar-value">{hour.count}</div>
            <div class="bar"
                 style="height: {Math.max((hour.count / maxHourlyValue()) * 100, 2)}%"
                 class:bar--peak={hour.hour === dailyStats.peakHour}>
            </div>
            <div class="bar-label">{String(hour.hour).padStart(2, '0')}</div>
          </div>
        {/each}
      </div>
      {#if dailyStats.peakHour >= 0}
        <p class="chart-note">Peak-Stunde: {String(dailyStats.peakHour).padStart(2, '0')}:00 Uhr</p>
      {/if}
    </section>
    {/if}

    <!-- Wait Time Distribution -->
    {#if waitDistribution.length > 0}
    <section class="chart-section" aria-label="Wartezeitenverteilung">
      <h2>Wartezeitenverteilung</h2>
      <div class="bar-chart bar-chart--horizontal" role="img" aria-label="Wartezeiten in Buckets">
        {#each waitDistribution as bucket}
          <div class="hbar-row">
            <span class="hbar-label">{bucket.label}</span>
            <div class="hbar-track">
              <div class="hbar"
                   style="width: {Math.max(bucket.percentage, 1)}%"
                   class:hbar--high={bucket.percentage > 30}>
              </div>
            </div>
            <span class="hbar-value">{bucket.count} ({bucket.percentage}%)</span>
          </div>
        {/each}
      </div>
    </section>
    {/if}

    <!-- Service Analytics Table -->
    {#if serviceAnalytics.length > 0}
    <section class="table-section" aria-label="Top Dienstleistungen">
      <h2>Top Dienstleistungen</h2>
      <div class="table-wrapper">
        <table class="data-table" aria-label="Dienstleistungsanalyse">
          <thead>
            <tr>
              <th scope="col">Dienstleistung</th>
              <th scope="col">Kategorie</th>
              <th scope="col" class="num">Anzahl</th>
              <th scope="col" class="num">Anteil</th>
              <th scope="col" class="num">Wartezeit</th>
              <th scope="col" class="num">Bedienzeit</th>
            </tr>
          </thead>
          <tbody>
            {#each serviceAnalytics as svc}
              <tr>
                <td>{svc.serviceName}</td>
                <td><span class="badge">{svc.category}</span></td>
                <td class="num">{svc.totalCount}</td>
                <td class="num">{svc.percentageOfTotal}%</td>
                <td class="num">{svc.avgWaitMinutes} Min.</td>
                <td class="num">{svc.avgDurationMinutes} Min.</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
    {/if}

    <!-- Weekly Comparison -->
    {#if weeklyReport}
    <section class="weekly-section" aria-label="Wochenvergleich">
      <h2>Wochenvergleich - {weeklyReport.weekLabel}</h2>
      <div class="weekly-grid">
        <div class="weekly-stat">
          <span class="weekly-value">{weeklyReport.totalAppointments + weeklyReport.totalWalkIns}</span>
          <span class="weekly-label">Gesamt</span>
        </div>
        <div class="weekly-stat">
          <span class="weekly-value">{weeklyReport.avgDailyAppointments}</span>
          <span class="weekly-label">Pro Tag</span>
        </div>
        <div class="weekly-stat">
          <span class="weekly-value">{weeklyReport.avgWaitMinutes} Min.</span>
          <span class="weekly-label">Wartezeit</span>
        </div>
        <div class="weekly-stat">
          <span class="weekly-value">{weeklyReport.noShowRate}%</span>
          <span class="weekly-label">No-Show</span>
        </div>
      </div>
      {#if weeklyReport.dailyBreakdown}
        <div class="bar-chart" role="img" aria-label="Wochenverlauf">
          {#each weeklyReport.dailyBreakdown as day}
            <div class="bar-col">
              <div class="bar-value">{day.count}</div>
              <div class="bar"
                   style="height: {Math.max((day.count / (weeklyReport.peakDayCount || 1)) * 100, 2)}%"
                   class:bar--peak={day.dayName === weeklyReport.peakDay}>
              </div>
              <div class="bar-label">{day.dayName.substring(0, 2)}</div>
            </div>
          {/each}
        </div>
        <p class="chart-note">
          Peak: {weeklyReport.peakDay} ({weeklyReport.peakDayCount}) |
          Tal: {weeklyReport.valleyDay} ({weeklyReport.valleyDayCount})
        </p>
      {/if}
    </section>
    {/if}

    <!-- Export Section -->
    <section class="export-section" aria-label="Daten exportieren">
      <h2>Daten exportieren</h2>
      <div class="export-controls">
        <label>
          Von:
          <input type="date" bind:value={exportFrom} class="form-control" />
        </label>
        <label>
          Bis:
          <input type="date" bind:value={exportTo} class="form-control" />
        </label>
        <button class="btn btn-primary" on:click={downloadCSV}>
          CSV herunterladen
        </button>
      </div>
    </section>

  {/if}
</div>

<style>
  .stats-page { padding: 1.5rem; max-width: 1100px; }

  .stats-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
  .stats-header h1 { font-size: 1.5rem; margin: 0; }
  .stats-subtitle { color: #6b7280; font-size: 0.875rem; margin: 0.25rem 0 0; }
  .header-actions { display: flex; gap: 0.75rem; align-items: center; }

  /* KPI Cards */
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; margin-bottom: 2rem; }
  .kpi-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.25rem; text-align: center; }
  .kpi-card--accent { border-left: 4px solid #3b82f6; }
  .kpi-card--warning { border-left: 4px solid #f59e0b; }
  .kpi-card--success { border-left: 4px solid #16a34a; }
  .kpi-value { display: block; font-size: 1.75rem; font-weight: 800; color: #111827; }
  .kpi-label { display: block; font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; }

  /* Chart sections */
  .chart-section, .table-section, .weekly-section, .export-section {
    background: #fff; border: 1px solid #e5e7eb; border-radius: 0.75rem;
    padding: 1.5rem; margin-bottom: 1.5rem;
  }
  h2 { font-size: 1rem; font-weight: 700; margin: 0 0 1rem; }
  .chart-date { color: #6b7280; font-weight: 400; }
  .chart-note { font-size: 0.75rem; color: #6b7280; margin-top: 0.75rem; }

  /* Vertical Bar Chart (CSS only) */
  .bar-chart { display: flex; align-items: flex-end; gap: 0.25rem; height: 180px; }
  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
  .bar {
    width: 100%; min-width: 12px; max-width: 40px;
    background: #3b82f6; border-radius: 3px 3px 0 0;
    transition: height 0.3s ease;
  }
  .bar--peak { background: #f59e0b; }
  .bar-value { font-size: 0.625rem; color: #6b7280; margin-bottom: 2px; }
  .bar-label { font-size: 0.625rem; color: #6b7280; margin-top: 4px; }

  /* Horizontal Bar Chart */
  .bar-chart--horizontal { display: flex; flex-direction: column; height: auto; gap: 0.5rem; }
  .hbar-row { display: flex; align-items: center; gap: 0.75rem; }
  .hbar-label { width: 80px; font-size: 0.875rem; color: #374151; text-align: right; flex-shrink: 0; }
  .hbar-track { flex: 1; height: 28px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
  .hbar { height: 100%; background: #3b82f6; border-radius: 4px; transition: width 0.3s ease; min-width: 2px; }
  .hbar--high { background: #f59e0b; }
  .hbar-value { width: 90px; font-size: 0.75rem; color: #6b7280; flex-shrink: 0; }

  /* Data Table */
  .table-wrapper { overflow-x: auto; }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th { background: #f9fafb; padding: 0.625rem 0.75rem; text-align: left; font-size: 0.75rem; color: #6b7280; border-bottom: 2px solid #e5e7eb; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .data-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; }
  .data-table tr:hover { background: #f9fafb; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; background: #eff6ff; color: #1d4ed8; font-size: 0.75rem; font-weight: 500; }

  /* Weekly */
  .weekly-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
  .weekly-stat { text-align: center; padding: 0.75rem; background: #f9fafb; border-radius: 0.5rem; }
  .weekly-value { display: block; font-size: 1.25rem; font-weight: 700; }
  .weekly-label { display: block; font-size: 0.75rem; color: #6b7280; }

  /* Export */
  .export-controls { display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; }
  .export-controls label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; color: #374151; }

  /* Form Controls & Buttons */
  .form-control { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; min-height: 44px; background: #fff; }
  .form-control:focus { outline: 2px solid #2563eb; outline-offset: 1px; border-color: #2563eb; }

  .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; cursor: pointer; border: 1px solid #d1d5db; background: #fff; color: #374151; min-height: 44px; font-weight: 600; }
  .btn:hover { background: #f3f4f6; }
  .btn:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
  .btn-primary { background: #1e3a5f; color: #fff; border-color: #1e3a5f; }
  .btn-primary:hover { background: #2d5a8e; }
  .btn-outline { border: 1px solid #d1d5db; background: transparent; }

  .loading-state, .error-state { text-align: center; padding: 3rem; color: #6b7280; }
  .error-state { color: #dc2626; }

  @media (max-width: 768px) {
    .stats-header { flex-direction: column; }
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .weekly-grid { grid-template-columns: repeat(2, 1fr); }
    .export-controls { flex-direction: column; }
    .hbar-label { width: 60px; font-size: 0.75rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .bar, .hbar { transition: none; }
  }
</style>
