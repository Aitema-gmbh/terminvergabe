<script lang="ts">
  import QueueBoard from "$lib/components/QueueBoard.svelte";
</script>

<svelte:head>
  <title>Warteschlange - aitema|Termin</title>
</svelte:head>

<main class="page">
  <QueueBoard
    tenantSlug="demo"
    locationId=""
    resourceId=""
    counterName="Schalter 1"
  />
</main>

<style>
  .page { max-width: 1200px; margin: 0 auto; }
</style>
