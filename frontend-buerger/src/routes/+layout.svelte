
<script lang="ts">
  import '../app.css';
</script>

<div class="min-h-screen flex flex-col">
  <header class="sticky top-0 z-40 w-full border-b border-border-color bg-secondary/70 backdrop-blur-xl">
    <div class="container flex items-center justify-between h-header-height">
      <a href="/" class="flex items-center gap-2" aria-label="Startseite">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent-primary">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span class="font-bold text-xl text-primary">aitema GovTech</span>
      </a>
      <nav>
        <!-- Navigation links can be added here -->
      </nav>
    </div>
  </header>

  <main id="main-content" class="flex-1 w-full">
    <slot />
  </main>

  <footer class="bg-secondary border-t border-border-color">
    <div class="container py-8 text-center text-secondary">
      <p class="text-sm">
        &copy; {new Date().getFullYear()} aitema. Alle Rechte vorbehalten.
      </p>
      <div class="flex justify-center gap-4 mt-4">
        <a href="/impressum" class="text-sm hover:text-primary transition-colors">Impressum</a>
        <a href="/datenschutz" class="text-sm hover:text-primary transition-colors">Datenschutz</a>
      </div>
    </div>
  </footer>
</div>
