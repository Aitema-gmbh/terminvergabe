
<script lang="ts">
	import type { Snippet } from 'svelte';

	type $$Props = {
		class?: string;
		value?: string | number | boolean;
		children: Snippet;
		[x: string]: any;
	};
	let {
		class: className = '',
		value = $bindable(),
		children,
		...rest
	} = $props();
</script>

<div class="relative">
	<select
		class="w-full appearance-none bg-secondary border border-border-color rounded-btn px-4 py-2 pr-8 text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary {className}"
		bind:value
		{...rest}
	>
		{@render children()}
	</select>
	<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-primary">
		<svg
			class="h-4 w-4"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
		>
			<path
				fill-rule="evenodd"
				d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
				clip-rule="evenodd"
			/>
		</svg>
	</div>
</div>
