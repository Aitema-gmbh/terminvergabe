<svelte:head>
  <title>aitema|Termin – Digitale Terminvergabe</title>
  <meta name="description" content="Open-Source Terminverwaltung für Bürgerämter. DSGVO-konform, barrierefrei, MIT-lizenziert." />
</svelte:head>

<!-- Hero -->
<section style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:4rem 1.5rem;">
  <div style="max-width:1100px; margin:0 auto;">
    <p style="font-size:0.75rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:#64748b; margin:0 0 1.5rem 0;">
      Terminverwaltung — Open Source
    </p>
    <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:4rem; align-items:center;">
      <div>
        <h1 style="font-size:2.75rem; font-weight:800; color:#0f172a; line-height:1.15; letter-spacing:-0.03em; margin:0 0 1rem 0;">
          Online-Terminvergabe<br>für Behörden
        </h1>
        <p style="font-size:1.1rem; color:#475569; line-height:1.6; margin:0 0 2rem 0; max-width:480px;">
          Offenes System für Bürgerämter, Ausländerbehörden und Zulassungsstellen.
          DSGVO-konform, barrierefrei nach BITV 2.0, MIT-lizenziert.
        </p>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:2rem;">
          <span style="font-size:0.75rem; color:#64748b; border:1px solid #e2e8f0; padding:0.2rem 0.6rem; border-radius:4px; font-family:monospace;">DSGVO-konform</span>
          <span style="font-size:0.75rem; color:#64748b; border:1px solid #e2e8f0; padding:0.2rem 0.6rem; border-radius:4px; font-family:monospace;">BITV 2.0 AA</span>
          <span style="font-size:0.75rem; color:#059669; border:1px solid #059669; padding:0.2rem 0.6rem; border-radius:4px; font-family:monospace;">&lt;/&gt; MIT-Lizenz</span>
        </div>
        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
          <a href="/buchen" style="display:inline-block; background:#1e3a5f; color:white; padding:0.75rem 1.5rem; border-radius:6px; font-weight:600; font-size:0.95rem; text-decoration:none;">
            Termin buchen →
          </a>
          <a href="/wartenummer" style="display:inline-block; background:white; color:#0f172a; border:1px solid #cbd5e1; padding:0.75rem 1.5rem; border-radius:6px; font-weight:500; font-size:0.95rem; text-decoration:none;">
            Wartenummer ziehen
          </a>
        </div>
      </div>
      <div style="display:flex; justify-content:center;">
        <img src="/hero-animation.svg" alt="Terminbuchungs-Prozess" style="width:100%; max-width:440px; height:auto;" />
      </div>
    </div>
  </div>
</section>

<!-- Explainer -->
<section style="background:white; padding:4rem 1.5rem; border-bottom:1px solid #e2e8f0;">
  <div style="max-width:1100px; margin:0 auto;">
    <p style="font-size:0.75rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:#64748b; text-align:center; margin:0 0 0.75rem 0;">So funktioniert es</p>
    <h2 style="font-size:1.75rem; font-weight:800; color:#0f172a; text-align:center; letter-spacing:-0.02em; margin:0 0 3rem 0;">In 3 Schritten zum Termin</h2>
    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1.5rem;">
      <div style="border:1px solid #e2e8f0; border-radius:8px; padding:1.75rem;">
        <div style="font-size:0.7rem; font-weight:700; color:#3b82f6; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:0.75rem;">01</div>
        <h3 style="font-size:1rem; font-weight:700; color:#0f172a; margin:0 0 0.5rem 0;">Standort wählen</h3>
        <p style="font-size:0.875rem; color:#64748b; line-height:1.5; margin:0;">Wählen Sie Ihr zuständiges Amt in Ihrer Nähe aus.</p>
      </div>
      <div style="border:1px solid #e2e8f0; border-radius:8px; padding:1.75rem;">
        <div style="font-size:0.7rem; font-weight:700; color:#3b82f6; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:0.75rem;">02</div>
        <h3 style="font-size:1rem; font-weight:700; color:#0f172a; margin:0 0 0.5rem 0;">Termin buchen</h3>
        <p style="font-size:0.875rem; color:#64748b; line-height:1.5; margin:0;">Dienstleistung, Datum und freie Uhrzeit online auswählen.</p>
      </div>
      <div style="border:1px solid #e2e8f0; border-radius:8px; padding:1.75rem;">
        <div style="font-size:0.7rem; font-weight:700; color:#059669; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:0.75rem;">03</div>
        <h3 style="font-size:1rem; font-weight:700; color:#0f172a; margin:0 0 0.5rem 0;">Bestätigung erhalten</h3>
        <p style="font-size:0.875rem; color:#64748b; line-height:1.5; margin:0;">Sofortige E-Mail-Bestätigung mit QR-Code für den Termin.</p>
      </div>
    </div>
  </div>
</section>

<!-- Quick Links -->
<section style="background:#f8fafc; padding:3rem 1.5rem;">
  <div style="max-width:1100px; margin:0 auto; display:grid; grid-template-columns:2fr 1fr 1fr; gap:1rem;">
    <a href="/buchen" style="display:flex; align-items:center; gap:1rem; padding:1.5rem; background:#1e3a5f; color:white; border-radius:8px; text-decoration:none;">
      <div style="flex:1;">
        <div style="font-size:0.75rem; font-weight:600; opacity:0.7; margin-bottom:0.25rem;">ONLINE BUCHEN</div>
        <div style="font-size:1.1rem; font-weight:700;">Termin buchen →</div>
      </div>
    </a>
    <a href="/wartenummer" style="display:flex; align-items:center; gap:1rem; padding:1.5rem; background:white; border:1px solid #e2e8f0; border-radius:8px; text-decoration:none; color:#0f172a;">
      <div>
        <div style="font-size:0.75rem; font-weight:600; color:#64748b; margin-bottom:0.25rem;">WALK-IN</div>
        <div style="font-size:1rem; font-weight:700;">Wartenummer</div>
      </div>
    </a>
    <a href="/status" style="display:flex; align-items:center; gap:1rem; padding:1.5rem; background:white; border:1px solid #e2e8f0; border-radius:8px; text-decoration:none; color:#0f172a;">
      <div>
        <div style="font-size:0.75rem; font-weight:600; color:#64748b; margin-bottom:0.25rem;">MEIN TERMIN</div>
        <div style="font-size:1rem; font-weight:700;">Status prüfen</div>
      </div>
    </a>
  </div>
</section>
