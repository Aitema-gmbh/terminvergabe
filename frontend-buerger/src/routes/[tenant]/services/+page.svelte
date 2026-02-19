<script lang="ts">
  import { page } from "$app/stores";
  import { t } from "$lib/i18n/index.js";

  const tenant = $page.params.tenant;
</script>

<svelte:head>
  <title>{t("nav.services")} - aitema|Termin</title>
</svelte:head>

<main class="services-page">
  <h1>{t("nav.services")}</h1>
  <p>Hier finden Sie alle verfuegbaren Dienstleistungen bei <strong>{tenant}</strong>.</p>

  <div class="service-list" role="list">
    <p class="placeholder">Dienstleistungskatalog wird geladen...</p>
  </div>
</main>

<style>
  .services-page {
    max-width: 700px;
    margin: 0 auto;
    padding: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  h1 { color: #003366; }

  .placeholder {
    text-align: center;
    padding: 2rem;
    color: #999;
    background: #f5f5f5;
    border-radius: 8px;
  }
</style>
