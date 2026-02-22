
<script lang="ts">
  import '../app.css';
</script>

<div class="min-h-screen flex flex-col">
  <header class="sticky top-0 z-40 w-full border-b border-border-color bg-secondary/70 backdrop-blur-xl">
    <div class="container flex items-center justify-between h-header-height">
      <a href="/" class="flex items-center gap-2" aria-label="Startseite">
        <span class="font-bold text-xl text-primary">aitema|Termin</span>
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
