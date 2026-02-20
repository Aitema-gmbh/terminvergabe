# aitema|Terminvergabe – Architektur-Übersicht

## System-Übersicht

```
┌─────────────────────────────────────────────────────────┐
│               aitema|Terminvergabe                       │
│                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  SvelteKit  │───▶│  Supabase   │───▶│ PostgreSQL  │  │
│  │  Frontend   │    │   Backend   │    │  (managed)  │  │
│  │  (SSR/SPA)  │    │  (REST+RLS) │    │             │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                  │                             │
│         │           ┌──────┴──────┐                      │
│         │           │  Edge Funcs │                      │
│         │           │ (Deno/TS)   │                      │
│         └───────────┴─────────────┘                      │
│              Cloudflare Pages / Vercel                   │
│              (Edge Deployment, global CDN)               │
└─────────────────────────────────────────────────────────┘
```

## Komponenten

### Frontend (SvelteKit)
- **Framework:** SvelteKit mit TypeScript
- **Rendering:** SSR für initiales Laden, dann SPA-Navigation
- **UI-Library:** Tailwind CSS + aitema Design-System
- **Barrierefreiheit:** WCAG 2.1 AA konform (Pflicht für öffentliche Stellen)
- **Performance:** Minimales Bundle, schnelle Ladezeiten auch auf mobilen Geräten

### Backend (Supabase)
- **Plattform:** Supabase (Open Source Firebase-Alternative)
- **API:** PostgREST REST API + Supabase Realtime
- **Edge Functions:** Deno-basierte Serverless Functions für komplexe Buchungslogik
- **Auth:** Supabase Auth (optional: Konto für Bürger, anonym buchbar)
- **Benachrichtigungen:** E-Mail-Bestätigungen via Supabase Edge Functions + Resend

### Datenbank (PostgreSQL via Supabase)
- **Version:** PostgreSQL 15+
- **Sicherheit:** Row-Level Security für Behörden-Mandantentrennung
- **Scheduling:** PostgreSQL-native Zeitslot-Verwaltung mit Konflikterkennung
- **Backup:** Tägliche automatische Backups, Point-in-Time Recovery

## Deployment

```bash
# Umgebungsvariablen
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
RESEND_API_KEY=re_xxx...

# Build und Deployment
npm install
npm run build
# Automatisches Deployment via GitHub Actions → Cloudflare Pages
```

## Buchungs-Workflow

```
Bürger wählt Dienstleistung
        │
        ▼
Verfügbare Zeitslots laden (RLS-gefiltert je Behörde)
        │
        ▼
Zeitslot reservieren (pessimistisches Locking via DB-Transaktion)
        │
        ▼
Bürger-Daten eingeben (Datensparsamkeit: nur Notwendiges)
        │
        ▼
Bestätigung → E-Mail mit Kalender-ICS + Buchungs-ID
        │
        ▼
Behörden-Dashboard zeigt gebuchte Termine
```

## Datenschutz-Architektur

1. **Datensparsamkeit:** Nur zwingend notwendige Daten werden erhoben
2. **Automatische Löschung:** Termindaten werden nach konfigurierbarer Frist gelöscht
3. **Mandantentrennung:** Behörden sehen nur ihre eigenen Buchungen (RLS)
4. **Keine Tracking-Cookies:** Kein Google Analytics, keine Drittanbieter-Skripte
5. **Barrierefreier Zugang:** Keine Pflichtregistrierung für Bürger
6. **Self-hosted:** Supabase kann vollständig selbst gehostet werden

## Rechtliche Grundlagen

- **OZG** (Onlinezugangsgesetz) – konforme Online-Dienstleistung
- **DSGVO** Art. 5 – Datensparsamkeit und Zweckbindung
- **BITV 2.0** – Barrierefreie Informationstechnik-Verordnung
- **eIDAS** – vorbereitet für zukünftige eID-Integration

## Lizenz

AGPL-3.0-or-later – Open Source, kommunal einsetzbar
