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
      subtitle: 'Lütfen dilinizi secin',
      selectService: 'Hizmet Secin',
      selectServiceSub: 'Ne yapmak istiyorsunuz?',
      confirm: 'Onayla',
      confirmTitle: 'Seciminiz',
      confirmService: 'Hizmet',
      confirmDuration: 'Tahmini Süre',
      confirmMinutes: 'dakika',
      getTicket: 'Sira Numarasi Al',
      cancel: 'Iptal',
      back: 'Geri',
      yourNumber: 'Sira Numaraniz',
      estimatedWait: 'Tahmini Bekleme Süresi',
      position: 'Siradaki Yeriniz',
      minutes: 'dk.',
      waitInfo: 'Lütfen numaraniz ekranda gorunene kadar bekleyin.',
      newTicket: 'Yeni Numara',
      loading: 'Yükleniyor...',
      errorGeneric: 'Bir hata olustu. Lütfen tekrar deneyin.',
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
    { code: 'de', label: 'Deutsch', flag: 'DE' },
    { code: 'en', label: 'English', flag: 'EN' },
    { code: 'tr', label: 'Türkçe', flag: 'TR' },
    { code: 'ar', label: 'العربية', flag: 'AR' },
  ];

  // ============================================================
  // Theme based on time of day
  // ============================================================
  function updateTheme() {
    const hour = new Date().getHours();
    isDarkTheme = hour < 7 || hour >= 19;
  }

  function updateClock() {
    currentTime = new Date().toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
  $: if (step === 'ticket') {
    resetTimer = setTimeout(reset, 30000);
  } else if (resetTimer) {
    clearTimeout(resetTimer);
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

  <!-- Clock -->
  <div class="kiosk-clock" aria-live="off">{currentTime}</div>

  <!-- STEP 1: Language Selection -->
  {#if step === 'language'}
    <div class="kiosk-step kiosk-center">
      <h1 class="kiosk-title">{t('title')}</h1>
      <p class="kiosk-subtitle">{t('subtitle')}</p>
      <div class="lang-grid" role="group" aria-label="Sprachauswahl">
        {#each languages as lang}
          <button class="lang-btn" on:click={() => selectLanguage(lang.code)}
                  aria-label={lang.label}>
            <span class="lang-flag">{lang.flag}</span>
            <span class="lang-label">{lang.label}</span>
          </button>
        {/each}
      </div>
    </div>

  <!-- STEP 2: Service Selection -->
  {:else if step === 'service'}
    <div class="kiosk-step">
      <div class="kiosk-header">
        <button class="back-btn" on:click={reset} aria-label={t('back')}>
          &#8592; {t('back')}
        </button>
        <h1 class="kiosk-title">{t('selectService')}</h1>
        <p class="kiosk-subtitle">{t('selectServiceSub')}</p>
      </div>
      {#if loading}
        <p class="kiosk-loading" role="status">{t('loading')}</p>
      {:else if error}
        <p class="kiosk-error" role="alert">{error}</p>
      {:else}
        <div class="service-grid" role="group" aria-label={t('selectService')}>
          {#each Object.entries(categories) as [category, catServices]}
            {#if catServices.length > 0}
              <h2 class="category-title">{category}</h2>
              {#each catServices as service}
                <button class="service-tile" on:click={() => selectService(service)}>
                  <span class="service-name">{service.name}</span>
                  <span class="service-duration">~{service.durationMinutes} {t('minutes')}</span>
                </button>
              {/each}
            {/if}
          {/each}
          {#if Object.keys(categories).length === 0}
            {#each services as service}
              <button class="service-tile" on:click={() => selectService(service)}>
                <span class="service-name">{service.name}</span>
                <span class="service-duration">~{service.durationMinutes} {t('minutes')}</span>
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
          <span class="confirm-label">{t('confirmService')}:</span>
          <span class="confirm-value">{selectedService?.name}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">{t('confirmDuration')}:</span>
          <span class="confirm-value">~{selectedService?.durationMinutes} {t('confirmMinutes')}</span>
        </div>
      </div>
      <div class="confirm-actions">
        <button class="action-btn action-btn--primary" on:click={issueTicket}
                disabled={loading} aria-busy={loading}>
          {#if loading}{t('loading')}{:else}{t('getTicket')}{/if}
        </button>
        <button class="action-btn action-btn--secondary" on:click={() => { step = 'service'; }}>
          {t('cancel')}
        </button>
      </div>
      {#if error}
        <p class="kiosk-error" role="alert">{error}</p>
      {/if}
    </div>

  <!-- STEP 4: Ticket Issued -->
  {:else if step === 'ticket' && ticketData}
    <div class="kiosk-step kiosk-center">
      <h1 class="kiosk-title">{t('yourNumber')}</h1>
      <div class="ticket-number" aria-live="assertive">
        {ticketData.ticketNumber}
      </div>
      <div class="ticket-info">
        <div class="ticket-row">
          <span class="ticket-label">{t('estimatedWait')}:</span>
          <span class="ticket-value">
            {#if ticketData.estimatedWaitMinutes > 0}
              ~{ticketData.estimatedWaitMinutes} {t('minutes')}
            {:else}
              -
            {/if}
          </span>
        </div>
      </div>
      <div class="qr-placeholder" aria-label="QR Code">
        <div class="qr-box">QR</div>
      </div>
      <p class="ticket-hint">{t('waitInfo')}</p>
      <button class="action-btn action-btn--secondary" on:click={reset}>
        {t('newTicket')}
      </button>
    </div>
  {/if}

  <!-- Branding -->
  <div class="kiosk-brand">aitema|Termin</div>
</div>

<style>
  /* ============================================================
     Base / Theme
     ============================================================ */
  .kiosk {
    --bg: #f8fafc; --fg: #0f172a; --card-bg: #ffffff;
    --primary: #1e3a5f; --primary-fg: #ffffff;
    --accent: #fbbf24; --border: #e5e7eb;
    --muted: #6b7280; --error: #dc2626;

    width: 100vw; height: 100vh; overflow: hidden;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    position: relative; user-select: none;
  }
  .kiosk.dark {
    --bg: #0f172a; --fg: #f8fafc; --card-bg: #1e293b;
    --primary: #3b82f6; --primary-fg: #ffffff;
    --border: #334155; --muted: #94a3b8;
  }
  .kiosk.rtl { direction: rtl; }

  /* Clock */
  .kiosk-clock {
    position: absolute; top: 1.5rem; right: 2rem;
    font-size: 1.25rem; color: var(--muted); font-variant-numeric: tabular-nums;
  }

  /* Brand */
  .kiosk-brand {
    position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%);
    font-size: 0.75rem; color: var(--muted); letter-spacing: 0.05em;
  }

  /* ============================================================
     Steps
     ============================================================ */
  .kiosk-step { width: 100%; max-width: 900px; padding: 2rem; }
  .kiosk-center { text-align: center; }

  .kiosk-title { font-size: 2.5rem; font-weight: 800; margin: 0 0 0.5rem; }
  .kiosk-subtitle { font-size: 1.25rem; color: var(--muted); margin: 0 0 2rem; }
  .kiosk-loading { font-size: 1.25rem; color: var(--muted); text-align: center; padding: 3rem; }
  .kiosk-error { font-size: 1rem; color: var(--error); text-align: center; padding: 1rem; }

  .kiosk-header { margin-bottom: 1.5rem; }

  /* ============================================================
     Language Grid
     ============================================================ */
  .lang-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;
    max-width: 600px; margin: 0 auto;
  }
  .lang-btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.75rem; padding: 2rem 1.5rem;
    background: var(--card-bg); border: 2px solid var(--border); border-radius: 1rem;
    cursor: pointer; min-height: 120px; transition: all 0.15s;
    font-size: 1.25rem; color: var(--fg);
  }
  .lang-btn:hover, .lang-btn:focus-visible {
    border-color: var(--primary); background: var(--primary); color: var(--primary-fg);
    transform: scale(1.03);
  }
  .lang-btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
  .lang-flag { font-size: 1.5rem; font-weight: 700; }
  .lang-label { font-weight: 600; }

  /* ============================================================
     Service Grid
     ============================================================ */
  .category-title {
    font-size: 1rem; color: var(--muted); text-transform: uppercase;
    letter-spacing: 0.08em; margin: 1.5rem 0 0.75rem; grid-column: 1 / -1;
  }
  .service-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem;
    max-height: calc(100vh - 200px); overflow-y: auto; padding: 0.5rem;
  }
  .service-tile {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.5rem; padding: 1.5rem 1rem;
    background: var(--card-bg); border: 2px solid var(--border); border-radius: 0.75rem;
    cursor: pointer; min-height: 100px; transition: all 0.15s;
    color: var(--fg); font-size: 1rem;
  }
  .service-tile:hover, .service-tile:focus-visible {
    border-color: var(--primary); transform: scale(1.02);
  }
  .service-tile:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
  .service-name { font-weight: 700; text-align: center; }
  .service-duration { font-size: 0.875rem; color: var(--muted); }

  /* ============================================================
     Confirm
     ============================================================ */
  .confirm-card {
    background: var(--card-bg); border: 1px solid var(--border); border-radius: 1rem;
    padding: 2rem; max-width: 500px; margin: 0 auto 2rem; text-align: left;
  }
  .confirm-row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
  .confirm-row:last-child { border-bottom: none; }
  .confirm-label { color: var(--muted); font-weight: 500; }
  .confirm-value { font-weight: 700; }

  .confirm-actions { display: flex; flex-direction: column; gap: 1rem; align-items: center; }

  /* ============================================================
     Action Buttons
     ============================================================ */
  .action-btn {
    padding: 1rem 3rem; border-radius: 0.75rem; font-size: 1.25rem; font-weight: 700;
    cursor: pointer; border: 2px solid transparent; min-height: 60px; min-width: 280px;
    transition: all 0.15s;
  }
  .action-btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
  .action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .action-btn--primary { background: var(--primary); color: var(--primary-fg); }
  .action-btn--primary:hover:not(:disabled) { transform: scale(1.03); }
  .action-btn--secondary {
    background: transparent; color: var(--muted); border-color: var(--border);
  }
  .action-btn--secondary:hover { border-color: var(--fg); color: var(--fg); }

  .back-btn {
    display: inline-flex; align-items: center; gap: 0.5rem;
    background: none; border: none; color: var(--muted); cursor: pointer;
    font-size: 1rem; min-height: 48px; padding: 0.5rem 1rem;
    margin-bottom: 1rem;
  }
  .back-btn:hover { color: var(--fg); }
  .back-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  /* ============================================================
     Ticket Display
     ============================================================ */
  .ticket-number {
    font-size: 6rem; font-weight: 900; color: var(--accent);
    letter-spacing: 0.05em; margin: 1rem 0;
    text-shadow: 0 2px 20px rgba(251, 191, 36, 0.3);
  }
  .ticket-info {
    background: var(--card-bg); border: 1px solid var(--border); border-radius: 1rem;
    padding: 1.5rem 2rem; max-width: 400px; margin: 0 auto 1.5rem; text-align: left;
  }
  .ticket-row { display: flex; justify-content: space-between; padding: 0.5rem 0; }
  .ticket-label { color: var(--muted); }
  .ticket-value { font-weight: 700; }
  .ticket-hint { color: var(--muted); font-size: 1rem; margin: 1rem 0 2rem; max-width: 400px; }

  .qr-placeholder { margin: 1rem auto; }
  .qr-box {
    width: 120px; height: 120px; margin: 0 auto;
    background: var(--card-bg); border: 2px dashed var(--border); border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center;
    color: var(--muted); font-size: 1.5rem; font-weight: 700;
  }

  /* ============================================================
     Accessibility / Reduced Motion
     ============================================================ */
  @media (prefers-reduced-motion: reduce) {
    .lang-btn, .service-tile, .action-btn { transition: none; }
    .lang-btn:hover, .service-tile:hover, .action-btn--primary:hover:not(:disabled) { transform: none; }
  }

  @media (max-height: 800px) {
    .kiosk-title { font-size: 2rem; }
    .ticket-number { font-size: 4rem; }
    .lang-btn { min-height: 90px; padding: 1.25rem 1rem; }
  }
</style>
