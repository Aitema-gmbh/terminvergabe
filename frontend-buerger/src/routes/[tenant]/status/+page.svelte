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
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };
  }

  onDestroy(() => {
    ws?.close();
  });
</script>

<svelte:head>
  <title>{t("queue.title")} - aitema|Termin</title>
</svelte:head>

<main class="status-page">
  <h1>{t("queue.title")}</h1>

  <div class="connection-indicator" class:connected>
    {connected ? "Live-Verbindung aktiv" : "Verbinde..."}
  </div>

  {#if queueStatus}
    <div class="summary">
      <div class="stat">
        <span class="stat-number">{queueStatus.summary.waiting}</span>
        <span class="stat-label">{t("queue.waiting")}</span>
      </div>
      <div class="stat">
        <span class="stat-number">{queueStatus.summary.called}</span>
        <span class="stat-label">{t("queue.called")}</span>
      </div>
      <div class="stat">
        <span class="stat-number">{queueStatus.summary.completed}</span>
        <span class="stat-label">Bedient</span>
      </div>
    </div>

    <div class="ticket-list" role="list" aria-label="Aktuelle Aufrufe">
      {#each queueStatus.tickets.filter(t => t.status === "CALLED") as ticket}
        <div class="ticket-card called" role="listitem">
          <span class="ticket-number">{ticket.ticketNumber}</span>
          <span class="arrow">&#8594;</span>
          <span class="counter">{ticket.counterName}</span>
        </div>
      {/each}
    </div>
  {:else}
    <p class="placeholder">Bitte waehlen Sie einen Standort, um den Live-Status zu sehen.</p>
  {/if}
</main>

<style>
  .status-page {
    max-width: 600px;
    margin: 0 auto;
    padding: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  h1 { color: #003366; }

  .connection-indicator {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    background: #fee;
    color: #c00;
  }

  .connection-indicator.connected {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin: 2rem 0;
  }

  .stat {
    text-align: center;
    padding: 1.5rem;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
  }

  .stat-number {
    display: block;
    font-size: 2.5rem;
    font-weight: 700;
    color: #003366;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #666;
  }

  .ticket-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    margin: 0.5rem 0;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    animation: slideIn 0.3s ease-out;
  }

  .ticket-card.called {
    border-color: #ff9900;
    background: #fff8e1;
  }

  .ticket-number {
    font-size: 1.5rem;
    font-weight: 700;
    color: #003366;
    min-width: 80px;
  }

  .arrow {
    font-size: 1.5rem;
    color: #ff9900;
  }

  .counter {
    font-size: 1.125rem;
    font-weight: 600;
  }

  .placeholder {
    text-align: center;
    padding: 3rem;
    color: #999;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }
</style>
