<script lang="ts">
  import { addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from "date-fns";
  import { de } from "date-fns/locale";

  interface AvailableDay {
    date: string;
    availableSlots: number;
  }

  interface Props {
    availableDays: AvailableDay[];
    onSelect: (date: string) => void;
  }

  let { availableDays, onSelect }: Props = $props();

  let currentMonth = $state(new Date());

  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  function getDays() {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Pad start to align with Monday
    const startDay = getDay(start);
    const padding = startDay === 0 ? 6 : startDay - 1;

    return { days, padding };
  }

  function isAvailable(date: Date): boolean {
    const dateStr = format(date, "yyyy-MM-dd");
    return availableDays.some((d) => d.date === dateStr);
  }

  function getSlotsCount(date: Date): number {
    const dateStr = format(date, "yyyy-MM-dd");
    return availableDays.find((d) => d.date === dateStr)?.availableSlots ?? 0;
  }

  function selectDate(date: Date) {
    if (isAvailable(date)) {
      onSelect(format(date, "yyyy-MM-dd"));
    }
  }

  function prevMonth() {
    currentMonth = addMonths(currentMonth, -1);
  }

  function nextMonth() {
    currentMonth = addMonths(currentMonth, 1);
  }

  let calendarData = $derived(getDays());
</script>

<div class="calendar" role="grid" aria-label="Kalender">
  <div class="calendar-header">
    <button class="nav-btn" onclick={prevMonth} aria-label="Vorheriger Monat">&laquo;</button>
    <h3>{format(currentMonth, "MMMM yyyy", { locale: de })}</h3>
    <button class="nav-btn" onclick={nextMonth} aria-label="Naechster Monat">&raquo;</button>
  </div>

  <div class="weekdays" role="row">
    {#each weekDays as day}
      <div class="weekday" role="columnheader">{day}</div>
    {/each}
  </div>

  <div class="days">
    {#each Array(calendarData.padding) as _}
      <div class="day empty"></div>
    {/each}
    {#each calendarData.days as date}
      {@const available = isAvailable(date)}
      {@const slots = getSlotsCount(date)}
      <button
        class="day"
        class:available
        class:today={isSameDay(date, new Date())}
        onclick={() => selectDate(date)}
        disabled={!available}
        aria-label="{format(date, 'd. MMMM', { locale: de })}{available ? `, ${slots} Termine verfuegbar` : ', nicht verfuegbar'}"
        role="gridcell"
      >
        <span class="day-number">{format(date, "d")}</span>
        {#if available}
          <span class="slots-badge">{slots}</span>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .calendar {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 1rem;
    max-width: 450px;
    margin: 0 auto;
  }

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .calendar-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: #003366;
    text-transform: capitalize;
  }

  .nav-btn {
    background: none;
    border: 2px solid #003366;
    border-radius: 6px;
    color: #003366;
    width: 36px;
    height: 36px;
    cursor: pointer;
    font-size: 1.125rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-btn:hover { background: #f0f4f8; }
  .nav-btn:focus-visible { outline: 3px solid #ff9900; outline-offset: 2px; }

  .weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    margin-bottom: 4px;
  }

  .weekday {
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: #666;
    padding: 0.25rem;
  }

  .days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .day {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px solid transparent;
    border-radius: 8px;
    background: none;
    cursor: default;
    font-size: 0.875rem;
    padding: 2px;
    min-height: 44px;
  }

  .day.empty { visibility: hidden; }

  .day.available {
    background: #e8f5e9;
    border-color: #4caf50;
    cursor: pointer;
  }

  .day.available:hover {
    background: #c8e6c9;
    transform: scale(1.05);
  }

  .day.available:focus-visible {
    outline: 3px solid #ff9900;
    outline-offset: 2px;
  }

  .day.today {
    font-weight: 700;
  }

  .day:disabled:not(.empty) {
    color: #ccc;
  }

  .day-number { line-height: 1; }

  .slots-badge {
    font-size: 0.625rem;
    background: #4caf50;
    color: white;
    border-radius: 10px;
    padding: 1px 5px;
    margin-top: 1px;
  }
</style>
