<script lang="ts">
  // Buchen layout: provide page container
</script>

<div class="page-container">
  <slot />
</div>

<style>
  .page-container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
  }
  @media (max-width: 768px) {
    .page-container { padding: 1.25rem 1rem 3rem; }
  }
</style>
