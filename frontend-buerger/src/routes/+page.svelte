<script lang="ts">
  import { t } from "$lib/i18n/index.js";
</script>

<svelte:head>
  <title>aitema|Termin - {t("app.title")}</title>
  <meta name="description" content="Kommunales Terminvergabe- und Besuchersteuerungssystem" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
</svelte:head>

<main id="main-content" class="landing">

  <!-- HERO -->
  <header class="hero">
    <div class="hero-content">
      <div class="hero-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
        Kommunales Verwaltungsportal
      </div>
      <h1 class="hero-title">
        aitema<span class="hero-accent">|</span>Termin
      </h1>
      <p class="hero-sub">{t("app.subtitle")}</p>
      <div class="hero-search">
        <label for="tenant-search" class="visually-hidden">Kommune suchen</label>
        <div class="search-wrap">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            id="tenant-search"
            type="search"
            placeholder="Kommune oder Stadt eingeben..."
            aria-label="Kommune suchen"
            class="search-input"
          />
        </div>
      </div>
    </div>
  </header>

  <!-- FEATURES -->
  <section class="features-section" aria-label="Funktionen">
    <div class="features-inner">
      <h2 class="features-title">Alles, was Sie fuer Ihren Termin benoetigen</h2>
      <p class="features-sub">Einfach, schnell und sicher – direkt von zuhause oder unterwegs.</p>

      <div class="features-grid">
        <article class="feature-card animate-fade-in-up">
          <div class="feature-icon-wrap blue">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <h3>Online Termin buchen</h3>
          <p>Buchen Sie bequem von zu Hause einen Termin bei Ihrer Gemeinde – ohne Telefonwarteschleife.</p>
          <span class="feature-arrow">&#8594;</span>
        </article>

        <article class="feature-card animate-fade-in-up delay-100">
          <div class="feature-icon-wrap emerald">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
            </svg>
          </div>
          <h3>Wartezeit einsehen</h3>
          <p>Sehen Sie die aktuelle Wartezeit in Echtzeit ein und planen Sie Ihren Besuch optimal.</p>
          <span class="feature-arrow">&#8594;</span>
        </article>

        <article class="feature-card animate-fade-in-up delay-200">
          <div class="feature-icon-wrap amber">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <h3>Erinnerung erhalten</h3>
          <p>Erhalten Sie rechtzeitig eine Erinnerung per E-Mail, SMS oder Browser-Push.</p>
          <span class="feature-arrow">&#8594;</span>
        </article>
      </div>
    </div>
  </section>

  <!-- STATUS STRIP -->
  <section class="status-strip" aria-label="Statusuebersicht">
    <div class="status-strip-inner">
      <div class="status-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20,6 9,17 4,12"/></svg>
        DSGVO-konform
      </div>
      <div class="status-divider"></div>
      <div class="status-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Sichere Verbindung
      </div>
      <div class="status-divider"></div>
      <div class="status-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 8v4l3 3"/></svg>
        24/7 verfuegbar
      </div>
      <div class="status-divider"></div>
      <div class="status-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Barrierefrei
      </div>
    </div>
  </section>

</main>

<style>
  /* ---- LANDING ---- */
  .landing {
    min-height: 100vh;
    font-family: "Inter", system-ui, sans-serif;
    background: #f8fafc;
  }

  /* HERO */
  .hero {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #1e40af 100%);
    padding: 5rem 1.5rem 6rem;
    position: relative;
    overflow: hidden;
    text-align: center;
  }
  .hero::before {
    content: "";
    position: absolute; top: -40%; right: -5%;
    width: 40%; padding-bottom: 40%;
    border-radius: 50%;
    background: rgba(59,130,246,0.15);
    filter: blur(60px);
    pointer-events: none;
  }
  .hero::after {
    content: "";
    position: absolute; bottom: -30%; left: -5%;
    width: 35%; padding-bottom: 35%;
    border-radius: 50%;
    background: rgba(30,58,95,0.4);
    filter: blur(50px);
    pointer-events: none;
  }
  .hero-content { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(59,130,246,0.2);
    border: 1px solid rgba(59,130,246,0.3);
    color: #93c5fd;
    font-size: 0.8125rem;
    font-weight: 600;
    padding: 0.375rem 1rem;
    border-radius: 9999px;
    margin-bottom: 1.5rem;
    letter-spacing: 0.025em;
    text-transform: uppercase;
  }

  .hero-title {
    font-size: clamp(2.5rem, 6vw, 4rem);
    font-weight: 900;
    letter-spacing: -0.04em;
    color: #fff;
    line-height: 1;
    margin-bottom: 1rem;
  }
  .hero-accent { color: #3b82f6; }

  .hero-sub {
    font-size: 1.125rem;
    color: rgba(255,255,255,0.75);
    line-height: 1.6;
    margin-bottom: 2.5rem;
  }

  /* SEARCH */
  .hero-search { max-width: 480px; margin: 0 auto; }
  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-icon {
    position: absolute;
    left: 1rem;
    color: #64748b;
    pointer-events: none;
  }
  .search-input {
    width: 100%;
    padding: 0.875rem 1rem 0.875rem 3rem;
    border-radius: 0.75rem;
    border: 2px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.08);
    color: #fff;
    font-size: 1rem;
    font-family: inherit;
    backdrop-filter: blur(8px);
    transition: border-color 150ms ease, background 150ms ease;
    outline: none;
  }
  .search-input::placeholder { color: rgba(255,255,255,0.4); }
  .search-input:focus {
    border-color: #3b82f6;
    background: rgba(255,255,255,0.12);
    box-shadow: 0 0 0 4px rgba(59,130,246,0.2);
  }

  /* FEATURES */
  .features-section {
    padding: 5rem 1.5rem;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
  }
  .features-inner { max-width: 960px; margin: 0 auto; }
  .features-title {
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 800;
    color: #0f172a;
    text-align: center;
    letter-spacing: -0.025em;
    margin-bottom: 0.75rem;
  }
  .features-sub {
    text-align: center;
    color: #64748b;
    font-size: 1.0625rem;
    margin-bottom: 3rem;
  }
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
  }

  .feature-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 1rem;
    padding: 2rem;
    transition: all 220ms ease;
    position: relative;
    overflow: hidden;
  }
  .feature-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.08), 0 8px 24px rgba(0,0,0,0.08);
    transform: translateY(-3px);
    background: #fff;
  }
  .feature-icon-wrap {
    width: 56px; height: 56px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.25rem;
  }
  .feature-icon-wrap.blue   { background: rgba(59,130,246,0.1); color: #2563eb; }
  .feature-icon-wrap.emerald{ background: rgba(5,150,105,0.1);  color: #059669; }
  .feature-icon-wrap.amber  { background: rgba(217,119,6,0.1);  color: #d97706; }

  .feature-card h3 {
    font-size: 1.125rem;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 0.625rem;
  }
  .feature-card p {
    color: #64748b;
    font-size: 0.9375rem;
    line-height: 1.6;
    margin-bottom: 1rem;
  }
  .feature-arrow {
    font-size: 1.25rem;
    color: #3b82f6;
    font-weight: 700;
    transition: transform 200ms ease;
    display: inline-block;
  }
  .feature-card:hover .feature-arrow { transform: translateX(4px); }

  /* STATUS STRIP */
  .status-strip {
    background: #0f172a;
    padding: 1.25rem 1.5rem;
  }
  .status-strip-inner {
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(255,255,255,0.6);
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.25rem 0.75rem;
  }
  .status-divider {
    width: 1px;
    height: 1.25rem;
    background: rgba(255,255,255,0.1);
  }

  /* A11y */
  .visually-hidden {
    position: absolute; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0;
  }

  /* Animations */
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fade-in-up  { animation: fadeInUp 400ms ease forwards; opacity: 0; }
  .delay-100 { animation-delay: 100ms; }
  .delay-200 { animation-delay: 200ms; }

  @media (max-width: 640px) {
    .hero { padding: 3rem 1rem 4rem; }
    .features-section { padding: 3rem 1rem; }
    .status-divider { display: none; }
    .status-strip-inner { gap: 0.25rem; }
  }
</style>
