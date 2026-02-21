<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let appointments: any[] = [];
  let queueEntries: any[] = [];
  let stats = { today: 0, checkedIn: 0, waiting: 0, completed: 0, noShow: 0 };
  let loading = true;
  let intervalId: any;
  let selectedDate = new Date().toISOString().split('T')[0];
  let counterId = '';
  let lastUpdated = '';

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  async function loadData() {
    try {
      const apptResp = await fetch(`${API}/api/v1/staff/appointments?date=${selectedDate}`);
      const apptData = await apptResp.json();
      appointments = apptData.appointments || [];

      stats = {
        today: appointments.length,
        checkedIn: appointments.filter((a: any) => a.status === 'CHECKED_IN').length,
        waiting: appointments.filter((a: any) => ['BOOKED', 'CONFIRMED'].includes(a.status)).length,
        completed: appointments.filter((a: any) => a.status === 'COMPLETED').length,
        noShow: appointments.filter((a: any) => a.status === 'NO_SHOW').length,
      };

      lastUpdated = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      loading = false;
    } catch (e) {
      console.error('Failed to load data:', e);
      loading = false;
    }
  }

  async function callNext() {
    try {
      const resp = await fetch(`${API}/api/v1/staff/queue/call-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'default',
          locationId: 'default',
          counterId: counterId || 'counter-1',
        }),
      });
      const data = await resp.json();
      if (data.success) {
        await loadData();
      }
    } catch (e) {
      console.error('Call next failed:', e);
    }
  }

  async function updateStatus(appointmentId: string, status: string) {
    try {
      await fetch(`${API}/api/v1/staff/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (e) {
      console.error('Status update failed:', e);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  const statusLabels: Record<string, string> = {
    BOOKED: 'Gebucht',
    CONFIRMED: 'Bestaetigt',
    CHECKED_IN: 'Eingecheckt',
    CALLED: 'Aufgerufen',
    IN_PROGRESS: 'In Bearbeitung',
    COMPLETED: 'Abgeschlossen',
    NO_SHOW: 'Nicht erschienen',
    CANCELLED: 'Storniert',
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    BOOKED:      { bg: '#eff6ff', text: '#1d4ed8' },
    CONFIRMED:   { bg: '#f5f3ff', text: '#6d28d9' },
    CHECKED_IN:  { bg: '#fffbeb', text: '#92400e' },
    CALLED:      { bg: '#fff7ed', text: '#c2410c' },
    IN_PROGRESS: { bg: '#ecfeff', text: '#0e7490' },
    COMPLETED:   { bg: '#f0fdf4', text: '#166534' },
    NO_SHOW:     { bg: '#fef2f2', text: '#991b1b' },
    CANCELLED:   { bg: '#f9fafb', text: '#6b7280' },
  };

  // No-Show-Risiko
  let riskScores: Record<string, { score: number; level: string }> = {};

  async function loadRiskScore(bookingId: string) {
    if (riskScores[bookingId]) return riskScores[bookingId];
    try {
      const res = await fetch(`${API}/api/v1/bookings/${bookingId}/risk-score`);
      if (!res.ok) return null;
      const data = await res.json();
      riskScores[bookingId] = data;
      riskScores = { ...riskScores };
      return data;
    } catch {
      return null;
    }
  }

  function getRiskBadgeClass(level: string): string {
    return level === 'high'   ? 'risk-badge risk-high' :
           level === 'medium' ? 'risk-badge risk-medium' :
                                'risk-badge risk-low';
  }

  $: highRiskCount = Object.values(riskScores).filter(r => r.level === 'high').length;

  $: if (appointments.length > 0) {
    appointments
      .filter((a: any) => ['BOOKED', 'CONFIRMED'].includes(a.status))
      .forEach((a: any) => loadRiskScore(a.id));
  }

  $: completionRate = appointments.length > 0
    ? Math.round((stats.completed / appointments.length) * 100)
    : 0;

  onMount(() => {
    loadData();
    intervalId = setInterval(loadData, 15000);
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });
</script>

<svelte:head>
  <title>Mitarbeiter-Dashboard - aitema|Termin</title>
</svelte:head>

<div class="dashboard">
  <!-- Dashboard Header -->
  <div class="dash-header">
    <div class="dash-header-left">
      <div class="dash-title-row">
        <div class="dash-icon">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="20" height="20" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
            <rect x="5" y="5" width="5" height="5" rx="1" fill="#3b82f6"/>
            <rect x="12" y="5" width="5" height="5" rx="1" fill="#3b82f6" opacity="0.4"/>
            <rect x="5" y="12" width="5" height="5" rx="1" fill="#3b82f6" opacity="0.4"/>
            <rect x="12" y="12" width="5" height="5" rx="1" fill="#3b82f6" opacity="0.6"/>
          </svg>
        </div>
        <h1 class="dash-title">Mitarbeiter-Dashboard</h1>
      </div>
      {#if lastUpdated}
        <p class="last-updated">
          <span class="live-dot" aria-hidden="true"></span>
          Live &bull; Zuletzt aktualisiert: {lastUpdated}
        </p>
      {/if}
    </div>
    <div class="dash-header-right">
      <div class="date-control">
        <label for="date-select" class="date-label">Datum</label>
        <input type="date" id="date-select" bind:value={selectedDate} on:change={loadData}
               class="date-input">
      </div>
      <button class="call-next-btn" on:click={callNext}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="8" stroke="white" stroke-width="1.5"/>
          <path d="M6 9h6M9 6l3 3-3 3" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Naechsten aufrufen
      </button>
    </div>
  </div>

  <!-- Stats Grid -->
  <div class="stats-grid" aria-label="Tagesstatistiken">
    <div class="stat-card">
      <div class="stat-icon stat-icon-blue">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="2" y="3" width="16" height="14" rx="2" stroke="#3b82f6" stroke-width="1.5"/>
          <path d="M6 1v4M14 1v4M2 9h16" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="stat-info">
        <p class="stat-value">{stats.today}</p>
        <p class="stat-label">Termine heute</p>
      </div>
    </div>

    <div class="stat-card stat-card-amber">
      <div class="stat-icon stat-icon-amber">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2l1.88 5.79H18l-4.94 3.59L14.94 17.5 10 13.91 5.06 17.5l1.88-5.12L2 8.79h6.12z" stroke="#f59e0b" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="stat-info">
        <p class="stat-value">{stats.checkedIn}</p>
        <p class="stat-label">Eingecheckt</p>
      </div>
    </div>

    <div class="stat-card stat-card-slate">
      <div class="stat-icon stat-icon-slate">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" stroke="#64748b" stroke-width="1.5"/>
          <path d="M10 6v4l3 2" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="stat-info">
        <p class="stat-value">{stats.waiting}</p>
        <p class="stat-label">Wartend</p>
      </div>
    </div>

    <div class="stat-card stat-card-emerald">
      <div class="stat-icon stat-icon-emerald">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" stroke="#059669" stroke-width="1.5"/>
          <path d="M6 10l3 3 5-5" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="stat-info">
        <p class="stat-value">{stats.completed}</p>
        <p class="stat-label">Abgeschlossen</p>
      </div>
    </div>

    <div class="stat-card stat-card-red">
      <div class="stat-icon stat-icon-red">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" stroke="#dc2626" stroke-width="1.5"/>
          <path d="M7 7l6 6M13 7l-6 6" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="stat-info">
        <p class="stat-value">{stats.noShow}</p>
        <p class="stat-label">Nicht erschienen</p>
      </div>
    </div>

    <div class="stat-card" style="border-left: 3px solid #ef4444;">
      <div class="stat-icon stat-icon-red">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" stroke="#ef4444" stroke-width="1.5"/>
          <path d="M10 6v4" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
          <circle cx="10" cy="14" r="1" fill="#ef4444"/>
        </svg>
      </div>
      <div class="stat-info">
        <p class="stat-value" style="color: #ef4444;">{highRiskCount}</p>
        <p class="stat-label">Hohe No-Show-Risiken</p>
      </div>
    </div>
  </div>

  <!-- Appointments Section -->
  <div class="appointments-section">
    <div class="section-header">
      <h2 class="section-title">
        Termine am {new Date(selectedDate).toLocaleDateString('de-DE', {
          weekday: 'long', day: 'numeric', month: 'long'
        })}
      </h2>
      <span class="appointment-count">{appointments.length} Eintraege</span>
    </div>

    {#if loading}
      <div class="loading-state" role="status">
        <div class="spinner"></div>
        <p>Daten werden geladen...</p>
      </div>
    {:else if appointments.length === 0}
      <div class="empty-state">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
          <circle cx="28" cy="28" r="28" fill="#f1f5f9"/>
          <rect x="14" y="16" width="28" height="26" rx="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
          <path d="M20 12v8M36 12v8M14 28h28" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <p class="empty-title">Keine Termine</p>
        <p class="empty-sub">Fuer diesen Tag sind keine Termine vorhanden.</p>
      </div>
    {:else}
      <div class="table-container">
        <table class="appointments-table" aria-label="Terminliste">
          <thead>
            <tr>
              <th scope="col">Zeit</th>
              <th scope="col">Buchungsnr.</th>
              <th scope="col">Name</th>
              <th scope="col">Dienstleistung</th>
              <th scope="col">Status</th>
              <th scope="col"><span class="sr-only">Aktionen</span></th>
            </tr>
          </thead>
          <tbody>
            {#each appointments as apt}
              <tr class="apt-row"
                  class:apt-row-checkedin={apt.status === 'CHECKED_IN'}
                  class:apt-row-called={apt.status === 'CALLED'}
                  class:apt-row-inprogress={apt.status === 'IN_PROGRESS'}>
                <td class="time-cell">
                  <time class="time-main">{formatTime(apt.startTime)}</time>
                  <span class="time-end">bis {formatTime(apt.endTime)}</span>
                </td>
                <td>
                  <code class="booking-code">{apt.bookingRef}</code>
                </td>
                <td class="name-cell">{apt.citizenName}</td>
                <td class="service-cell">{apt.service?.name || '-'}</td>
                <td class="status-risk-cell">
                  <span class="status-pill"
                        style="background: {statusColors[apt.status]?.bg || '#f9fafb'}; color: {statusColors[apt.status]?.text || '#6b7280'}">
                    {statusLabels[apt.status] || apt.status}
                  </span>
                  {#if riskScores[apt.id]}
                    <span class="{getRiskBadgeClass(riskScores[apt.id].level)}">
                      {riskScores[apt.id].level === 'high' ? '!' : riskScores[apt.id].level === 'medium' ? '~' : 'ok'}
                      {riskScores[apt.id].score}%
                    </span>
                  {/if}
                </td>
                <td class="actions-cell">
                  {#if apt.status === 'BOOKED' || apt.status === 'CONFIRMED'}
                    <button class="action-btn action-btn-blue"
                            on:click={() => updateStatus(apt.id, 'CHECKED_IN')}>
                      Einchecken
                    </button>
                    <button class="action-btn action-btn-red"
                            on:click={() => updateStatus(apt.id, 'NO_SHOW')}>
                      N.E.
                    </button>
                  {/if}
                  {#if apt.status === 'CHECKED_IN'}
                    <button class="action-btn action-btn-blue"
                            on:click={() => updateStatus(apt.id, 'CALLED')}>
                      Aufrufen
                    </button>
                  {/if}
                  {#if apt.status === 'CALLED'}
                    <button class="action-btn action-btn-emerald"
                            on:click={() => updateStatus(apt.id, 'IN_PROGRESS')}>
                      Starten
                    </button>
                  {/if}
                  {#if apt.status === 'IN_PROGRESS'}
                    <button class="action-btn action-btn-emerald"
                            on:click={() => updateStatus(apt.id, 'COMPLETED')}>
                      Fertig
                    </button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  .dashboard {
    padding: 1.5rem;
    min-height: 100vh;
    background: #f8fafc;
  }

  /* Header */
  .dash-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 1.75rem; flex-wrap: wrap; gap: 1rem;
  }
  .dash-header-left { display: flex; flex-direction: column; gap: 0.375rem; }
  .dash-title-row { display: flex; align-items: center; gap: 0.75rem; }
  .dash-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .dash-title { font-size: 1.5rem; font-weight: 800; color: #0f172a; letter-spacing: -0.025em; margin: 0; }
  .last-updated { font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 0.375rem; margin: 0; }
  .live-dot {
    display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #059669;
    animation: pulse-dot 2s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .dash-header-right { display: flex; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
  .date-control { display: flex; flex-direction: column; gap: 0.25rem; }
  .date-label { font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
  .date-input {
    padding: 0.5rem 0.75rem; border: 1.5px solid #e2e8f0;
    border-radius: 0.5rem; font-size: 0.875rem; min-height: 40px;
    background: #fff; cursor: pointer; color: #0f172a;
  }
  .date-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }

  .call-next-btn {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
    color: #fff; border: none; border-radius: 0.625rem;
    font-size: 0.9375rem; font-weight: 700; cursor: pointer;
    min-height: 44px; box-shadow: 0 2px 8px rgba(37,99,235,0.3);
    transition: all 0.15s;
  }
  .call-next-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.4); }
  .call-next-btn:focus-visible { outline: 3px solid #3b82f6; outline-offset: 2px; }

  /* Stats */
  .stats-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.875rem; margin-bottom: 2rem;
  }
  .stat-card {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem;
    padding: 1.125rem 1.25rem; display: flex; align-items: center; gap: 0.875rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    transition: box-shadow 0.15s;
  }
  .stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .stat-card-amber { border-left: 3px solid #f59e0b; }
  .stat-card-slate { border-left: 3px solid #64748b; }
  .stat-card-emerald { border-left: 3px solid #059669; }
  .stat-card-red { border-left: 3px solid #dc2626; }

  .stat-icon {
    width: 40px; height: 40px; border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .stat-icon-blue { background: #eff6ff; }
  .stat-icon-amber { background: #fffbeb; }
  .stat-icon-slate { background: #f1f5f9; }
  .stat-icon-emerald { background: #f0fdf4; }
  .stat-icon-red { background: #fef2f2; }

  .stat-info { min-width: 0; }
  .stat-value { font-size: 1.75rem; font-weight: 800; color: #0f172a; line-height: 1; margin-bottom: 0.25rem; }
  .stat-label { font-size: 0.75rem; color: #64748b; font-weight: 500; }

  /* Appointments Section */
  .appointments-section {
    background: #fff; border: 1px solid #e2e8f0;
    border-radius: 0.875rem; overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .section-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9;
  }
  .section-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0; }
  .appointment-count {
    display: inline-flex; align-items: center;
    padding: 0.25rem 0.75rem; background: #f1f5f9;
    border-radius: 9999px; font-size: 0.75rem; font-weight: 600; color: #64748b;
  }

  .table-container { overflow-x: auto; }
  .appointments-table { width: 100%; border-collapse: collapse; }
  .appointments-table th {
    background: #f8fafc; padding: 0.75rem 1rem;
    text-align: left; font-size: 0.75rem; font-weight: 700;
    color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;
    border-bottom: 1px solid #e2e8f0;
  }
  .appointments-table td {
    padding: 0.875rem 1rem; border-bottom: 1px solid #f8fafc;
    font-size: 0.875rem; color: #0f172a; vertical-align: middle;
  }
  .appointments-table tr:last-child td { border-bottom: none; }
  .appointments-table tr:hover td { background: #f8fafc; }

  .apt-row-checkedin td { background: #fffbeb !important; }
  .apt-row-called td { background: #fff7ed !important; }
  .apt-row-inprogress td { background: #f0fdf4 !important; }

  .time-cell { white-space: nowrap; }
  .time-main { display: block; font-weight: 700; font-size: 0.9375rem; }
  .time-end { display: block; font-size: 0.75rem; color: #94a3b8; }

  .booking-code {
    background: #f1f5f9; padding: 0.25rem 0.5rem;
    border-radius: 0.375rem; font-size: 0.75rem; font-family: monospace;
    color: #1e3a5f; font-weight: 600;
  }

  .name-cell { font-weight: 600; }
  .service-cell { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #475569; }

  .status-pill {
    display: inline-flex; align-items: center;
    padding: 0.25rem 0.625rem; border-radius: 9999px;
    font-size: 0.75rem; font-weight: 700; white-space: nowrap;
  }

  .actions-cell { display: flex; gap: 0.375rem; flex-wrap: wrap; align-items: center; }
  .action-btn {
    padding: 0.375rem 0.75rem; border-radius: 0.4rem;
    font-size: 0.75rem; font-weight: 700; cursor: pointer;
    border: none; min-height: 32px; transition: all 0.1s;
    white-space: nowrap;
  }
  .action-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }
  .action-btn-blue { background: #eff6ff; color: #1d4ed8; }
  .action-btn-blue:hover { background: #dbeafe; }
  .action-btn-emerald { background: #f0fdf4; color: #166534; }
  .action-btn-emerald:hover { background: #dcfce7; }
  .action-btn-red { background: #fef2f2; color: #991b1b; }
  .action-btn-red:hover { background: #fee2e2; }

  /* Loading & Empty */
  .loading-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 3rem; color: #64748b; font-size: 0.875rem;
  }
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    padding: 3rem; text-align: center;
  }
  .empty-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0.25rem; }
  .empty-sub { font-size: 0.875rem; color: #94a3b8; }

  /* Spinner */
  .spinner {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2.5px solid #e2e8f0; border-top-color: #3b82f6;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .sr-only {
    position: absolute; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;
  }

  /* Responsive */
  @media (max-width: 900px) {
    .dash-header { flex-direction: column; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .actions-cell { flex-direction: column; }
    .service-cell { max-width: 120px; }
  }
  @media (max-width: 600px) {
    .dashboard { padding: 1rem; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .call-next-btn span { display: none; }
  }

  /* Risk Badge */
  .status-risk-cell { vertical-align: middle; }
  .risk-badge {
    display: inline-flex; align-items: center;
    margin-left: 0.375rem;
    padding: 0.2rem 0.5rem; border-radius: 9999px;
    font-size: 0.7rem; font-weight: 700;
    border: 1px solid currentColor;
    vertical-align: middle;
  }
  .risk-high   { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
  .risk-medium { background: #fffbeb; color: #92400e; border-color: #fde68a; }
  .risk-low    { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }

</style>
