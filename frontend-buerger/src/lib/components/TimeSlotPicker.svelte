
<script lang="ts">
	type $$Props = {
		timeSlots: string[];
		selectedSlot?: string;
	};
	let {
		timeSlots,
		selectedSlot = $bindable()
	} = $props();
</script>

<div class="grid grid-cols-3 md:grid-cols-4 gap-2">
	{#each timeSlots as slot}
		<button
			onclick={() => selectedSlot = slot}
			class="p-2 rounded-btn border text-sm transition-all
        {selectedSlot === slot
				? 'bg-accent-primary text-white border-accent-primary'
				: 'bg-secondary border-border-color hover:bg-interactive-bg-hover hover:border-accent-primary'}"
		>
			{slot}
		</button>
	{:else}
		<p class="text-secondary col-span-full">Für diesen Tag sind keine Termine verfügbar.</p>
	{/each}
</div>
