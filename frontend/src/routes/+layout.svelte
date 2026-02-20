<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';

  $: isBooking = $page.url.pathname.startsWith('/buchen');
  $: isStaff = $page.url.pathname.startsWith('/staff');
  $: isKiosk = $page.url.pathname.startsWith('/display/kiosk');

  const steps = ['Standort', 'Dienstleistung', 'Termin', 'Daten', 'Bestaetigung'];
</script>

<a href="#main-content" class="skip-link">Zum Hauptinhalt springen</a>

{#if !isKiosk}
<header class="site-header" role="banner">
  <nav class="main-nav" aria-label="Hauptnavigation">
    <a href="/" class="nav-brand">
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
      <li><a href="/buchen" aria-current={isBooking ? "page" : undefined}>Termin buchen</a></li>
      <li><a href="/wartenummer">Wartenummer</a></li>
      <li><a href="/status">Mein Termin</a></li>
      {#if isStaff}
        <li>
          <a href="/staff" style="background: rgba(59,130,246,0.2); color: #93c5fd;">
            Mitarbeiter-Dashboard
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
    <p style="display:flex; align-items:center; gap:0.5rem;">
      <svg width="16" height="16" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect width="28" height="28" rx="7" fill="#3b82f6"/>
        <rect x="7" y="7" width="14" height="2" rx="1" fill="white"/>
        <rect x="7" y="11" width="10" height="2" rx="1" fill="white"/>
        <rect x="7" y="15" width="12" height="2" rx="1" fill="white"/>
        <rect x="7" y="19" width="8" height="2" rx="1" fill="white"/>
      </svg>
      Powered by <a href="https://aitema.de">aitema|Termin</a>
    </p>
    <nav aria-label="Footer-Navigation">
      <a href="/impressum">Impressum</a>
      <a href="/datenschutz">Datenschutz</a>
      <a href="/barrierefreiheit">Barrierefreiheit</a>
    </nav>
  </div>
</footer>
{/if}
