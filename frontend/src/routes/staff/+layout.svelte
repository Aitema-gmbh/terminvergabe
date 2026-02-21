<script lang="ts">
  import { page } from '$app/stores';
  $: currentPath = $page.url.pathname;
</script>

<div class="staff-layout">
  <!-- Sidebar -->
  <aside class="staff-sidebar" aria-label="Mitarbeiter-Navigation">
    <div class="sidebar-brand">
      <svg width="20" height="20" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect width="28" height="28" rx="7" fill="#3b82f6"/>
        <rect x="7" y="7" width="14" height="2" rx="1" fill="white"/>
        <rect x="7" y="11" width="10" height="2" rx="1" fill="white"/>
        <rect x="7" y="15" width="12" height="2" rx="1" fill="white"/>
        <rect x="7" y="19" width="8" height="2" rx="1" fill="white"/>
      </svg>
      <span class="sidebar-brand-text">aitema<span class="brand-pipe">|</span>Staff</span>
    </div>

    <nav aria-label="Hauptmenü">
      <ul class="sidebar-nav-list">
        <li>
          <a href="/staff"
             class="sidebar-link"
             class:sidebar-link-active={currentPath === '/staff'}
             aria-current={currentPath === '/staff' ? 'page' : undefined}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
              <rect x="10" y="1" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
              <rect x="1" y="10" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
              <rect x="10" y="10" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            Dashboard
          </a>
        </li>
        <li>
          <a href="/staff/statistik"
             class="sidebar-link"
             class:sidebar-link-active={currentPath.startsWith('/staff/statistik')}
             aria-current={currentPath.startsWith('/staff/statistik') ? 'page' : undefined}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M4 12l3-4 3 2 4-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Statistiken
          </a>
        </li>
        <li>
          <a href="/staff/einstellungen"
             class="sidebar-link"
             class:sidebar-link-active={currentPath.startsWith('/staff/einstellungen')}
             aria-current={currentPath.startsWith('/staff/einstellungen') ? 'page' : undefined}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.41 1.41M13.37 13.37l1.41 1.41M3.22 14.78l1.41-1.41M13.37 4.63l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Einstellungen
          </a>
        </li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-footer-info">
        <div class="staff-avatar" aria-hidden="true">M</div>
        <div>
          <p class="staff-name">Mitarbeiter</p>
          <p class="staff-role">Admin</p>
        </div>
      </div>
      <a href="/staff/login" class="sidebar-logout" aria-label="Abmelden">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l4-3.5L10 4M14 7.5H6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    </div>
  </aside>

  <!-- Main content area -->
  <div class="staff-main">
    <slot />
  </div>
</div>

<style>
  .staff-layout {
    display: flex;
    min-height: 100vh;
    background: var(--aitema-slate-50);
  }

  /* Sidebar */
  .staff-sidebar {
    width: 240px;
    background: var(--aitema-navy);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 1.25rem 1.25rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    margin-bottom: 0.75rem;
  }
  .sidebar-brand-text {
    font-size: 1rem;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.025em;
  }
  .brand-pipe { color: #3b82f6; }

  .sidebar-nav-list {
    list-style: none;
    padding: 0.25rem 0.75rem;
    margin: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  .sidebar-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    border-radius: 0.5rem;
    color: rgba(255,255,255,0.65);
    text-decoration: none;
    font-size: 0.9375rem;
    font-weight: 500;
    transition: all 150ms ease;
    min-height: 44px;
  }
  .sidebar-link:hover { color: #fff; background: rgba(255,255,255,0.08); }
  .sidebar-link-active {
    color: #fff;
    background: rgba(59,130,246,0.2);
    font-weight: 600;
  }
  .sidebar-link-active svg { color: #60a5fa; }

  .sidebar-footer {
    margin-top: auto;
    padding: 1rem;
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .sidebar-footer-info {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex: 1;
    min-width: 0;
  }
  .staff-avatar {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #1e40af);
    color: #fff; font-size: 0.875rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .staff-name {
    font-size: 0.8125rem; font-weight: 600; color: #fff;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin: 0;
  }
  .staff-role { font-size: 0.6875rem; color: rgba(255,255,255,0.5); margin: 0; }
  .sidebar-logout {
    color: rgba(255,255,255,0.4); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 0.375rem;
    transition: all 150ms ease;
  }
  .sidebar-logout:hover { color: #fff; background: rgba(255,255,255,0.1); }

  .staff-main {
    flex: 1;
    min-width: 0;
    overflow-x: auto;
  }

  /* Responsive */
  @media (max-width: 900px) {
    .staff-sidebar {
      width: 200px;
    }
  }
  @media (max-width: 700px) {
    .staff-layout { flex-direction: column; }
    .staff-sidebar {
      width: 100%;
      height: auto;
      position: static;
      flex-direction: row;
      align-items: center;
      padding: 0.5rem;
    }
    .sidebar-brand { padding: 0.5rem; border-bottom: none; margin-bottom: 0; }
    .sidebar-brand-text { display: none; }
    nav { flex: 1; }
    .sidebar-nav-list { flex-direction: row; padding: 0; gap: 0; }
    .sidebar-link { padding: 0.5rem 0.75rem; font-size: 0.8125rem; min-height: 40px; }
    .sidebar-footer { display: none; }
  }
</style>
