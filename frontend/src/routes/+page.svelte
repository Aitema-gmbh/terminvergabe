<script lang="ts">
  import { onMount } from 'svelte';
  let stats = { locations: 0, services: 0, avgWait: 0 };
  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const TENANT = import.meta.env.VITE_TENANT_SLUG || 'musterstadt';

  onMount(async () => {
    try {
      const r = await fetch(`${API}/api/v1/${TENANT}/locations`);
      const d = await r.json();
      stats.locations = (d.locations || []).length;
    } catch {}
  });
</script>

<svelte:head>
  <title>aitema|Termin – Digitale Terminverwaltung</title>
</svelte:head>

<!-- Hero Section -->
<section class="home-hero" aria-label="Willkommen bei aitema|Termin">
  <div class="hero-bg-decoration" aria-hidden="true">
    <div class="hero-circle-1"></div>
    <div class="hero-circle-2"></div>
    <div class="hero-grid"></div>
  </div>
  <div class="container hero-content">
    <div class="hero-badge">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="6" stroke="#3b82f6" stroke-width="1.3"/>
        <path d="M4 7l2 2 4-4" stroke="#3b82f6" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Digitale Behördentermine
    </div>
    <h1 class="hero-headline">
      Termine buchen –<br>
      <span class="hero-highlight">einfach &amp; schnell</span>
    </h1>
    <p class="hero-description">
      Buchen Sie Ihren Behördentermin bequem von zu Hause.
      Kein Warteschleifen, keine Überraschungen – alles online in wenigen Schritten.
    </p>
    <div class="hero-actions">
      <a href="/buchen" class="btn btn-primary btn-lg hero-cta">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="14" height="14" rx="2.5" stroke="white" stroke-width="1.5"/>
          <path d="M6 1v4M12 1v4M2 8h14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M6 12h2M10 12h2" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Termin buchen
      </a>
      <a href="/wartenummer" class="btn btn-secondary btn-lg">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="7" stroke="#0f172a" stroke-width="1.5"/>
          <path d="M9 5.5v3.5l2.5 1.5" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Wartenummer ziehen
      </a>
    </div>
    <div class="hero-trust">
      <div class="trust-item">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1L2 4v4c0 3.31 2.58 6.41 6 7.16C11.42 14.41 14 11.31 14 8V4L8 1z" fill="#dcfce7" stroke="#059669" stroke-width="1.3"/>
          <path d="M5 8l2 2 4-4" stroke="#059669" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        DSGVO-konform
      </div>
      <div class="trust-item">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="#059669" stroke-width="1.3"/>
          <path d="M8 5v3l2 1.5" stroke="#059669" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        24/7 Online-Buchung
      </div>
      <div class="trust-item">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="#059669" stroke-width="1.3"/>
          <path d="M1.5 6h13" stroke="#059669" stroke-width="1.3"/>
        </svg>
        Sofortige Bestätigung
      </div>
    </div>
  </div>
</section>

<!-- Feature Cards -->
<section class="features-section" aria-label="So funktioniert es">
  <div class="container">
    <div class="section-header-center">
      <h2 class="section-heading">In 3 Schritten zum Termin</h2>
      <p class="section-sub">Schnell, einfach und sicher – ohne Wartezeiten am Telefon</p>
    </div>
    <div class="features-grid">
      <div class="feature-card animate-fade-in-up">
        <div class="feature-step">01</div>
        <div class="feature-icon">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="M14 2C8.48 2 4 6.48 4 12c0 7.44 10 16 10 16s10-8.56 10-16c0-5.52-4.48-10-10-10z" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
            <circle cx="14" cy="12" r="3" fill="#3b82f6"/>
          </svg>
        </div>
        <h3>Standort wählen</h3>
        <p>Wählen Sie Ihren Wunsch-Standort in Ihrer Nähe aus.</p>
      </div>
      <div class="feature-connector" aria-hidden="true">
        <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
          <path d="M0 8h28M22 2l8 6-8 6" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="feature-card animate-fade-in-up delay-100">
        <div class="feature-step">02</div>
        <div class="feature-icon">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="22" height="22" rx="4" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
            <path d="M9 3v5M19 3v5M3 12h22" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M9 18h4M9 22h2" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <h3>Termin buchen</h3>
        <p>Wählen Sie Ihre Dienstleistung, Datum und freie Uhrzeit.</p>
      </div>
      <div class="feature-connector" aria-hidden="true">
        <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
          <path d="M0 8h28M22 2l8 6-8 6" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="feature-card animate-fade-in-up delay-200">
        <div class="feature-step">03</div>
        <div class="feature-icon">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="22" height="22" rx="4" fill="#f0fdf4" stroke="#059669" stroke-width="1.5"/>
            <path d="M8 14l5 5 8-9" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3>Bestätigung erhalten</h3>
        <p>Sie erhalten sofort eine Bestätigung mit QR-Code per E-Mail.</p>
      </div>
    </div>
  </div>
</section>

<!-- Quick Links -->
<section class="quicklinks-section" aria-label="Schnellzugriff">
  <div class="container">
    <div class="quicklinks-grid">
      <a href="/buchen" class="quicklink-card quicklink-primary">
        <div class="quicklink-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect x="4" y="4" width="24" height="24" rx="4" stroke="white" stroke-width="1.8"/>
            <path d="M10 4v6M22 4v6M4 14h24" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M10 20h4M10 25h8" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="quicklink-content">
          <h3>Termin buchen</h3>
          <p>Online Termin vereinbaren</p>
        </div>
        <svg class="quicklink-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M7 10h6M10 7l3 3-3 3" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
      <a href="/wartenummer" class="quicklink-card quicklink-secondary">
        <div class="quicklink-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="12" stroke="#0f172a" stroke-width="1.8"/>
            <path d="M16 9v7l4 2.5" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="quicklink-content">
          <h3>Wartenummer</h3>
          <p>Jetzt Warteschlange einreihen</p>
        </div>
        <svg class="quicklink-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M7 10h6M10 7l3 3-3 3" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
      <a href="/status" class="quicklink-card quicklink-secondary">
        <div class="quicklink-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect x="4" y="5" width="24" height="22" rx="3" stroke="#0f172a" stroke-width="1.8"/>
            <path d="M4 12h24M10 19l3 3 6-7" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="quicklink-content">
          <h3>Termin-Status</h3>
          <p>Status Ihrer Buchung prüfen</p>
        </div>
        <svg class="quicklink-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M7 10h6M10 7l3 3-3 3" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    </div>
  </div>
</section>

<style>
  /* ===== Hero ===== */
  .home-hero {
    position: relative;
    background: linear-gradient(135deg, var(--aitema-navy) 0%, var(--aitema-blue) 55%, #1e40af 100%);
    color: #fff;
    padding: 5rem 1.5rem 6rem;
    overflow: hidden;
  }
  .hero-bg-decoration { position: absolute; inset: 0; pointer-events: none; }
  .hero-circle-1 {
    position: absolute; top: -60px; right: -60px;
    width: 400px; height: 400px; border-radius: 50%;
    background: radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%);
  }
  .hero-circle-2 {
    position: absolute; bottom: -80px; left: -40px;
    width: 300px; height: 300px; border-radius: 50%;
    background: radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%);
  }
  .hero-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .hero-content { position: relative; z-index: 1; max-width: 720px; }

  .hero-badge {
    display: inline-flex; align-items: center; gap: 0.5rem;
    background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3);
    color: #93c5fd; font-size: 0.8125rem; font-weight: 600;
    padding: 0.375rem 0.875rem; border-radius: 9999px;
    margin-bottom: 1.5rem; letter-spacing: 0.02em;
  }
  .hero-headline {
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: #fff;
    margin-bottom: 1.25rem;
  }
  .hero-highlight {
    background: linear-gradient(135deg, #60a5fa, #34d399);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .hero-description {
    font-size: 1.125rem;
    color: rgba(255,255,255,0.75);
    max-width: 560px;
    line-height: 1.7;
    margin-bottom: 2.5rem;
  }
  .hero-actions {
    display: flex; gap: 1rem; flex-wrap: wrap;
    margin-bottom: 2.5rem;
  }
  .hero-cta {
    font-size: 1rem; padding: 0.875rem 2rem;
    box-shadow: 0 4px 24px rgba(59,130,246,0.5);
  }
  .hero-trust {
    display: flex; gap: 1.5rem; flex-wrap: wrap;
  }
  .trust-item {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.8125rem; color: rgba(255,255,255,0.6); font-weight: 500;
  }

  /* ===== Features ===== */
  .features-section {
    padding: 5rem 1.5rem;
    background: var(--aitema-slate-50);
  }
  .section-header-center { text-align: center; margin-bottom: 3rem; }
  .section-heading {
    font-size: 1.875rem; font-weight: 800;
    letter-spacing: -0.025em; color: var(--aitema-navy);
    margin-bottom: 0.625rem;
  }
  .section-sub { font-size: 1rem; color: var(--aitema-muted); }

  .features-grid {
    display: flex; align-items: center; justify-content: center;
    gap: 0; flex-wrap: wrap;
  }
  .feature-card {
    background: #fff; border: 1px solid var(--aitema-slate-200);
    border-radius: 1rem; padding: 2rem 1.75rem;
    width: 220px; flex-shrink: 0;
    text-align: center;
    box-shadow: var(--shadow-sm);
    transition: transform 200ms ease, box-shadow 200ms ease;
  }
  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }
  .feature-connector {
    padding: 0 1rem; display: flex; align-items: center;
  }
  .feature-step {
    font-size: 0.6875rem; font-weight: 800;
    color: var(--aitema-accent); letter-spacing: 0.1em;
    text-transform: uppercase; margin-bottom: 1rem;
  }
  .feature-icon {
    width: 64px; height: 64px; border-radius: 1rem;
    background: var(--aitema-slate-50); border: 1px solid var(--aitema-slate-200);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1.25rem;
  }
  .feature-card h3 {
    font-size: 1rem; font-weight: 700; color: var(--aitema-navy);
    margin-bottom: 0.5rem;
  }
  .feature-card p {
    font-size: 0.875rem; color: var(--aitema-muted); line-height: 1.5;
  }

  /* ===== Quick Links ===== */
  .quicklinks-section {
    padding: 2rem 1.5rem 4rem;
    background: var(--aitema-slate-100);
  }
  .quicklinks-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 1rem;
  }
  .quicklink-card {
    display: flex; align-items: center; gap: 1.25rem;
    padding: 1.5rem 1.75rem; border-radius: 1rem;
    text-decoration: none; transition: all 200ms ease;
    border: 1.5px solid transparent;
  }
  .quicklink-card:hover { transform: translateY(-2px); }
  .quicklink-primary {
    background: linear-gradient(135deg, var(--aitema-navy) 0%, var(--aitema-blue) 100%);
    color: #fff;
    box-shadow: 0 8px 24px rgba(15,23,42,0.2);
  }
  .quicklink-primary:hover { color: #fff; box-shadow: 0 12px 32px rgba(15,23,42,0.3); }
  .quicklink-secondary {
    background: #fff; color: var(--aitema-navy);
    border-color: var(--aitema-slate-200);
    box-shadow: var(--shadow-sm);
  }
  .quicklink-secondary:hover { border-color: var(--aitema-accent); box-shadow: var(--shadow-md); color: var(--aitema-navy); }
  .quicklink-icon {
    width: 56px; height: 56px; border-radius: 0.75rem;
    background: rgba(255,255,255,0.1); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .quicklink-secondary .quicklink-icon { background: var(--aitema-slate-100); }
  .quicklink-content { flex: 1; }
  .quicklink-content h3 { font-size: 1rem; font-weight: 700; margin-bottom: 0.125rem; }
  .quicklink-primary .quicklink-content h3 { color: #fff; }
  .quicklink-primary .quicklink-content p { font-size: 0.8125rem; color: rgba(255,255,255,0.7); }
  .quicklink-secondary .quicklink-content p { font-size: 0.8125rem; color: var(--aitema-muted); }
  .quicklink-arrow { flex-shrink: 0; }

  /* ===== Responsive ===== */
  @media (max-width: 1024px) {
    .quicklinks-grid { grid-template-columns: 1fr 1fr; }
    .quicklink-primary { grid-column: 1 / -1; }
  }
  @media (max-width: 768px) {
    .home-hero { padding: 3rem 1.25rem 4rem; }
    .hero-headline { font-size: 2rem; }
    .hero-actions { flex-direction: column; }
    .hero-actions .btn { width: 100%; justify-content: center; }
    .features-grid { flex-direction: column; align-items: stretch; gap: 0.75rem; }
    .feature-connector { display: none; }
    .feature-card { width: 100%; }
    .quicklinks-grid { grid-template-columns: 1fr; }
  }
</style>
