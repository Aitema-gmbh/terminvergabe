<script lang="ts">
  import '../app.css';
  import { page } from '/stores';

  $: isBooking = .url.pathname.startsWith('/buchen');
  $: isStaff   = .url.pathname.startsWith('/staff');
  $: isKiosk   = .url.pathname.startsWith('/display/kiosk') ||
                  .url.pathname.startsWith('/display/');

  const steps = ['Standort', 'Dienstleistung', 'Termin', 'Daten', 'Bestaetigung'];
</script>

<a href="#main-content" class="skip-link">Zum Hauptinhalt springen</a>

{#if !isKiosk}
<header class="site-header" role="banner">
  <nav class="main-nav" aria-label="Hauptnavigation">
    <a href="/" class="nav-brand" aria-label="aitema Termin Startseite">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect width="28" height="28" rx="7" fill="#3b82f6"/>
        <rect x="7" y="7" width="14" height="2" rx="1" fill="white"/>
        <rect x="7" y="11" width="10" height="2" rx="1" fill="white"/>
        <rect x="7" y="15" width="12" height="2" rx="1" fill="white"/>
        <rect x="7" y="19" width="8" height="2" rx="1" fill="white"/>
      </svg>
      aitema<span class="brand-pipe">|</span>Termin
    </a>
    <ul class="nav-links" role="list">
      <li>
        <a href="/buchen" aria-current={isBooking ? "page" : undefined}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="display:inline;vertical-align:-2px;margin-right:4px">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          Termin buchen
        </a>
      </li>
      <li>
        <a href="/wartenummer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="display:inline;vertical-align:-2px;margin-right:4px">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
          </svg>
          Wartenummer
        </a>
      </li>
      <li>
        <a href="/status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="display:inline;vertical-align:-2px;margin-right:4px">
            <path d="M9 12l2 2 4-4M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>
          </svg>
          Mein Termin
        </a>
      </li>
      {#if isStaff}
        <li>
          <a href="/staff" style="background: rgba(59,130,246,0.2); color: #93c5fd;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="display:inline;vertical-align:-2px;margin-right:4px">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Mitarbeiter
          </a>
        </li>
      {/if}
    </ul>
  </nav>
</header>
{/if}

<main id="main-content" role="main">
  <slot />
</main>

{#if !isKiosk && !isStaff}
<footer class="site-footer" role="contentinfo">
  <div class="footer-content">
    <p style="display:flex; align-items:center; gap:0.5rem; color: rgba(255,255,255,0.5);">
      <svg width="16" height="16" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect width="28" height="28" rx="7" fill="#3b82f6"/>
        <rect x="7" y="7" width="14" height="2" rx="1" fill="white"/>
        <rect x="7" y="11" width="10" height="2" rx="1" fill="white"/>
        <rect x="7" y="15" width="12" height="2" rx="1" fill="white"/>
        <rect x="7" y="19" width="8" height="2" rx="1" fill="white"/>
      </svg>
      Powered by <a href="https://aitema.de" style="color: rgba(255,255,255,0.7); text-decoration: underline;">aitema|Termin</a>
    </p>
    <nav aria-label="Footer-Navigation" style="display: flex; gap: 1.5rem;">
      <a href="/impressum">Impressum</a>
      <a href="/datenschutz">Datenschutz</a>
      <a href="/barrierefreiheit">Barrierefreiheit</a>
    </nav>
  </div>
</footer>
{/if}
