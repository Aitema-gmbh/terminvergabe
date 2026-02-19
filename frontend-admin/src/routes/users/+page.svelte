<script lang="ts">
  let items = $state<any[]>([]);
  let loading = $state(true);

  const labels: Record<string, string> = {
    tenants: "Mandanten",
    services: "Dienstleistungen",
    locations: "Standorte",
    users: "Benutzer",
  };

  const label = labels["users"] || "users";
</script>

<svelte:head>
  <title>{label} - aitema|Termin Admin</title>
</svelte:head>

<main class="admin-page">
  <header class="page-header">
    <h1>{label}</h1>
    <button class="btn-add">+ Neu anlegen</button>
  </header>

  {#if loading}
    <p class="loading">Laden...</p>
  {:else if items.length === 0}
    <p class="empty">Keine {label} vorhanden.</p>
  {:else}
    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
        {#each items as item}
          <tr>
            <td>{item.name}</td>
            <td>{item.active ? "Aktiv" : "Inaktiv"}</td>
            <td>
              <button class="btn-edit">Bearbeiten</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</main>

<style>
  .admin-page { max-width: 1000px; margin: 0 auto; padding: 1rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  .page-header h1 { margin: 0; color: #003366; }
  .btn-add { padding: 0.5rem 1rem; background: #003366; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
  .btn-add:hover { background: #004d99; }
  .loading, .empty { text-align: center; padding: 3rem; color: #999; background: #f5f5f5; border-radius: 8px; }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
  .data-table th { background: #f5f5f5; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
  .btn-edit { padding: 0.25rem 0.75rem; background: white; border: 1px solid #003366; color: #003366; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
  .btn-edit:hover { background: #f0f4f8; }
</style>
