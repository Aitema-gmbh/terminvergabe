
<script lang="ts">
	import type { Snippet } from 'svelte';

	type ButtonVariant = 'primary' | 'secondary' | 'ghost';
	type $$Props = {
		variant?: ButtonVariant;
		class?: string;
		disabled?: boolean;
		children: Snippet;
		[x: string]: any;
	};

	let {
		variant = 'primary' as ButtonVariant,
		class: className = '',
		children,
		...rest
	} = $props();

	const baseClasses = 'inline-flex items-center justify-center rounded-btn px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed';

	const variants = {
		primary: 'bg-accent text-white hover:bg-accent/90',
		secondary: 'bg-secondary text-primary border border-border-color hover:bg-interactive-bg-hover',
		ghost: 'hover:bg-interactive-bg-hover'
	};
</script>

<button
	class="{baseClasses} {variants[variant]} {className}"
	disabled={rest.disabled}
	{...rest}
>
	{@render children()}
</button>
