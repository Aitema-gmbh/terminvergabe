<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  interface QueueTicket {
    id: string;
    ticketNumber: string;
    status: string;
    serviceName: string;
    counterName?: string;
    citizenName?: string;
    estimatedWaitMinutes?: number;
    issuedAt: string;
    calledAt?: string;
  }

  interface Props {
    tenantSlug: string;
    locationId: string;
    resourceId: string;
    counterName: string;
  }

  let { tenantSlug, locationId, resourceId, counterName }: Props = $props();

  let tickets = $state<QueueTicket[]>([]);
  let ws: WebSocket | null = null;
  let connected = $state(false);

  const API_URL = "http://localhost:3000";
  const WS_URL = "ws://localhost:3000";

  onMount(() => {
    connect();
  });

  onDestroy(() => {
    ws?.close();
  });

  function connect() {
    ws = new WebSocket(`${WS_URL}/api/v1/${tenantSlug}/queue/ws?locationId=${locationId}&type=queue`);

    ws.onopen = () => { connected = true; };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "QUEUE_UPDATE") {
          tickets = msg.data.tickets;
        }
      } catch {}
    };

    ws.onclose = () => {
      connected = false;
      setTimeout(connect, 3000);
    };
  }

  async function callNext() {
    await fetch(`${API_URL}/api/v1/${tenantSlug}/queue/call-next`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, resourceId, counterName }),
    });
  }

  async function startServing(ticketId: string) {
    await fetch(`${API_URL}/api/v1/${tenantSlug}/queue/start-serving`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId }),
    });
  }

  async function complete(ticketId: string) {
    await fetch(`${API_URL}/api/v1/${tenantSlug}/queue/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId }),
    });
  }

  let waitingTickets = $derived(tickets.filter(t => t.status === "WAITING"));
  let calledTickets = $derived(tickets.filter(t => t.status === "CALLED"));
  let servingTickets = $derived(tickets.filter(t => t.status === "IN_SERVICE"));
</script>

<div class="queue-board">
  <div class="board-header">
    <h2>Warteschlange - {counterName}</h2>
    <div class="status-indicator" class:connected>{connected ? "Live" : "Offline"}</div>
  </div>

  <div class="board-actions">
    <button class="call-btn" onclick={callNext}>
      Naechste Nummer aufrufen
    </button>
  </div>

  <div class="board-columns">
    <div class="column">
      <h3>Aktuell bedient ({servingTickets.length})</h3>
      {#each servingTickets as ticket}
        <div class="ticket serving">
          <span class="number">{ticket.ticketNumber}</span>
          <span class="service">{ticket.serviceName}</span>
          <button class="action-btn" onclick={() => complete(ticket.id)}>Fertig</button>
        </div>
      {/each}
    </div>

    <div class="column">
      <h3>Aufgerufen ({calledTickets.length})</h3>
      {#each calledTickets as ticket}
        <div class="ticket called">
          <span class="number">{ticket.ticketNumber}</span>
          <span class="service">{ticket.serviceName}</span>
          <button class="action-btn" onclick={() => startServing(ticket.id)}>Bedienen</button>
        </div>
      {/each}
    </div>

    <div class="column">
      <h3>Wartend ({waitingTickets.length})</h3>
      {#each waitingTickets as ticket}
        <div class="ticket waiting">
          <span class="number">{ticket.ticketNumber}</span>
          <span class="service">{ticket.serviceName}</span>
          {#if ticket.estimatedWaitMinutes}
            <span class="wait">~{ticket.estimatedWaitMinutes} Min.</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .queue-board { padding: 1rem; }

  .board-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .board-header h2 { margin: 0; color: #003366; }

  .status-indicator {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    background: #fee;
    color: #c00;
  }

  .status-indicator.connected { background: #e8f5e9; color: #2e7d32; }

  .call-btn {
    width: 100%;
    padding: 1rem;
    background: #003366;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.25rem;
    font-weight: 700;
    cursor: pointer;
    margin-bottom: 1.5rem;
  }

  .call-btn:hover { background: #004d99; }

  .board-columns {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .column h3 {
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #666;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e0e0e0;
  }

  .ticket {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    margin: 0.5rem 0;
    border-radius: 8px;
    background: white;
    border: 2px solid #e0e0e0;
  }

  .ticket.serving { border-color: #4caf50; background: #e8f5e9; }
  .ticket.called { border-color: #ff9900; background: #fff8e1; }

  .number { font-size: 1.25rem; font-weight: 700; color: #003366; }
  .service { font-size: 0.875rem; color: #666; }
  .wait { font-size: 0.75rem; color: #999; }

  .action-btn {
    margin-left: auto;
    padding: 0.25rem 0.75rem;
    background: #003366;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
  }

  .action-btn:hover { background: #004d99; }
</style>
