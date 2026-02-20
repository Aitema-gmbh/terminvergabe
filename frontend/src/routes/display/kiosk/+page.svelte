<script lang="ts">
  import { onMount } from 'svelte';

  // ============================================================
  // State
  // ============================================================
  type Step = 'language' | 'service' | 'confirm' | 'ticket';

  let step: Step = 'language';
  let selectedLang = 'de';
  let services: any[] = [];
  let categories: Record<string, any[]> = {};
  let selectedService: any = null;
  let ticketData: any = null;
  let loading = false;
  let error = '';
  let currentTime = '';
  let currentDate = '';
  let isDarkTheme = true;

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const TENANT = import.meta.env.VITE_TENANT_SLUG || 'musterstadt';
  const LOCATION_ID = import.meta.env.VITE_LOCATION_ID || 'default';

  // ============================================================
  // i18n
  // ============================================================
  const translations: Record<string, Record<string, string>> = {
    de: {
      title: 'Willkommen',
      subtitle: 'Bitte waehlen Sie Ihre Sprache',
      selectService: 'Dienstleistung waehlen',
      selectServiceSub: 'Was moechten Sie erledigen?',
      confirm: 'Bestaetigen',
      confirmTitle: 'Ihre Auswahl',
      confirmService: 'Dienstleistung',
      confirmDuration: 'Geschaetzte Dauer',
      confirmMinutes: 'Minuten',
      getTicket: 'Wartenummer ziehen',
      cancel: 'Abbrechen',
      back: 'Zurueck',
      yourNumber: 'Ihre Wartenummer',
      estimatedWait: 'Geschaetzte Wartezeit',
      position: 'Position in der Warteschlange',
      minutes: 'Min.',
      waitInfo: 'Bitte warten Sie, bis Ihre Nummer auf dem Display aufgerufen wird.',
      newTicket: 'Neues Ticket',
      loading: 'Wird geladen...',
      errorGeneric: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    },
    en: {
      title: 'Welcome',
      subtitle: 'Please select your language',
      selectService: 'Select Service',
      selectServiceSub: 'What would you like to do?',
      confirm: 'Confirm',
      confirmTitle: 'Your Selection',
      confirmService: 'Service',
      confirmDuration: 'Estimated Duration',
      confirmMinutes: 'minutes',
      getTicket: 'Get Queue Number',
      cancel: 'Cancel',
      back: 'Back',
      yourNumber: 'Your Queue Number',
      estimatedWait: 'Estimated Wait Time',
      position: 'Position in Queue',
      minutes: 'min.',
      waitInfo: 'Please wait until your number is called on the display.',
      newTicket: 'New Ticket',
      loading: 'Loading...',
      errorGeneric: 'An error occurred. Please try again.',
    },
    tr: {
      title: 'Hos Geldiniz',
      subtitle: 'Lutfen dilinizi secin',
      selectService: 'Hizmet Secin',
      selectServiceSub: 'Ne yapmak istiyorsunuz?',
      confirm: 'Onayla',
      confirmTitle: 'Seciminiz',
      confirmService: 'Hizmet',
      confirmDuration: 'Tahmini Sure',
      confirmMinutes: 'dakika',
      getTicket: 'Sira Numarasi Al',
      cancel: 'Iptal',
      back: 'Geri',
      yourNumber: 'Sira Numaraniz',
      estimatedWait: 'Tahmini Bekleme Suresi',
      position: 'Siradaki Yeriniz',
      minutes: 'dk.',
      waitInfo: 'Lutfen numaraniz ekranda gorunene kadar bekleyin.',
      newTicket: 'Yeni Numara',
      loading: 'Yukleniyor...',
      errorGeneric: 'Bir hata olustu. Lutfen tekrar deneyin.',
    },
    ar: {
      title: 'مرحبا بكم',
      subtitle: 'يرجى اختيار لغتك',
      selectService: 'اختر الخدمة',
      selectServiceSub: 'ماذا تريد أن تفعل؟',
      confirm: 'تأكيد',
      confirmTitle: 'اختيارك',
      confirmService: 'الخدمة',
      confirmDuration: 'المدة المتوقعة',
      confirmMinutes: 'دقائق',
      getTicket: 'سحب رقم الانتظار',
      cancel: 'إلغاء',
      back: 'رجوع',
      yourNumber: 'رقم الانتظار الخاص بك',
      estimatedWait: 'وقت الانتظار المتوقع',
      position: 'موقعك في الطابور',
      minutes: 'د.',
      waitInfo: 'يرجى الانتظار حتى يظهر رقمك على الشاشة.',
      newTicket: 'رقم جديد',
      loading: '...جاري التحميل',
      errorGeneric: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    },
  };

  function t(key: string): string {
    return translations[selectedLang]?.[key] || translations['de'][key] || key;
  }

  const languages = [
    { code: 'de', label: 'Deutsch', short: 'DE' },
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'tr', label: 'Türkçe', short: 'TR' },
    { code: 'ar', label: 'العربية', short: 'AR' },
  ];

  // ============================================================
  // Theme based on time of day
  // ============================================================
  function updateTheme() {
    const hour = new Date().getHours();
    isDarkTheme = hour < 7 || hour >= 19;
  }

  function updateClock() {
    const now = new Date();
    currentTime = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    currentDate = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ============================================================
  // API calls
  // ============================================================
  async function loadServices() {
    loading = true;
    error = '';
    try {
      const resp = await fetch(`${API}/api/v1/${TENANT}/services?locationId=${LOCATION_ID}`);
      const data = await resp.json();
      services = data.services || [];
      categories = data.categories || {};
    } catch (e: any) {
      error = t('errorGeneric');
    }
    loading = false;
  }

  async function issueTicket() {
    if (!selectedService) return;
    loading = true;
    error = '';
    try {
      const resp = await fetch(`${API}/api/v1/${TENANT}/queue/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: LOCATION_ID,
          serviceId: selectedService.id,
        }),
      });
      const data = await resp.json();
      if (data.data) {
        ticketData = data.data;
        step = 'ticket';
      } else {
        error = data.error || t('errorGeneric');
      }
    } catch (e: any) {
      error = t('errorGeneric');
    }
    loading = false;
  }

  // ============================================================
  // Navigation
  // ============================================================
  function selectLanguage(lang: string) {
    selectedLang = lang;
    step = 'service';
    loadServices();
  }

  function selectService(service: any) {
    selectedService = service;
    step = 'confirm';
  }

  function reset() {
    step = 'language';
    selectedService = null;
    ticketData = null;
    error = '';
  }

  // Auto-reset after 30s on ticket screen
  let resetTimer: any;
  let resetCountdown = 30;
  let countdownInterval: any;

  $: if (step === 'ticket') {
    resetCountdown = 30;
    resetTimer = setTimeout(reset, 30000);
    countdownInterval = setInterval(() => {
      resetCountdown--;
    }, 1000);
  } else {
    if (resetTimer) clearTimeout(resetTimer);
    if (countdownInterval) clearInterval(countdownInterval);
  }

  onMount(() => {
    updateTheme();
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    const themeInterval = setInterval(updateTheme, 60000);
    return () => {
      clearInterval(clockInterval);
      clearInterval(themeInterval);
    };
  });
</script>

<svelte:head>
  <title>Self-Service Kiosk - aitema|Termin</title>
  <style>
    body { margin: 0 !important; overflow: hidden !important; }
    header, footer { display: none !important; }
    main { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
  </style>
</svelte:head>

<div class="kiosk" class:dark={isDarkTheme} class:rtl={selectedLang === 'ar'}
     role="application" aria-label="Self-Service Kiosk">

  <!-- Top Bar -->
  <div class="kiosk-topbar">
    <div class="kiosk-brand-small">
      <div class="brand-logo">
        <svg width="20" height="20" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect width="28" height="28" rx="7" fill="#3b82f6"/>
          <rect x="7" y="7" width="14" height="2" rx="1" fill="white"/>
          <rect x="7" y="11" width="10" height="2" rx="1" fill="white"/>
          <rect x="7" y="15" width="12" height="2" rx="1" fill="white"/>
          <rect x="7" y="19" width="8" height="2" rx="1" fill="white"/>
        </svg>
      </div>
      <span>aitema|Termin</span>
    </div>
    <div class="kiosk-datetime">
      <span class="kiosk-date" aria-live="off">{currentDate}</span>
      <span class="kiosk-clock" aria-live="off">{currentTime}</span>
    </div>
  </div>

  <!-- STEP 1: Language Selection -->
  {#if step === 'language'}
    <div class="kiosk-step kiosk-center">
      <div class="welcome-icon" aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="32" fill="rgba(59,130,246,0.15)"/>
          <path d="M20 32c0-6.63 5.37-12 12-12s12 5.37 12 12-5.37 12-12 12-12-5.37-12-12z" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" stroke-width="1.5"/>
          <path d="M26 32c0-.55.45-1 1-1h2v-4a1 1 0 0 1 2 0v4h2a1 1 0 0 1 0 2h-2v2a1 1 0 0 1-2 0v-2h-2a1 1 0 0 1-1-1z" fill="#3b82f6"/>
        </svg>
      </div>
      <h1 class="kiosk-title">{t('title')}</h1>
      <p class="kiosk-subtitle">{t('subtitle')}</p>
      <div class="lang-grid" role="group" aria-label="Sprachauswahl">
        {#each languages as lang}
          <button class="lang-btn" on:click={() => selectLanguage(lang.code)}
                  aria-label={lang.label}>
            <span class="lang-code">{lang.short}</span>
            <span class="lang-label">{lang.label}</span>
          </button>
        {/each}
      </div>
    </div>

  <!-- STEP 2: Service Selection -->
  {:else if step === 'service'}
    <div class="kiosk-step">
      <div class="kiosk-header">
        <button class="kiosk-back-btn" on:click={reset} aria-label={t('back')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M13 15l-5-5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {t('back')}
        </button>
        <h1 class="kiosk-title">{t('selectService')}</h1>
        <p class="kiosk-subtitle">{t('selectServiceSub')}</p>
      </div>
      {#if loading}
        <div class="kiosk-loading-state" role="status">
          <div class="kiosk-spinner"></div>
          <p>{t('loading')}</p>
        </div>
      {:else if error}
        <p class="kiosk-error" role="alert">{error}</p>
      {:else}
        <div class="service-grid" role="group" aria-label={t('selectService')}>
          {#each Object.entries(categories) as [category, catServices]}
            {#if catServices.length > 0}
              <h2 class="category-label">{category}</h2>
              {#each catServices as service}
                <button class="service-tile" on:click={() => selectService(service)}>
                  <div class="service-tile-icon">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                      <rect x="3" y="3" width="22" height="22" rx="5" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" stroke-width="1.5"/>
                      <path d="M10 14h8M14 10v8" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <span class="service-tile-name">{service.name}</span>
                  <span class="service-tile-duration">~{service.durationMinutes} {t('minutes')}</span>
                </button>
              {/each}
            {/if}
          {/each}
          {#if Object.keys(categories).length === 0}
            {#each services as service}
              <button class="service-tile" on:click={() => selectService(service)}>
                <div class="service-tile-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                    <rect x="3" y="3" width="22" height="22" rx="5" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" stroke-width="1.5"/>
                    <path d="M10 14h8M14 10v8" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </div>
                <span class="service-tile-name">{service.name}</span>
                <span class="service-tile-duration">~{service.durationMinutes} {t('minutes')}</span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

  <!-- STEP 3: Confirmation -->
  {:else if step === 'confirm'}
    <div class="kiosk-step kiosk-center">
      <h1 class="kiosk-title">{t('confirmTitle')}</h1>
      <div class="confirm-card">
        <div class="confirm-row">
          <span class="confirm-label">{t('confirmService')}</span>
          <span class="confirm-value">{selectedService?.name}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">{t('confirmDuration')}</span>
          <span class="confirm-value">~{selectedService?.durationMinutes} {t('confirmMinutes')}</span>
        </div>
      </div>
      {#if error}
        <p class="kiosk-error" role="alert">{error}</p>
      {/if}
      <div class="confirm-actions">
        <button class="kiosk-primary-btn" on:click={issueTicket}
                disabled={loading} aria-busy={loading}>
          {#if loading}
            <div class="kiosk-spinner kiosk-spinner-white"></div>
            {t('loading')}
          {:else}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="4" width="18" height="17" rx="2" stroke="white" stroke-width="2"/>
              <path d="M8 2v4M16 2v4M3 10h18M8 14h4M8 18h2" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
            {t('getTicket')}
          {/if}
        </button>
        <button class="kiosk-secondary-btn" on:click={() => { step = 'service'; }}>
          {t('cancel')}
        </button>
      </div>
    </div>

  <!-- STEP 4: Ticket Issued -->
  {:else if step === 'ticket' && ticketData}
    <div class="kiosk-step kiosk-center">
      <div class="ticket-success-badge" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="20" fill="rgba(5,150,105,0.15)"/>
          <path d="M10 20l7 7L30 13" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1 class="kiosk-title">{t('yourNumber')}</h1>
      <div class="ticket-number-hero" aria-live="assertive">
        {ticketData.ticketNumber}
      </div>
      <div class="ticket-info-card">
        <div class="ticket-info-row">
          <span class="ticket-info-label">{t('estimatedWait')}</span>
          <span class="ticket-info-value">
            {#if ticketData.estimatedWaitMinutes > 0}
              ~{ticketData.estimatedWaitMinutes} {t('minutes')}
            {:else}
              -
            {/if}
          </span>
        </div>
      </div>

      <!-- QR Code -->
      <div class="qr-section" aria-label="QR Code zum Einchecken">
        <div class="qr-frame">
          <div class="qr-inner-box">QR</div>
        </div>
        <p class="qr-label">QR-Code scannen zum Einchecken</p>
      </div>

      <p class="ticket-wait-hint">{t('waitInfo')}</p>

      <!-- Countdown -->
      <div class="countdown-bar">
        <div class="countdown-fill" style="width: {(resetCountdown / 30) * 100}%"></div>
      </div>
      <p class="countdown-text">Automatisch zurueck in {resetCountdown}s</p>

      <button class="kiosk-secondary-btn" on:click={reset}>
        {t('newTicket')}
      </button>
    </div>
  {/if}
</div>

<style>
  /* ============================================================
     Base / Theme
     ============================================================ */
  .kiosk {
    --k-bg: #f8fafc;
    --k-fg: #0f172a;
    --k-card: #ffffff;
    --k-primary: #1e3a5f;
    --k-primary-fg: #ffffff;
    --k-accent: #3b82f6;
    --k-emerald: #059669;
    --k-amber: #f59e0b;
    --k-border: #e2e8f0;
    --k-muted: #64748b;
    --k-error: #dc2626;
    --k-gradient: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);

    width: 100vw; height: 100vh; overflow: hidden;
    display: flex; flex-direction: column;
    background: var(--k-bg); color: var(--k-fg);
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    position: relative; user-select: none;
  }
  .kiosk.dark {
    --k-bg: #0f172a;
    --k-fg: #f8fafc;
    --k-card: #1e293b;
    --k-primary: #3b82f6;
    --k-border: #334155;
    --k-muted: #94a3b8;
    --k-gradient: linear-gradient(135deg, #020617 0%, #0f172a 100%);
  }
  .kiosk.rtl { direction: rtl; }

  /* ============================================================
     Top Bar
     ============================================================ */
  .kiosk-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 2rem;
    background: var(--k-gradient);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
  }
  .kiosk-brand-small {
    display: flex; align-items: center; gap: 0.625rem;
    color: rgba(255,255,255,0.9); font-size: 0.875rem; font-weight: 600;
  }
  .brand-logo {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .kiosk-datetime {
    display: flex; flex-direction: column; align-items: flex-end; gap: 0.125rem;
  }
  .kiosk-date { font-size: 0.75rem; color: rgba(255,255,255,0.6); }
  .kiosk-clock {
    font-size: 1.25rem; font-weight: 700; color: #fff;
    font-variant-numeric: tabular-nums; letter-spacing: 0.05em;
  }

  /* ============================================================
     Steps / Layout
     ============================================================ */
  .kiosk-step {
    flex: 1; overflow-y: auto;
    display: flex; flex-direction: column; justify-content: center;
    padding: 2rem; max-width: 960px; width: 100%; margin: 0 auto;
    animation: kiosk-fade-in 0.2s ease;
  }
  @keyframes kiosk-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  .kiosk-center { align-items: center; text-align: center; }
  .kiosk-header { margin-bottom: 2rem; }

  .kiosk-title { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.025em; margin: 0 0 0.5rem; }
  .kiosk-subtitle { font-size: 1.125rem; color: var(--k-muted); margin: 0 0 2rem; }

  .kiosk-loading-state {
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
    padding: 3rem; color: var(--k-muted); font-size: 1.125rem;
  }
  .kiosk-error { font-size: 1rem; color: var(--k-error); padding: 1rem; background: rgba(220,38,38,0.1); border-radius: 0.5rem; margin: 1rem 0; }

  /* Welcome icon */
  .welcome-icon { margin-bottom: 1.5rem; }

  /* ============================================================
     Language Grid
     ============================================================ */
  .lang-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem;
    max-width: 560px; width: 100%;
  }
  .lang-btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.75rem; padding: 2rem 1.5rem;
    background: var(--k-card); border: 2px solid var(--k-border); border-radius: 1rem;
    cursor: pointer; min-height: 130px; color: var(--k-fg);
    transition: all 0.15s ease;
  }
  .lang-btn:hover, .lang-btn:focus-visible {
    border-color: var(--k-accent);
    background: var(--k-accent); color: #fff;
    transform: scale(1.03);
    box-shadow: 0 8px 24px rgba(59,130,246,0.3);
  }
  .lang-btn:focus-visible { outline: 3px solid var(--k-amber); outline-offset: 3px; }
  .lang-code { font-size: 1.625rem; font-weight: 800; letter-spacing: 0.05em; }
  .lang-label { font-size: 1rem; font-weight: 600; }

  /* ============================================================
     Service Grid
     ============================================================ */
  .category-label {
    font-size: 0.875rem; color: var(--k-muted); text-transform: uppercase;
    letter-spacing: 0.08em; margin: 1.5rem 0 0.75rem; grid-column: 1 / -1;
    font-weight: 600;
  }
  .service-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem; max-height: calc(100vh - 220px); overflow-y: auto; padding: 0.5rem;
  }
  .service-tile {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.625rem; padding: 1.75rem 1.25rem;
    background: var(--k-card); border: 2px solid var(--k-border); border-radius: 1rem;
    cursor: pointer; min-height: 140px; color: var(--k-fg);
    transition: all 0.15s ease;
  }
  .service-tile:hover, .service-tile:focus-visible {
    border-color: var(--k-accent);
    box-shadow: 0 8px 24px rgba(59,130,246,0.2);
    transform: translateY(-2px);
  }
  .service-tile:focus-visible { outline: 3px solid var(--k-amber); outline-offset: 3px; }
  .service-tile-icon { margin-bottom: 0.25rem; }
  .service-tile-name { font-weight: 700; font-size: 1.0625rem; text-align: center; }
  .service-tile-duration { font-size: 0.875rem; color: var(--k-muted); }

  /* ============================================================
     Confirm
     ============================================================ */
  .confirm-card {
    background: var(--k-card); border: 1px solid var(--k-border); border-radius: 1rem;
    padding: 2rem; max-width: 520px; width: 100%; margin: 0 auto 2rem; text-align: left;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
  .confirm-row {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 1rem 0; border-bottom: 1px solid var(--k-border); gap: 1rem;
  }
  .confirm-row:last-child { border-bottom: none; }
  .confirm-label { color: var(--k-muted); font-weight: 500; font-size: 1rem; }
  .confirm-value { font-weight: 700; font-size: 1.0625rem; text-align: right; }

  .confirm-actions { display: flex; flex-direction: column; align-items: center; gap: 1rem; width: 100%; max-width: 400px; }

  /* ============================================================
     Buttons
     ============================================================ */
  .kiosk-primary-btn {
    display: flex; align-items: center; justify-content: center; gap: 0.625rem;
    padding: 1.125rem 3rem; border-radius: 0.875rem;
    background: linear-gradient(135deg, var(--k-accent) 0%, #2563eb 100%);
    color: #fff; border: none; font-size: 1.25rem; font-weight: 700;
    cursor: pointer; min-height: 64px; width: 100%;
    box-shadow: 0 4px 16px rgba(59,130,246,0.4);
    transition: all 0.15s ease;
  }
  .kiosk-primary-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59,130,246,0.5);
  }
  .kiosk-primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .kiosk-primary-btn:focus-visible { outline: 3px solid var(--k-amber); outline-offset: 3px; }

  .kiosk-secondary-btn {
    padding: 1rem 2.5rem; border-radius: 0.75rem;
    background: transparent; color: var(--k-muted);
    border: 2px solid var(--k-border); font-size: 1.125rem; font-weight: 600;
    cursor: pointer; min-height: 56px; min-width: 200px;
    transition: all 0.15s;
  }
  .kiosk-secondary-btn:hover { border-color: var(--k-fg); color: var(--k-fg); }
  .kiosk-secondary-btn:focus-visible { outline: 3px solid var(--k-amber); outline-offset: 3px; }

  .kiosk-back-btn {
    display: inline-flex; align-items: center; gap: 0.5rem;
    background: none; border: none; color: var(--k-muted); cursor: pointer;
    font-size: 1rem; font-weight: 600; padding: 0.5rem 0; margin-bottom: 1rem;
  }
  .kiosk-back-btn:hover { color: var(--k-fg); }
  .kiosk-back-btn:focus-visible { outline: 2px solid var(--k-amber); outline-offset: 2px; border-radius: 4px; }

  /* ============================================================
     Ticket Display
     ============================================================ */
  .ticket-success-badge { margin-bottom: 1rem; }

  .ticket-number-hero {
    font-size: 7rem; font-weight: 900; letter-spacing: 0.05em;
    background: linear-gradient(135deg, var(--k-accent) 0%, var(--k-emerald) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0.5rem 0;
    filter: drop-shadow(0 2px 12px rgba(59,130,246,0.3));
  }

  .ticket-info-card {
    background: var(--k-card); border: 1px solid var(--k-border); border-radius: 0.75rem;
    padding: 1.25rem 2rem; max-width: 400px; width: 100%; margin: 0 auto 1.5rem;
  }
  .ticket-info-row { display: flex; justify-content: space-between; align-items: center; }
  .ticket-info-label { color: var(--k-muted); font-size: 0.875rem; }
  .ticket-info-value { font-weight: 700; font-size: 1.125rem; }

  .qr-section { margin: 1rem 0; }
  .qr-frame {
    width: 100px; height: 100px; border: 2px dashed var(--k-border);
    border-radius: 0.75rem; display: flex; align-items: center; justify-content: center;
    margin: 0 auto 0.5rem; background: var(--k-card);
  }
  .qr-inner-box { font-size: 1.25rem; font-weight: 700; color: var(--k-muted); }
  .qr-label { font-size: 0.75rem; color: var(--k-muted); }

  .ticket-wait-hint { color: var(--k-muted); font-size: 0.9375rem; max-width: 420px; margin: 0.75rem 0 1.5rem; line-height: 1.6; }

  /* Countdown bar */
  .countdown-bar {
    width: 200px; height: 4px; background: var(--k-border);
    border-radius: 2px; margin: 0 auto 0.375rem; overflow: hidden;
  }
  .countdown-fill {
    height: 100%; background: var(--k-accent);
    border-radius: 2px; transition: width 1s linear;
  }
  .countdown-text { font-size: 0.75rem; color: var(--k-muted); margin-bottom: 1.5rem; }

  /* ============================================================
     Spinner
     ============================================================ */
  .kiosk-spinner {
    width: 28px; height: 28px; border-radius: 50%;
    border: 3px solid rgba(59,130,246,0.2);
    border-top-color: var(--k-accent);
    animation: kspin 0.7s linear infinite;
    flex-shrink: 0;
  }
  .kiosk-spinner-white {
    border-color: rgba(255,255,255,0.3); border-top-color: #fff;
  }
  @keyframes kspin { to { transform: rotate(360deg); } }

  /* ============================================================
     Accessibility / Motion
     ============================================================ */
  @media (prefers-reduced-motion: reduce) {
    .lang-btn, .service-tile, .kiosk-primary-btn, .kiosk-step { transition: none; animation: none; }
    .lang-btn:hover, .service-tile:hover, .kiosk-primary-btn:hover { transform: none; }
  }

  @media (max-height: 700px) {
    .kiosk-title { font-size: 1.75rem; }
    .ticket-number-hero { font-size: 5rem; }
    .lang-btn { min-height: 100px; padding: 1.25rem; }
    .kiosk-topbar { padding: 0.625rem 1.5rem; }
  }

  @media (max-width: 600px) {
    .kiosk-title { font-size: 1.75rem; }
    .lang-grid { gap: 0.75rem; }
    .lang-btn { min-height: 100px; }
    .ticket-number-hero { font-size: 5rem; }
  }
</style>
