<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let appointments: any[] = [];
  let queueEntries: any[] = [];
  let stats = { today: 0, checkedIn: 0, waiting: 0, completed: 0, noShow: 0 };
  let loading = true;
  let intervalId: any;
  let selectedDate = new Date().toISOString().split('T')[0];
  let counterId = '';

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  async function loadData() {
    try {
      // Load today's appointments
      const apptResp = await fetch(`${API}/api/v1/staff/appointments?date=${selectedDate}`);
      const apptData = await apptResp.json();
      appointments = apptData.appointments || [];

      // Calculate stats
      stats = {
        today: appointments.length,
        checkedIn: appointments.filter((a: any) => a.status === 'CHECKED_IN').length,
        waiting: appointments.filter((a: any) => ['BOOKED', 'CONFIRMED'].includes(a.status)).length,
        completed: appointments.filter((a: any) => a.status === 'COMPLETED').length,
        noShow: appointments.filter((a: any) => a.status === 'NO_SHOW').length,
      };

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

  const statusColors: Record<string, string> = {
    BOOKED: '#3b82f6',
    CONFIRMED: '#8b5cf6',
    CHECKED_IN: '#f59e0b',
    CALLED: '#f97316',
    IN_PROGRESS: '#06b6d4',
    COMPLETED: '#16a34a',
    NO_SHOW: '#dc2626',
    CANCELLED: '#6b7280',
  };

  onMount(() => {
    loadData();
    intervalId = setInterval(loadData, 15000); // Refresh every 15s
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });
</script>

<svelte:head>
  <title>Mitarbeiter-Dashboard - aitema|Termin</title>
</svelte:head>

<div class="staff-dashboard">
  <header class="dashboard-header">
    <h1>Mitarbeiter-Dashboard</h1>
    <div class="header-controls">
      <input type="date" bind:value={selectedDate} on:change={loadData}
             class="form-control" style="width: 180px;">
      <button class="btn btn-primary btn-lg" on:click={callNext}>
        Naechsten aufrufen
      </button>
    </div>
  </header>

  <!-- Stats -->
  <div class="stats-grid" aria-label="Tagesstatistiken">
    <div class="stat-card">
      <div class="stat-value">{stats.today}</div>
      <div class="stat-label">Termine heute</div>
    </div>
    <div class="stat-card stat-card--warning">
      <div class="stat-value">{stats.checkedIn}</div>
      <div class="stat-label">Eingecheckt</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{stats.waiting}</div>
      <div class="stat-label">Wartend</div>
    </div>
    <div class="stat-card stat-card--success">
      <div class="stat-value">{stats.completed}</div>
      <div class="stat-label">Abgeschlossen</div>
    </div>
    <div class="stat-card stat-card--danger">
      <div class="stat-value">{stats.noShow}</div>
      <div class="stat-label">Nicht erschienen</div>
    </div>
  </div>

  <!-- Appointments Table -->
  <section aria-label="Termine">
    <h2>Termine am {new Date(selectedDate).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
    
    {#if loading}
      <p role="status" class="loading">Laden...</p>
    {:else if appointments.length === 0}
      <p class="empty">Keine Termine fuer diesen Tag.</p>
    {:else}
      <div class="table-wrapper">
        <table class="data-table" aria-label="Terminliste">
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
              <tr class:row-checkedin={apt.status === 'CHECKED_IN'}
                  class:row-called={apt.status === 'CALLED'}>
                <td>
                  <time>{formatTime(apt.startTime)} - {formatTime(apt.endTime)}</time>
                </td>
                <td><code>{apt.bookingRef}</code></td>
                <td>{apt.citizenName}</td>
                <td>{apt.service?.name || '-'}</td>
                <td>
                  <span class="status-badge"
                        style="background: {statusColors[apt.status] || '#6b7280'}">
                    {statusLabels[apt.status] || apt.status}
                  </span>
                </td>
                <td class="action-cell">
                  {#if apt.status === 'BOOKED' || apt.status === 'CONFIRMED'}
                    <button class="btn btn-sm" on:click={() => updateStatus(apt.id, 'CHECKED_IN')}>
                      Einchecken
                    </button>
                    <button class="btn btn-sm btn-danger" on:click={() => updateStatus(apt.id, 'NO_SHOW')}>
                      N.E.
                    </button>
                  {/if}
                  {#if apt.status === 'CHECKED_IN'}
                    <button class="btn btn-sm btn-primary" on:click={() => updateStatus(apt.id, 'CALLED')}>
                      Aufrufen
                    </button>
                  {/if}
                  {#if apt.status === 'CALLED'}
                    <button class="btn btn-sm btn-success" on:click={() => updateStatus(apt.id, 'IN_PROGRESS')}>
                      Start
                    </button>
                  {/if}
                  {#if apt.status === 'IN_PROGRESS'}
                    <button class="btn btn-sm btn-success" on:click={() => updateStatus(apt.id, 'COMPLETED')}>
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
  </section>
</div>

<style>
  .staff-dashboard { padding: 1.5rem; }
  .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
  .dashboard-header h1 { font-size: 1.5rem; margin: 0; }
  .header-controls { display: flex; gap: 0.75rem; align-items: center; }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 2rem; }
  .stat-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; text-align: center; }
  .stat-card--warning { border-left: 4px solid #f59e0b; }
  .stat-card--success { border-left: 4px solid #16a34a; }
  .stat-card--danger { border-left: 4px solid #dc2626; }
  .stat-value { font-size: 2rem; font-weight: 700; }
  .stat-label { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }

  h2 { font-size: 1.125rem; margin-bottom: 1rem; }
  .table-wrapper { overflow-x: auto; }
  .data-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 0.5rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .data-table th { background: #f9fafb; padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; color: #374151; border-bottom: 2px solid #e5e7eb; font-weight: 600; }
  .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; }
  .data-table tr:hover { background: #f9fafb; }
  
  .row-checkedin { background: #fffbeb !important; }
  .row-called { background: #fff7ed !important; border-left: 3px solid #f97316; }

  .status-badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; color: #fff; font-size: 0.75rem; font-weight: 600; }
  
  .action-cell { display: flex; gap: 0.25rem; flex-wrap: wrap; }
  
  code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; }

  .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; cursor: pointer; border: 1px solid #d1d5db; background: #fff; min-height: 44px; font-weight: 600; }
  .btn:hover { background: #f3f4f6; }
  .btn:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
  .btn-primary { background: #1e3a5f; color: #fff; border-color: #1e3a5f; }
  .btn-primary:hover { background: #2d5a8e; }
  .btn-success { background: #16a34a; color: #fff; border-color: #16a34a; }
  .btn-danger { background: #dc2626; color: #fff; border-color: #dc2626; }
  .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.75rem; min-height: 32px; }
  .btn-lg { padding: 0.75rem 1.5rem; font-size: 1rem; }
  
  .form-control { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; min-height: 44px; }
  
  .loading { color: #6b7280; text-align: center; padding: 2rem; }
  .empty { color: #9ca3af; text-align: center; padding: 2rem; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0; }

  @media (max-width: 768px) {
    .dashboard-header { flex-direction: column; align-items: flex-start; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .action-cell { flex-direction: column; }
  }
</style>
