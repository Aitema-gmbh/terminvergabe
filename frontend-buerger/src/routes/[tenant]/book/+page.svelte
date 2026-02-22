
<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import {
		getAvailableDays,
		getAvailableSlots,
		createBooking,
		type TimeSlot,
		type AvailableDay,
		type BookingResult,
    type Service,
    type Location,
    getServices,
    getLocations
	} from '$lib/api';
  import { pushStore, subscribePush, unsubscribePush, registerServiceWorker } from '$lib/push';
	import Button from '$lib/components/Button.svelte';
	import Calendar from '$lib/components/Calendar.svelte';
	import TimeSlotPicker from '$lib/components/TimeSlotPicker.svelte';

  // Wizard state
	let currentStep = $state(1);
	const totalSteps = 4;

	// Data state
	let services = $state<Service[]>([]);
	let locations = $state<Location[]>([]);
	let availableDays = $state<AvailableDay[]>([]);
	let availableSlots = $state<TimeSlot[]>([]);
	let bookingResult = $state<BookingResult | null>(null);

	// Selection state
	let selectedService = $state<Service | null>(null);
	let selectedLocation = $state<Location | null>(null);
	let selectedDate = $state(new Date());
	let selectedSlot = $state('');

	// Form state
	let citizenName = $state('');
	let citizenEmail = $state('');
	let citizenPhone = $state('');
	let notes = $state('');
  let formErrors = $state({ name: '', email: '' });

	// UI state
	let loading = $state(false);
	let error = $state('');

	const tenant = $page.params.tenant;

	onMount(async () => {
		loading = true;
		try {
			const [servicesRes, locationsRes] = await Promise.all([
				getServices(tenant),
				getLocations(tenant)
			]);
			services = servicesRes.data;
			locations = locationsRes.data;
		} catch (e: any) {
			error = 'Dienste und Standorte konnten nicht geladen werden.';
		} finally {
			loading = false;
		}
	});

  async function selectService(service: Service) {
    selectedService = service;
    currentStep = 2;
  }

	async function selectLocation(location: Location) {
		selectedLocation = location;
		loading = true;
		error = '';
		try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
			const res = await getAvailableDays(tenant, selectedService!.id, selectedLocation!.id, month);
			availableDays = res.data;
			currentStep = 3;
		} catch (e: any) {
			error = 'Verfügbare Tage konnten nicht geladen werden.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		async function loadSlots() {
			if (currentStep !== 3 || !selectedDate || !selectedService || !selectedLocation) return;
			loading = true;
			error = '';
			try {
        const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
				const res = await getAvailableSlots(tenant, selectedService.id, selectedLocation.id, dateString);
				availableSlots = res.data;
        selectedSlot = '';
			} catch (e: any) {
				error = 'Verfügbare Uhrzeiten konnten nicht geladen werden.';
			} finally {
				loading = false;
			}
		}
		loadSlots();
	});

  function validateForm() {
    formErrors = { name: '', email: '' };
    let isValid = true;
    if (citizenName.trim().length < 2) {
      formErrors.name = 'Name ist erforderlich.';
      isValid = false;
    }
    if (citizenEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(citizenEmail)) {
      formErrors.email = 'Geben Sie eine gültige E-Mail-Adresse ein.';
      isValid = false;
    }
    return isValid;
  }

	async function submitBooking() {
		if (!validateForm() || !selectedSlot) return;

		loading = true;
		error = '';
		try {
			const res = await createBooking(tenant, {
				serviceId: selectedService!.id,
				locationId: selectedLocation!.id,
				slotStart: selectedSlot,
				citizenName,
				citizenEmail: citizenEmail || undefined,
				citizenPhone: citizenPhone || undefined,
				notes: notes || undefined
			});
			bookingResult = res.data;
			currentStep = 5; // Confirmation step
		} catch (e: any) {
			error = 'Ihre Buchung konnte nicht erstellt werden. Bitte versuchen Sie es erneut.';
		} finally {
			loading = false;
		}
	}

	function nextStep() {
		if (currentStep < totalSteps) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep--;
      error = '';
		}
	}

  const steps = [
    { num: 1, label: 'Dienstleistung' },
    { num: 2, label: 'Standort' },
    { num: 3, label: 'Datum & Zeit' },
    { num: 4, label: 'Ihre Daten' }
  ];
</script>

<svelte:head>
	<title>Termin buchen - aitema GovTech</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-8 px-4">

	<!-- Progress Bar -->
	<div class="mb-12">
    <div class="flex items-center">
      {#each steps as step, i}
        <div class="flex items-center {i < steps.length - 1 ? 'w-full' : ''}">
          <div class="flex items-center justify-center w-10 h-10 rounded-full transition-all
            {currentStep > step.num ? 'bg-emerald-500 text-white' : ''}
            {currentStep === step.num ? 'bg-accent-primary text-white scale-110' : ''}
            {currentStep < step.num ? 'bg-secondary border-2 border-border-color' : ''}"
          >
            {#if currentStep > step.num}
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
            {:else}
              <span class="font-bold">{step.num}</span>
            {/if}
          </div>
          <p class="ml-4 font-semibold hidden md:block {currentStep === step.num ? 'text-accent-primary' : 'text-secondary'}">{step.label}</p>
        </div>
        {#if i < steps.length - 1}
          <div class="flex-auto border-t-2 transition-all duration-500 {currentStep > step.num ? 'border-emerald-500' : 'border-border-color'}"></div>
        {/if}
      {/each}
    </div>
  </div>

	{#if error}
		<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-8" role="alert">
			<p class="font-bold">Fehler</p>
			<p>{error}</p>
		</div>
	{/if}

	<div class="bg-secondary p-6 sm:p-8 rounded-card shadow-lg border border-transparent
    {currentStep === 1 || currentStep === 2 ? 'bg-gradient-to-br from-accent-primary/5 to-transparent' : ''}">

		{#if loading}
			<div class="flex flex-col items-center justify-center min-h-[300px]">
				<div class="w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
				<p class="mt-4 text-secondary">Lade Daten...</p>
			</div>
    {:else if currentStep === 1}
      <!-- Step 1: Select Service -->
      <section class="fade-in-up">
        <h2 class="text-2xl font-bold mb-6">Wählen Sie eine Dienstleistung</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each services as service}
            <button onclick={() => selectService(service)} class="text-left p-4 bg-primary rounded-btn border border-border-color hover:border-accent-primary hover:shadow-glow transition-all duration-300">
              <h3 class="font-bold text-lg">{service.name}</h3>
              <p class="text-sm text-secondary mt-1">{service.duration} Minuten</p>
            </button>
          {/each}
        </div>
      </section>

    {:else if currentStep === 2}
      <!-- Step 2: Select Location -->
      <section class="fade-in-up">
        <h2 class="text-2xl font-bold mb-2">Standort für "{selectedService?.name}"</h2>
        <p class="text-secondary mb-6">Wählen Sie den gewünschten Standort aus.</p>
        <div class="grid md:grid-cols-2 gap-4">
          {#each locations as location}
            <button onclick={() => selectLocation(location)} class="text-left p-4 bg-primary rounded-btn border border-border-color hover:border-accent-primary hover:shadow-glow transition-all duration-300">
              <h3 class="font-bold text-lg">{location.name}</h3>
              <p class="text-sm text-secondary mt-1">{location.address}</p>
            </button>
          {/each}
        </div>
        <div class="mt-8">
          <Button variant="secondary" onclick={prevStep}>Zurück zur Dienstleistung</Button>
        </div>
      </section>

		{:else if currentStep === 3}
			<!-- Step 3: Date & Time -->
			<section class="fade-in-up">
				<h2 class="text-2xl font-bold mb-6">Datum und Uhrzeit wählen</h2>
				<div class="grid md:grid-cols-2 gap-8">
					<div>
						<h3 class="font-bold mb-4">Datum</h3>
						<Calendar bind:selectedDate={selectedDate} />
					</div>
					<div>
						<h3 class="font-bold mb-4">Verfügbare Uhrzeiten</h3>
						<TimeSlotPicker timeSlots={availableSlots.map(s => s.startTime)} bind:selectedSlot={selectedSlot} />
					</div>
				</div>
				<div class="flex justify-between mt-8">
					<Button variant="secondary" onclick={prevStep}>Zurück</Button>
					<Button onclick={nextStep} disabled={!selectedSlot}>Weiter</Button>
				</div>
			</section>

		{:else if currentStep === 4}
			<!-- Step 4: User Details -->
			<section class="fade-in-up">
				<h2 class="text-2xl font-bold mb-6">Ihre persönlichen Daten</h2>
				<form onsubmit={submitBooking} class="flex flex-col gap-4">
					<div>
						<label for="name" class="block text-sm font-medium text-secondary mb-1">Vollständiger Name <span class="text-red-500">*</span></label>
						<input type="text" id="name" bind:value={citizenName} class="w-full bg-primary border rounded-btn p-2 {formErrors.name ? 'border-red-500' : 'border-border-color'}" required />
            {#if formErrors.name}<p class="text-red-500 text-sm mt-1">{formErrors.name}</p>{/if}
					</div>
					<div>
						<label for="email" class="block text-sm font-medium text-secondary mb-1">E-Mail-Adresse</label>
						<input type="email" id="email" bind:value={citizenEmail} class="w-full bg-primary border rounded-btn p-2 {formErrors.email ? 'border-red-500' : 'border-border-color'}" />
            {#if formErrors.email}<p class="text-red-500 text-sm mt-1">{formErrors.email}</p>{/if}
					</div>
					<div>
						<label for="phone" class="block text-sm font-medium text-secondary mb-1">Telefonnummer (optional)</label>
						<input type="tel" id="phone" bind:value={citizenPhone} class="w-full bg-primary border border-border-color rounded-btn p-2" />
					</div>
					<div>
						<label for="notes" class="block text-sm font-medium text-secondary mb-1">Anmerkungen (optional)</label>
						<textarea id="notes" bind:value={notes} rows="3" class="w-full bg-primary border border-border-color rounded-btn p-2"></textarea>
					</div>
					<div class="flex justify-between mt-4">
						<Button type="button" variant="secondary" onclick={prevStep}>Zurück</Button>
						<Button type="submit">Termin buchen</Button>
					</div>
				</form>
			</section>
    {:else if currentStep === 5 && bookingResult}
      <!-- Confirmation Step -->
      <section class="fade-in-up text-center">
        <div class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 class="text-2xl font-bold mt-6 mb-2">Termin erfolgreich gebucht!</h2>
        <p class="text-secondary mb-6">Ihr Buchungscode lautet:</p>
        <div class="text-3xl font-bold tracking-widest bg-primary inline-block px-4 py-2 rounded-lg border border-border-color mb-8">
          {bookingResult.bookingCode}
        </div>

        <div class="text-left bg-primary p-4 rounded-lg border border-border-color">
          <h3 class="font-bold mb-4">Ihre Termindetails:</h3>
          <dl>
            <div class="flex justify-between py-2 border-b border-border-color"><dt class="text-secondary">Dienstleistung</dt><dd class="font-semibold">{bookingResult.service.name}</dd></div>
            <div class="flex justify-between py-2 border-b border-border-color"><dt class="text-secondary">Standort</dt><dd class="font-semibold">{bookingResult.location.name}</dd></div>
            <div class="flex justify-between py-2 border-b border-border-color"><dt class="text-secondary">Datum</dt><dd class="font-semibold">{new Date(bookingResult.scheduledStart).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</dd></div>
            <div class="flex justify-between py-2"><dt class="text-secondary">Uhrzeit</dt><dd class="font-semibold">{new Date(bookingResult.scheduledStart).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</dd></div>
          </dl>
        </div>

        <div class="mt-8">
          <Button onclick={() => window.location.href = `/${tenant}/status?code=${bookingResult.bookingCode}` }>
            Status verfolgen
          </Button>
        </div>
      </section>
		{/if}
	</div>
</div>
