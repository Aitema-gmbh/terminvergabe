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
			error = 'Verfuegbare Tage konnten nicht geladen werden.';
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
				error = 'Verfuegbare Uhrzeiten konnten nicht geladen werden.';
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
      formErrors.email = 'Geben Sie eine gueltige E-Mail-Adresse ein.';
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

  const serviceIcons = ['📋', '🪪', '🚗', '🏠', '📜', '🏛️', '👶', '💍'];
  const serviceColors = ['#dbeafe', '#d1fae5', '#fef3c7', '#fce7f3', '#ede9fe', '#fee2e2', '#ccfbf1', '#fef9c3'];
</script>

<svelte:head>
	<title>Termin buchen - aitema GovTech</title>
</svelte:head>

<div style="max-width:56rem;margin:0 auto;padding:2rem 1.25rem;">

	<!-- Step Progress Indicator -->
	<div style="margin-bottom:3rem;">
		<div class="step-indicator">
			{#each steps as step, i}
				<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
					<div class="step-dot {currentStep > step.num ? 'done' : currentStep === step.num ? 'active' : 'pending'}">
						{#if currentStep > step.num}
							<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
							</svg>
						{:else}
							<span>{step.num}</span>
						{/if}
					</div>
				</div>
				{#if i < steps.length - 1}
					<div class="step-line {currentStep > step.num ? 'done' : ''}"></div>
				{/if}
			{/each}
		</div>
		<!-- Step label row -->
		<div style="display:grid;grid-template-columns:repeat(4,1fr);margin-top:0.625rem;">
			{#each steps as step}
				<div style="text-align:center;">
					<span style="font-size:0.6875rem;font-weight:500;color:{currentStep === step.num ? 'var(--aitema-accent)' : currentStep > step.num ? 'var(--aitema-emerald)' : 'var(--aitema-muted)'};">
						{step.label}
					</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Error Alert -->
	{#if error}
		<div class="aitema-alert aitema-alert-error" style="margin-bottom:1.5rem;" role="alert">
			<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style="flex-shrink:0;margin-top:1px;" aria-hidden="true">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
			</svg>
			<div>
				<p style="font-weight:600;margin-bottom:0.125rem;">Fehler</p>
				<p>{error}</p>
			</div>
		</div>
	{/if}

	<!-- Main Card -->
	<div class="aitema-card" style="padding:1.75rem 2rem;">

		{#if loading}
			<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:18rem;gap:1rem;">
				<div class="aitema-spinner"></div>
				<p style="color:var(--aitema-muted);font-size:0.875rem;">Lade Daten...</p>
			</div>

		{:else if currentStep === 1}
			<!-- Step 1: Service Selection -->
			<section class="animate-fade-in-up">
				<div style="margin-bottom:1.75rem;">
					<h2 style="font-size:1.5rem;font-weight:700;color:var(--aitema-navy);margin-bottom:0.375rem;">Dienstleistung waehlen</h2>
					<p style="color:var(--aitema-muted);font-size:0.9375rem;">Welche Dienstleistung moechten Sie in Anspruch nehmen?</p>
				</div>
				<div class="aitema-grid-2" style="gap:0.875rem;">
					{#each services as service, i}
						<button class="service-card" onclick={() => selectService(service)} aria-label="Dienstleistung {service.name} auswaehlen">
							<div class="service-icon-wrap" style="background:{serviceColors[i % serviceColors.length]};">
								<span style="font-size:1.375rem;" aria-hidden="true">{serviceIcons[i % serviceIcons.length]}</span>
							</div>
							<h3 style="font-weight:600;font-size:1rem;color:var(--aitema-navy);margin-bottom:0.25rem;">{service.name}</h3>
							{#if service.description}
								<p style="font-size:0.8125rem;color:var(--aitema-muted);margin-bottom:0.625rem;">{service.description}</p>
							{/if}
							<span class="aitema-badge aitema-badge-blue">
								<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" style="margin-right:0.25rem;" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
								{service.duration} Min.
							</span>
						</button>
					{/each}
				</div>
			</section>

		{:else if currentStep === 2}
			<!-- Step 2: Location Selection -->
			<section class="animate-fade-in-up">
				<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.75rem;">
					<div style="flex-shrink:0;width:2.5rem;height:2.5rem;background:var(--aitema-slate-100);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;">
						<svg width="18" height="18" viewBox="0 0 20 20" fill="var(--aitema-accent)" aria-hidden="true"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
					</div>
					<div>
						<h2 style="font-size:1.5rem;font-weight:700;color:var(--aitema-navy);margin-bottom:0.125rem;">Standort waehlen</h2>
						<p style="color:var(--aitema-muted);font-size:0.875rem;">Fuer: <strong style="color:var(--aitema-accent);">{selectedService?.name}</strong></p>
					</div>
				</div>
				<div class="aitema-grid-2" style="gap:0.875rem;">
					{#each locations as location}
						<button class="service-card" onclick={() => selectLocation(location)} aria-label="Standort {location.name} auswaehlen">
							<div class="service-icon-wrap" style="background:#dbeafe;">
								<svg width="22" height="22" viewBox="0 0 20 20" fill="#1d4ed8" aria-hidden="true"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd"/></svg>
							</div>
							<h3 style="font-weight:600;font-size:1rem;color:var(--aitema-navy);margin-bottom:0.25rem;">{location.name}</h3>
							{#if location.address}
								<p style="font-size:0.8125rem;color:var(--aitema-muted);">{location.address}</p>
							{/if}
						</button>
					{/each}
				</div>
				<div style="margin-top:1.75rem;padding-top:1.25rem;border-top:1px solid var(--aitema-slate-200);">
					<button class="aitema-btn aitema-btn-secondary" onclick={prevStep}>
						<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
						Zurueck
					</button>
				</div>
			</section>

		{:else if currentStep === 3}
			<!-- Step 3: Date & Time -->
			<section class="animate-fade-in-up">
				<div style="margin-bottom:1.75rem;">
					<h2 style="font-size:1.5rem;font-weight:700;color:var(--aitema-navy);margin-bottom:0.375rem;">Datum und Uhrzeit waehlen</h2>
					<p style="color:var(--aitema-muted);font-size:0.875rem;">Waehlen Sie Ihren gewuenschten Termin.</p>
				</div>
				<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;">
					<div>
						<h3 style="font-size:0.875rem;font-weight:600;color:var(--aitema-text);margin-bottom:0.875rem;display:flex;align-items:center;gap:0.5rem;">
							<svg width="16" height="16" viewBox="0 0 20 20" fill="var(--aitema-accent)" aria-hidden="true"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
							Datum
						</h3>
						<Calendar bind:selectedDate={selectedDate} />
					</div>
					<div>
						<h3 style="font-size:0.875rem;font-weight:600;color:var(--aitema-text);margin-bottom:0.875rem;display:flex;align-items:center;gap:0.5rem;">
							<svg width="16" height="16" viewBox="0 0 20 20" fill="var(--aitema-accent)" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
							Verfuegbare Zeiten
						</h3>
						<TimeSlotPicker timeSlots={availableSlots.map(s => s.startTime)} bind:selectedSlot={selectedSlot} />
					</div>
				</div>
				<div style="display:flex;justify-content:space-between;margin-top:1.75rem;padding-top:1.25rem;border-top:1px solid var(--aitema-slate-200);">
					<button class="aitema-btn aitema-btn-secondary" onclick={prevStep}>
						<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
						Zurueck
					</button>
					<button class="aitema-btn aitema-btn-primary" onclick={nextStep} disabled={!selectedSlot}>
						Weiter
						<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
					</button>
				</div>
			</section>

		{:else if currentStep === 4}
			<!-- Step 4: Contact Details -->
			<section class="animate-fade-in-up">
				<div style="margin-bottom:1.75rem;">
					<h2 style="font-size:1.5rem;font-weight:700;color:var(--aitema-navy);margin-bottom:0.375rem;">Ihre persoenlichen Daten</h2>
					<p style="color:var(--aitema-muted);font-size:0.875rem;">Wir benoetigen diese Angaben zur Terminbestaetigung.</p>
				</div>
				<form onsubmit={submitBooking} style="display:flex;flex-direction:column;gap:1.25rem;">
					<div class="aitema-field">
						<label for="name" class="aitema-label">
							Vollstaendiger Name <span style="color:var(--aitema-red);">*</span>
						</label>
						<input type="text" id="name" bind:value={citizenName}
							class="aitema-input {formErrors.name ? 'error' : ''}"
							placeholder="Max Mustermann"
							autocomplete="name"
							required />
						{#if formErrors.name}
							<p class="aitema-error-msg">{formErrors.name}</p>
						{/if}
					</div>
					<div class="aitema-field">
						<label for="email" class="aitema-label">E-Mail-Adresse</label>
						<input type="email" id="email" bind:value={citizenEmail}
							class="aitema-input {formErrors.email ? 'error' : ''}"
							placeholder="max@beispiel.de"
							autocomplete="email" />
						{#if formErrors.email}
							<p class="aitema-error-msg">{formErrors.email}</p>
						{/if}
					</div>
					<div class="aitema-field">
						<label for="phone" class="aitema-label">Telefonnummer <span style="color:var(--aitema-muted);font-weight:400;">(optional)</span></label>
						<input type="tel" id="phone" bind:value={citizenPhone}
							class="aitema-input"
							placeholder="+49 123 456789"
							autocomplete="tel" />
					</div>
					<div class="aitema-field">
						<label for="notes" class="aitema-label">Anmerkungen <span style="color:var(--aitema-muted);font-weight:400;">(optional)</span></label>
						<textarea id="notes" bind:value={notes} rows="3"
							class="aitema-input"
							style="resize:vertical;min-height:5rem;"
							placeholder="Besondere Hinweise fuer Ihren Termin..."></textarea>
					</div>

					<!-- Booking Summary -->
					<div style="background:var(--aitema-slate-50);border:1px solid var(--aitema-slate-200);border-radius:var(--radius-md);padding:1rem;margin-top:0.5rem;">
						<p style="font-size:0.75rem;font-weight:600;color:var(--aitema-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">Ihre Auswahl</p>
						<div style="display:flex;flex-direction:column;gap:0.5rem;">
							<div style="display:flex;justify-content:space-between;font-size:0.875rem;">
								<span style="color:var(--aitema-muted);">Dienstleistung</span>
								<span style="font-weight:500;">{selectedService?.name}</span>
							</div>
							<div style="display:flex;justify-content:space-between;font-size:0.875rem;">
								<span style="color:var(--aitema-muted);">Standort</span>
								<span style="font-weight:500;">{selectedLocation?.name}</span>
							</div>
						</div>
					</div>

					<div style="display:flex;justify-content:space-between;margin-top:0.5rem;padding-top:1.25rem;border-top:1px solid var(--aitema-slate-200);">
						<button type="button" class="aitema-btn aitema-btn-secondary" onclick={prevStep}>
							<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
							Zurueck
						</button>
						<button type="submit" class="aitema-btn aitema-btn-primary" style="padding:0.625rem 1.75rem;">
							<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
							Termin verbindlich buchen
						</button>
					</div>
				</form>
			</section>

		{:else if currentStep === 5 && bookingResult}
			<!-- Confirmation -->
			<section class="animate-fade-in-up">
				<div class="confirm-hero">
					<div class="confirm-checkmark">
						<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<polyline points="20 6 9 17 4 12"></polyline>
						</svg>
					</div>
					<h2 style="font-size:1.75rem;font-weight:800;color:var(--aitema-navy);margin-bottom:0.5rem;">Termin erfolgreich gebucht!</h2>
					<p style="color:var(--aitema-muted);margin-bottom:1.5rem;">Notieren Sie sich bitte Ihren Buchungscode.</p>
					<div style="display:inline-flex;align-items:center;gap:0.5rem;background:var(--aitema-navy);color:white;padding:0.75rem 2rem;border-radius:var(--radius-lg);margin-bottom:0.5rem;">
						<svg width="18" height="18" viewBox="0 0 20 20" fill="rgba(255,255,255,0.6)" aria-hidden="true"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/></svg>
						<span style="font-size:1.5rem;font-weight:800;letter-spacing:0.15em;font-variant-numeric:tabular-nums;">{bookingResult.bookingCode}</span>
					</div>
				</div>

				<!-- Booking Details Card -->
				<div class="aitema-card" style="padding:1.25rem;margin-top:1.5rem;">
					<p style="font-size:0.75rem;font-weight:600;color:var(--aitema-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:1rem;">Termindetails</p>
					<dl style="display:flex;flex-direction:column;">
						<div style="display:flex;justify-content:space-between;padding:0.625rem 0;border-bottom:1px solid var(--aitema-slate-100);">
							<dt style="font-size:0.875rem;color:var(--aitema-muted);">Dienstleistung</dt>
							<dd style="font-size:0.875rem;font-weight:600;">{bookingResult.service.name}</dd>
						</div>
						<div style="display:flex;justify-content:space-between;padding:0.625rem 0;border-bottom:1px solid var(--aitema-slate-100);">
							<dt style="font-size:0.875rem;color:var(--aitema-muted);">Standort</dt>
							<dd style="font-size:0.875rem;font-weight:600;">{bookingResult.location.name}</dd>
						</div>
						<div style="display:flex;justify-content:space-between;padding:0.625rem 0;border-bottom:1px solid var(--aitema-slate-100);">
							<dt style="font-size:0.875rem;color:var(--aitema-muted);">Datum</dt>
							<dd style="font-size:0.875rem;font-weight:600;">{new Date(bookingResult.scheduledStart).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</dd>
						</div>
						<div style="display:flex;justify-content:space-between;padding:0.625rem 0;">
							<dt style="font-size:0.875rem;color:var(--aitema-muted);">Uhrzeit</dt>
							<dd style="font-size:0.875rem;font-weight:600;">{new Date(bookingResult.scheduledStart).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</dd>
						</div>
					</dl>
				</div>

				<div style="margin-top:1.5rem;display:flex;justify-content:center;">
					<button class="aitema-btn aitema-btn-primary aitema-btn-lg"
						onclick={() => window.location.href = `/${tenant}/status?code=${bookingResult.bookingCode}`}>
						<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>
						Status verfolgen
					</button>
				</div>
			</section>
		{/if}

	</div>
</div>
