<script lang="ts">
  // Staff layout with admin navigation
</script>

<div class="staff-layout">
  <nav class="staff-nav" aria-label="Mitarbeiter-Navigation">
    <ul>
      <li><a href="/staff">Dashboard</a></li>
      <li><a href="/staff/termine">Termine</a></li>
      <li><a href="/staff/warteschlange">Warteschlange</a></li>
      <li><a href="/staff/statistik">Statistik</a></li>
      <li><a href="/staff/einstellungen">Einstellungen</a></li>
    </ul>
  </nav>
  <div class="staff-content">
    <slot />
  </div>
</div>

<style>
  .staff-layout { display: flex; min-height: calc(100vh - 200px); }
  
  .staff-nav {
    width: 220px; background: #fff; border-right: 1px solid #e5e7eb;
    padding: 1rem 0; flex-shrink: 0;
  }
  .staff-nav ul { list-style: none; }
  .staff-nav a {
    display: block; padding: 0.75rem 1.5rem; color: #374151;
    text-decoration: none; font-size: 0.875rem; min-height: 44px;
    display: flex; align-items: center;
  }
  .staff-nav a:hover { background: #f3f4f6; color: #111827; }
  .staff-nav a:focus-visible { outline: 2px solid #2563eb; outline-offset: -2px; }
  
  .staff-content { flex: 1; overflow-x: auto; }
  
  @media (max-width: 768px) {
    .staff-layout { flex-direction: column; }
    .staff-nav { width: 100%; border-right: none; border-bottom: 1px solid #e5e7eb; padding: 0; }
    .staff-nav ul { display: flex; overflow-x: auto; }
    .staff-nav a { white-space: nowrap; padding: 0.75rem 1rem; }
  }
</style>
