<script lang="ts">
  interface TimeSlot {
    startTime: string;
    endTime: string;
  }

  interface Props {
    slots: TimeSlot[];
    onSelect: (slot: TimeSlot) => void;
  }

  let { slots, onSelect }: Props = $props();

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Group slots by morning / afternoon
  function groupSlots() {
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];

    for (const slot of slots) {
      const hour = new Date(slot.startTime).getHours();
      if (hour < 12) {
        morning.push(slot);
      } else {
        afternoon.push(slot);
      }
    }

    return { morning, afternoon };
  }

  let grouped = $derived(groupSlots());
</script>

<div class="timeslot-picker" role="radiogroup" aria-label="Verfuegbare Uhrzeiten">
  {#if grouped.morning.length > 0}
    <h3 class="period-label">Vormittag</h3>
    <div class="slot-grid">
      {#each grouped.morning as slot}
        <button
          class="slot-btn"
          onclick={() => onSelect(slot)}
          aria-label="{formatTime(slot.startTime)} bis {formatTime(slot.endTime)}"
        >
          {formatTime(slot.startTime)}
        </button>
      {/each}
    </div>
  {/if}

  {#if grouped.afternoon.length > 0}
    <h3 class="period-label">Nachmittag</h3>
    <div class="slot-grid">
      {#each grouped.afternoon as slot}
        <button
          class="slot-btn"
          onclick={() => onSelect(slot)}
          aria-label="{formatTime(slot.startTime)} bis {formatTime(slot.endTime)}"
        >
          {formatTime(slot.startTime)}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .timeslot-picker {
    margin: 1rem 0;
  }

  .period-label {
    font-size: 0.875rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 1rem 0 0.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid #eee;
  }

  .slot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 0.5rem;
  }

  .slot-btn {
    padding: 0.75rem;
    background: white;
    border: 2px solid #003366;
    border-radius: 8px;
    color: #003366;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    min-height: 44px;
  }

  .slot-btn:hover {
    background: #003366;
    color: white;
  }

  .slot-btn:focus-visible {
    outline: 3px solid #ff9900;
    outline-offset: 2px;
  }
</style>
