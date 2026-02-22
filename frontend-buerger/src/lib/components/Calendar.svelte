
<script lang="ts">
	import {
		eachDayOfInterval,
		endOfMonth,
		endOfWeek,
		format,
		isSameDay,
		isSameMonth,
		isToday,
		startOfWeek
	} from 'date-fns';
	import { de } from 'date-fns/locale';
	import Button from '$components/Button.svelte';

	type $$Props = {
		selectedDate?: Date;
		month?: number;
		year?: number;
	};

	let {
		selectedDate = $bindable(new Date()),
		month = $bindable(new Date().getMonth()),
		year = $bindable(new Date().getFullYear())
	} = $props();

	const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

	let days = $derived.by(() => {
		const firstDayOfMonth = new Date(year, month, 1);
		const lastDayOfMonth = endOfMonth(firstDayOfMonth);
		return eachDayOfInterval({
			start: startOfWeek(firstDayOfMonth, { weekStartsOn: 1 }),
			end: endOfWeek(lastDayOfMonth, { weekStartsOn: 1 })
		});
	});

	function prevMonth() {
		if (month === 0) {
			month = 11;
			year--;
		} else {
			month--;
		}
	}

	function nextMonth() {
		if (month === 11) {
			month = 0;
			year++;
		} else {
			month++;
		}
	}

	function isSelected(day: Date) {
		return selectedDate && isSameDay(day, selectedDate);
	}
</script>

<div class="bg-secondary p-4 rounded-card border shadow-md">
	<div class="flex items-center justify-between mb-4">
		<Button variant="ghost" class="p-2" onclick={prevMonth} aria-label="Vorheriger Monat">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
		</Button>
		<div class="font-bold text-lg text-primary capitalize">
			{format(new Date(year, month), 'MMMM yyyy', { locale: de })}
		</div>
		<Button variant="ghost" class="p-2" onclick={nextMonth} aria-label="Nächster Monat">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
		</Button>
	</div>

	<div class="grid grid-cols-7 gap-1 text-center text-sm text-secondary">
		{#each weekdays as weekday}
			<div class="font-semibold">{weekday}</div>
		{/each}
	</div>

	<div class="grid grid-cols-7 gap-1 mt-2">
		{#each days as day}
			{@const isCurrentMonth = isSameMonth(day, new Date(year, month))}
			<button
				onclick={() => selectedDate = day}
				class="relative flex items-center justify-center h-10 w-10 rounded-full transition-colors
          {isCurrentMonth ? 'text-primary' : 'text-secondary'}
          {isToday(day) && !isSelected(day) ? 'border border-accent-primary' : ''}
          {isSelected(day) ? 'bg-accent-primary text-white' : 'hover:bg-interactive-bg-hover'}
        "
				aria-label={format(day, 'd. MMMM yyyy')}
			>
				{format(day, 'd')}
			</button>
		{/each}
	</div>
</div>
