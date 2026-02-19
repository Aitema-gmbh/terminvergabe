<script lang="ts">
  import '../app.css';
</script>

<a href="#main-content" class="skip-link">
  Zum Hauptinhalt springen
</a>

<header class="site-header" role="banner">
  <nav class="main-nav" aria-label="Hauptnavigation">
    <a href="/" class="nav-brand">
      <strong>aitema|Termin</strong>
    </a>
    <ul class="nav-links">
      <li><a href="/buchen">Termin buchen</a></li>
      <li><a href="/wartenummer">Wartenummer</a></li>
      <li><a href="/status">Mein Termin</a></li>
    </ul>
  </nav>
</header>

<main id="main-content" role="main">
  <slot />
</main>

<footer class="site-footer" role="contentinfo">
  <div class="footer-content">
    <p>Powered by <a href="https://aitema.de">aitema|Termin</a></p>
    <nav aria-label="Footer-Navigation">
      <a href="/impressum">Impressum</a>
      <a href="/datenschutz">Datenschutz</a>
      <a href="/barrierefreiheit">Barrierefreiheit</a>
    </nav>
  </div>
</footer>
