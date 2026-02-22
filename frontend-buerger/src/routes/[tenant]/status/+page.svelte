<script lang="ts">
  import { page } from "$app/stores";
  import { onMount, onDestroy } from "svelte";
  import { t } from "$lib/i18n/index.js";
  import { getQueueStatus, connectQueueWebSocket, type QueueStatus } from "$lib/api.js";

  const tenant = $page.params.tenant;

  let locationId = $state("");
  let queueStatus = $state<QueueStatus | null>(null);
  let ws: WebSocket | null = null;
  let connected = $state(false);

  function connect() {
    if (!locationId) return;
    ws = connectQueueWebSocket(tenant, locationId);
    if (!ws) return;

    ws.onopen = () => { connected = true; };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "QUEUE_UPDATE") {
          queueStatus = msg.data;
        }
      } catch {}
    };

    ws.onclose = () => {
      connected = false;
      setTimeout(connect, 3000);
    };
  }

  onDestroy(() => {
    ws?.close();
  });

  // Status label helpers
  function statusLabel(status: string): string {
    switch (status) {
      case 'CONFIRMED': return 'Bestaetigt';
      case 'PENDING':   return 'Ausstehend';
      case 'CANCELLED': return 'Storniert';
      case 'CALLED':    return 'Aufgerufen';
      case 'COMPLETED': return 'Abgeschlossen';
      default: return status;
    }
  }
  function statusColor(status: string): string {
    switch (status) {
      case 'CONFIRMED':  return 'aitema-badge-green';
      case 'PENDING':    return 'aitema-badge-amber';
      case 'CANCELLED':  return 'aitema-badge-red';
      case 'CALLED':     return 'aitema-badge-blue';
      case 'COMPLETED':  return 'aitema-badge-green';
      default: return 'aitema-badge-slate';
    }
  }
  function timelineDotClass(status: string): string {
    switch (status) {
      case 'CONFIRMED':
      case 'COMPLETED':  return 'timeline-dot timeline-dot-green';
      case 'PENDING':    return 'timeline-dot timeline-dot-amber';
      case 'CANCELLED':  return 'timeline-dot timeline-dot-red';
      case 'CALLED':     return 'timeline-dot timeline-dot-green';
      default: return 'timeline-dot timeline-dot-slate';
    }
  }
</script>

<svelte:head>
  <title>{t("queue.title")} - aitema|Termin</title>
</svelte:head>

<!-- Hero -->
<div class="aitema-gradient-hero" style="padding:2.5rem 0 3rem;">
  <div class="aitema-container">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 style="font-size:1.875rem;font-weight:800;color:white;margin-bottom:0.375rem;letter-spacing:-0.02em;">
          {t("queue.title")}
        </h1>
        <p style="color:rgba(255,255,255,0.7);font-size:0.9375rem;">Live-Status der Warteschlange</p>
      </div>
      <!-- Live Indicator -->
      <div class="live-badge" style="background:{connected ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'};color:{connected ? '#6ee7b7' : '#fca5a5'};">
        <span class="live-dot" style="background:{connected ? '#10b981' : '#ef4444'};"></span>
        {connected ? "Live" : "Verbinde..."}
      </div>
    </div>
  </div>
</div>

<div class="aitema-container" style="padding-top:2rem;padding-bottom:3rem;">

  {#if queueStatus}
    <!-- Stats Row -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:2rem;">
      <div class="stat-card-gov blue">
        <div class="stat-title">Wartend</div>
        <div class="stat-value">{queueStatus.summary.waiting}</div>
      </div>
      <div class="stat-card-gov amber">
        <div class="stat-title">Aufgerufen</div>
        <div class="stat-value">{queueStatus.summary.called}</div>
      </div>
      <div class="stat-card-gov green">
        <div class="stat-title">Bedient</div>
        <div class="stat-value">{queueStatus.summary.completed}</div>
      </div>
    </div>

    <!-- Currently Called Tickets (prominent) -->
    {#if queueStatus.tickets.filter(tk => tk.status === "CALLED").length > 0}
      <div class="aitema-card" style="padding:1.5rem;margin-bottom:1.5rem;">
        <p style="font-size:0.75rem;font-weight:600;color:var(--aitema-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:1rem;">
          Jetzt aufgerufen
        </p>
        <div style="display:flex;flex-direction:column;gap:0.75rem;" role="list" aria-label="Aktuelle Aufrufe">
          {#each queueStatus.tickets.filter(tk => tk.status === "CALLED") as ticket}
            <div class="ticket-card-gov called" role="listitem">
              <span class="ticket-number-gov">{ticket.ticketNumber}</span>
              <div style="flex:1;">
                <span style="font-size:0.75rem;font-weight:600;color:var(--aitema-amber);text-transform:uppercase;letter-spacing:0.05em;">Bitte zum Schalter</span>
                <p style="font-size:1rem;font-weight:700;color:var(--aitema-navy);">{ticket.counterName}</p>
              </div>
              <svg width="24" height="24" viewBox="0 0 20 20" fill="var(--aitema-amber)" aria-hidden="true"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- All Tickets Timeline -->
    <div class="aitema-card" style="padding:1.5rem;">
      <p style="font-size:0.75rem;font-weight:600;color:var(--aitema-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:1.25rem;">
        Alle Tickets
      </p>
      <div class="timeline">
        {#each queueStatus.tickets as ticket}
          <div class="timeline-item">
            <div class="{timelineDotClass(ticket.status)}"></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <span style="font-size:1rem;font-weight:700;color:var(--aitema-navy);">{ticket.ticketNumber}</span>
                {#if ticket.counterName}
                  <span style="font-size:0.8125rem;color:var(--aitema-muted);margin-left:0.5rem;">&#8594; {ticket.counterName}</span>
                {/if}
              </div>
              <span class="aitema-badge {statusColor(ticket.status)}">{statusLabel(ticket.status)}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

  {:else}
    <!-- Empty State -->
    <div class="aitema-card" style="padding:4rem 2rem;text-align:center;">
      <div style="width:4rem;height:4rem;background:var(--aitema-slate-100);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;">
        <svg width="28" height="28" viewBox="0 0 20 20" fill="var(--aitema-muted)" aria-hidden="true"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>
      </div>
      <h3 style="font-size:1.125rem;font-weight:700;color:var(--aitema-navy);margin-bottom:0.375rem;">Kein Standort ausgewaehlt</h3>
      <p style="color:var(--aitema-muted);font-size:0.9375rem;max-width:28rem;margin:0 auto;">
        Bitte waehlen Sie einen Standort, um den Live-Status der Warteschlange zu sehen.
      </p>
    </div>
  {/if}

</div>
