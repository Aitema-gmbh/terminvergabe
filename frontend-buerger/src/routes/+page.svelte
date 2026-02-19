<script lang="ts">
  import { t } from "$lib/i18n/index.js";
</script>

<svelte:head>
  <title>aitema|Termin - {t("app.title")}</title>
  <meta name="description" content="Kommunales Terminvergabe- und Besuchersteuerungssystem" />
</svelte:head>

<main class="landing">
  <header class="hero">
    <div class="hero-content">
      <h1 class="logo">aitema<span class="accent">|</span>Termin</h1>
      <p class="tagline">{t("app.subtitle")}</p>
    </div>
  </header>

  <section class="info" aria-label="Information">
    <p>Bitte waehlen Sie Ihre Kommune, um einen Termin zu buchen oder den aktuellen Wartestatus einzusehen.</p>
    <div class="search-box">
      <label for="tenant-search" class="visually-hidden">Kommune suchen</label>
      <input
        id="tenant-search"
        type="search"
        placeholder="Kommune oder Stadt eingeben..."
        aria-label="Kommune suchen"
      />
    </div>
  </section>

  <section class="features" aria-label="Funktionen">
    <div class="feature-card">
      <div class="feature-icon" aria-hidden="true">📅</div>
      <h2>Online Termin buchen</h2>
      <p>Buchen Sie bequem von zu Hause einen Termin bei Ihrer Kommune.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon" aria-hidden="true">⏱</div>
      <h2>Wartezeit einsehen</h2>
      <p>Sehen Sie die aktuelle Wartezeit in Echtzeit ein.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon" aria-hidden="true">🔔</div>
      <h2>Erinnerung erhalten</h2>
      <p>Erhalten Sie rechtzeitig eine Erinnerung per E-Mail.</p>
    </div>
  </section>
</main>

<style>
  .landing {
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .hero {
    background: linear-gradient(135deg, #003366 0%, #004d99 100%);
    color: white;
    padding: 4rem 2rem;
    text-align: center;
  }

  .logo {
    font-size: 3rem;
    font-weight: 700;
    margin: 0;
  }

  .accent {
    color: #ff9900;
  }

  .tagline {
    font-size: 1.25rem;
    opacity: 0.9;
    margin-top: 0.5rem;
  }

  .info {
    max-width: 600px;
    margin: 2rem auto;
    padding: 0 1rem;
    text-align: center;
  }

  .search-box input {
    width: 100%;
    max-width: 400px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: 2px solid #ccc;
    border-radius: 8px;
    outline: none;
    transition: border-color 0.2s;
  }

  .search-box input:focus {
    border-color: #003366;
    box-shadow: 0 0 0 3px rgba(0, 51, 102, 0.2);
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    max-width: 900px;
    margin: 3rem auto;
    padding: 0 1rem;
  }

  .feature-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    transition: box-shadow 0.2s;
  }

  .feature-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .feature-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }

  .feature-card h2 {
    font-size: 1.125rem;
    margin: 0 0 0.5rem;
    color: #003366;
  }

  .feature-card p {
    color: #555;
    margin: 0;
    line-height: 1.5;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
