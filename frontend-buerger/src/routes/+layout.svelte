<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
</script>

<div style="min-height:100vh;display:flex;flex-direction:column;">

  <!-- Sticky Header -->
  <header class="aitema-gradient-hero" style="position:sticky;top:0;z-index:40;box-shadow:0 2px 16px rgba(0,0,0,0.25);">
    <div class="aitema-container" style="display:flex;align-items:center;justify-content:space-between;height:4rem;">

      <!-- Logo -->
      <a href="/" style="display:flex;align-items:center;gap:0.75rem;text-decoration:none;" aria-label="aitema Termin Startseite">
        <div style="width:2rem;height:2rem;background:rgba(255,255,255,0.1);border-radius:0.5rem;border:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="4" y="4" width="20" height="3" rx="1.5" fill="white"/>
            <rect x="4" y="9" width="14" height="3" rx="1.5" fill="white"/>
            <rect x="4" y="14" width="17" height="3" rx="1.5" fill="white"/>
            <rect x="4" y="19" width="11" height="3" rx="1.5" fill="white"/>
          </svg>
        </div>
        <span style="font-size:1.125rem;font-weight:700;color:white;letter-spacing:-0.01em;">
          aitema<span style="color:#3b82f6;">|</span>Termin
        </span>
      </a>

      <!-- Nav -->
      <nav style="display:flex;align-items:center;gap:0.5rem;">
        <a href="/" style="color:rgba(255,255,255,0.8);font-size:0.875rem;padding:0.375rem 0.75rem;border-radius:0.375rem;text-decoration:none;">
          Startseite
        </a>
      </nav>

    </div>
  </header>

  <!-- Main Content -->
  <main id="main-content" style="flex:1;width:100%;">
    <slot />
  </main>

  <!-- Footer -->
  <footer style="background:var(--aitema-navy);color:rgba(255,255,255,0.7);">
    <div class="aitema-container" style="padding:2rem 1.25rem;display:flex;flex-direction:column;align-items:center;gap:1rem;">
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <span style="font-size:0.9375rem;font-weight:600;color:white;">aitema<span style="color:#3b82f6;">|</span>Termin</span>
        <span style="color:rgba(255,255,255,0.3);">&mdash;</span>
        <span style="font-size:0.8125rem;">Digitale Terminvergabe fuer Buerger</span>
      </div>
      <div style="display:flex;gap:1.5rem;align-items:center;">
        <span style="font-size:0.75rem;">&copy; {new Date().getFullYear()} aitema GovTech</span>
        <a href="/impressum" style="font-size:0.75rem;color:rgba(255,255,255,0.6);text-decoration:none;">Impressum</a>
        <a href="/datenschutz" style="font-size:0.75rem;color:rgba(255,255,255,0.6);text-decoration:none;">Datenschutz</a>
      </div>
    </div>
  </footer>

</div>
