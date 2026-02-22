<script lang="ts">
  import { page } from "$app/stores";
  import { t } from "$lib/i18n/index.js";

  const tenant = $page.params.tenant;

  // Icon/color arrays for service cards
  const serviceIcons = ['📋', '🪪', '🚗', '🏠', '📜', '🏛️', '👶', '💍'];
  const serviceColors = ['#dbeafe', '#d1fae5', '#fef3c7', '#fce7f3', '#ede9fe', '#fee2e2', '#ccfbf1', '#fef9c3'];
</script>

<svelte:head>
  <title>{t("nav.services")} - aitema|Termin</title>
</svelte:head>

<!-- Hero Section -->
<div class="aitema-gradient-hero" style="padding:3rem 0 4rem;">
  <div class="aitema-container">
    <div style="display:flex;align-items:center;gap:0.875rem;margin-bottom:1rem;">
      <div style="width:2.5rem;height:2.5rem;background:rgba(255,255,255,0.1);border-radius:0.625rem;border:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="white" aria-hidden="true"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
      </div>
      <span class="aitema-badge aitema-badge-blue" style="background:rgba(59,130,246,0.2);color:#93c5fd;">{tenant}</span>
    </div>
    <h1 style="font-size:2rem;font-weight:800;color:white;margin-bottom:0.5rem;letter-spacing:-0.02em;">
      {t("nav.services")}
    </h1>
    <p style="color:rgba(255,255,255,0.7);font-size:1.0625rem;max-width:36rem;">
      Alle verfuegbaren Verwaltungsdienstleistungen auf einen Blick. Waehlen Sie einen Dienst, um direkt einen Termin zu buchen.
    </p>
  </div>
</div>

<!-- Services Grid -->
<div class="aitema-container" style="padding-top:2.5rem;padding-bottom:3rem;">

  <!-- Placeholder content — replace with real data fetch when API is connected -->
  <div class="aitema-grid-2" style="gap:1rem;">

    {#each serviceIcons as icon, i}
      <div class="aitema-card" style="padding:1.5rem;display:flex;flex-direction:column;gap:0.875rem;">
        <!-- Icon Circle -->
        <div style="width:3rem;height:3rem;border-radius:var(--radius-md);background:{serviceColors[i % serviceColors.length]};display:flex;align-items:center;justify-content:center;font-size:1.375rem;" aria-hidden="true">
          {icon}
        </div>

        <!-- Content -->
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;margin-bottom:0.375rem;">
            <h3 style="font-size:1rem;font-weight:700;color:var(--aitema-navy);">Dienstleistung {i + 1}</h3>
            <span class="aitema-badge aitema-badge-slate">
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" style="margin-right:0.25rem;" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
              30 Min.
            </span>
          </div>
          <p style="font-size:0.8125rem;color:var(--aitema-muted);line-height:1.5;">
            Beschreibung der Dienstleistung. Bringen Sie bitte alle notwendigen Unterlagen mit.
          </p>
        </div>

        <!-- CTA Button -->
        <div>
          <a href="/{tenant}/book" class="aitema-btn aitema-btn-primary" style="width:100%;justify-content:center;">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
            Termin buchen
          </a>
        </div>
      </div>
    {/each}

  </div>

  <!-- Info Banner -->
  <div class="aitema-alert aitema-alert-info" style="margin-top:2rem;">
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style="flex-shrink:0;margin-top:1px;" aria-hidden="true">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
    </svg>
    <p>
      <strong>Hinweis:</strong> Bitte erscheinen Sie puenktlich zu Ihrem Termin und bringen Sie alle erforderlichen Unterlagen mit.
      Bei Verhinderung stornieren Sie Ihren Termin bitte rechtzeitig.
    </p>
  </div>

</div>
