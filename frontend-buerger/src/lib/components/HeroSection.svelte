<script lang="ts">
	import OpenSourceIcon from '$lib/icons/OpenSourceIcon.svelte';
    import CheckCircleIcon from '$lib/icons/CheckCircleIcon.svelte';
</script>

<section class="bg-white dark:bg-gray-900">
    <div class="container mx-auto px-6 py-16 text-center">
        <div class="mx-auto max-w-lg">
            <h1 class="text-3xl font-bold text-gray-800 dark:text-white md:text-4xl">Termin buchen. Online. Sofort.</h1>
            <p class="mt-6 text-gray-500 dark:text-gray-300">Das offene Terminmanagement für moderne Bürgerämter</p>
            <div class="mt-8 flex justify-center">
                <img class="w-full h-auto" src="/hero-animation.svg" alt="Hero Animation" />
            </div>
            <div class="mt-8 flex flex-wrap justify-center gap-4">
                <div class="flex items-center rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                    <OpenSourceIcon class="mr-2 h-5 w-5" />
                    100% Open Source
                </div>
                <div class="flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                    <CheckCircleIcon class="mr-2 h-5 w-5" />
                    DSGVO-konform
                </div>
                <div class="flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                    Barrierefrei
                </div>
            </div>
        </div>
    </div>
</section>

<style>
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    h1, p {
        animation: fadeInUp 0.5s ease-out forwards;
    }

    img {
        animation: float 3s ease-in-out infinite;
    }
</style>
