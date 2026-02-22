<script lang="ts">
	import CalendarIcon from '$lib/icons/CalendarIcon.svelte';
	import CheckCircleIcon from '$lib/icons/CheckCircleIcon.svelte';
	import ClockIcon from '$lib/icons/ClockIcon.svelte';
	import OpenSourceIcon from '$lib/icons/OpenSourceIcon.svelte';
	import { onMount } from 'svelte';

	let currentStep = $state(0);
	const steps = [
		{
			icon: CalendarIcon,
			title: 'Termin in 2 Minuten buchen',
			description: 'Wählen Sie online Ihren Wunschtermin und Dienstleistung aus.'
		},
		{
			icon: CheckCircleIcon,
			title: 'Sofort-Bestätigung erhalten',
			description: 'Sie erhalten eine sofortige Bestätigung per E-Mail mit allen Details.'
		},
		{
			icon: ClockIcon,
			title: 'Pünktlich erscheinen, kein Warten',
			description: 'Kommen Sie zum gebuchten Termin und vermeiden Sie lange Wartezeiten.'
		},
		{
			icon: OpenSourceIcon,
			title: 'Kommunen helfen Kommunen',
			description: 'Unsere Lösung ist Open Source und wird von einer Community getragen.'
		}
	];

	let interval: ReturnType<typeof setInterval>;

	onMount(() => {
		interval = setInterval(() => {
			currentStep = (currentStep + 1) % steps.length;
		}, 3000);

		return () => clearInterval(interval);
	});

	function handleStepClick(index: number) {
		currentStep = index;
		clearInterval(interval);
	}
</script>

<section class="bg-gray-50 dark:bg-gray-800">
    <div class="container mx-auto px-6 py-16">
        <div class="text-center">
            <h2 class="text-3xl font-bold text-gray-800 dark:text-white">So einfach geht's</h2>
        </div>

        <div class="relative mt-12">
            <div class="relative mx-auto flex h-48 w-full max-w-4xl items-center justify-center overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-700">
                {#each steps as step, i}
                    <div class="absolute w-full text-center transition-opacity duration-500 ease-in-out" class:opacity-100={i === currentStep} class:opacity-0={i !== currentStep}>
                        <div class="flex flex-col items-center">
                            <div class="rounded-full bg-blue-100 p-4 text-blue-500">
                                {@render step.icon({ class: "h-8 w-8" })}
                            </div>
                            <h3 class="mt-4 text-xl font-semibold text-gray-800 dark:text-white">{step.title}</h3>
                            <p class="mt-2 text-gray-600 dark:text-gray-300">{step.description}</p>
                        </div>
                    </div>
                {/each}
            </div>

            <div class="mt-8 flex justify-center space-x-2">
                {#each steps as _, i}
                    <button
                        onclick={() => handleStepClick(i)}
                        class="h-2 w-2 rounded-full transition-colors duration-300"
                        class:bg-blue-500={i === currentStep}
                        class:bg-gray-300={i !== currentStep}
                        aria-label="Schritt {i + 1}"
                    ></button>
                {/each}
            </div>
        </div>
    </div>
</section>
