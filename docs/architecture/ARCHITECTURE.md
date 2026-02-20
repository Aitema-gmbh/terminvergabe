# aitema|Termin – Technische Architektur

## Übersicht

aitema|Termin ist eine SvelteKit-basierte Terminvergabe-Plattform mit asynchroner Buchungsverarbeitung über eine Redis-Queue.

## System-Architektur

```mermaid
graph TB
    subgraph Öffentlicher Zugang
        CIT[Bürger/Browser]
        ADMIN[Administrator]
    end
    
    subgraph Reverse Proxy
        T[Traefik<br/>SSL/TLS<br/>Rate Limiting]
    end
    
    subgraph SvelteKit App
        SSR[SvelteKit SSR<br/>+page.server.ts]
        FORM[Form Actions<br/>Buchungslogik]
        API[API Endpunkte<br/>/api/*]
    end
    
    subgraph Queue-System
        REDIS[(Redis<br/>Bull Queue<br/>:6379)]
        WORKER[Worker Process<br/>Benachrichtigungen]
    end
    
    subgraph Datenbank
        PG[(PostgreSQL 15<br/>via Supabase<br/>:5432)]
    end
    
    subgraph Benachrichtigungen
        SMTP[SMTP / Resend<br/>E-Mail]
    end
    
    CIT --> T --> SSR
    ADMIN --> T --> API
    SSR --> FORM
    FORM --> PG
    FORM --> REDIS
    API --> PG
    REDIS --> WORKER
    WORKER --> SMTP
```

## Buchungs-Ablauf

```mermaid
sequenceDiagram
    participant B as Bürger
    participant FE as SvelteKit Frontend
    participant DB as PostgreSQL
    participant Q as Redis Queue
    participant W as Worker
    participant MAIL as E-Mail (SMTP)
    
    B->>FE: Termin auswählen
    FE->>DB: Verfügbarkeit prüfen (SELECT ... FOR UPDATE)
    DB->>FE: Slot verfügbar
    B->>FE: Buchungsformular absenden
    FE->>DB: Buchung reservieren (Status: PENDING)
    FE->>Q: Job in Queue einreihen
    FE->>B: Bestätigungsseite anzeigen
    
    Note over Q,W: Asynchrone Verarbeitung
    W->>Q: Job abholen
    W->>DB: Status auf CONFIRMED setzen
    W->>MAIL: Bestätigungs-E-Mail senden
    MAIL->>B: E-Mail mit Termindetails
```

## Kalender-Slot-Verwaltung

```mermaid
graph TD
    ADMIN[Administrator] --> CREATE[Zeitslots definieren<br/>Öffnungszeiten]
    CREATE --> SLOTS[(Slots in PostgreSQL<br/>available / booked)]
    SLOTS --> CAL[Kalenderansicht<br/>SvelteKit SSR]
    SLOTS --> API_CHECK[API: Verfügbarkeits-<br/>prüfung]
    API_CHECK --> LOCK[Optimistic Locking<br/>SELECT FOR UPDATE]
    LOCK --> BOOK[Buchung erstellen]
    BOOK --> SLOTS
```

## Komponenten

### SvelteKit App
- **Framework**: SvelteKit mit TypeScript
- **Rendering**: SSR + Form Actions (kein separates Backend nötig)
- **Styling**: Tailwind CSS + aitema Design System
- **Kalender**: Native Datepicker + eigene Slot-Logik
- **Validierung**: Zod (server-seitig in Form Actions)
- **Authentifizierung**: Supabase Auth (Admins)

### Queue-System (Redis + Bull)
- **Redis 7**: Datenhaltung für Job-Queue
- **BullMQ**: Job-Queue-Management
- **Worker**: Separater Node.js-Prozess für E-Mail-Versand
- **Retry**: Automatische Wiederholung bei Fehlern (3x)
- **Dead-Letter**: Fehlgeschlagene Jobs werden protokolliert

### Datenbank (PostgreSQL / Supabase)
- **PostgreSQL 15**: Optimistic Locking für Slot-Buchungen
- **Prisma ORM**: Type-safe Datenbankzugriff
- **Row Level Security**: Bürger sehen nur eigene Buchungen
- **Transaktionen**: Atomare Buchungsvorgänge

## Deployment

```mermaid
graph LR
    GH[GitHub<br/>Aitema-gmbh/terminvergabe]
    GHCR[GitHub Container Registry<br/>ghcr.io/aitema-gmbh]
    SERVER[Hetzner Server<br/>Docker Compose]
    
    GH -->|git push main| GH
    GH -->|GitHub Actions<br/>Build + Test + Push| GHCR
    GHCR -->|Pull & Deploy| SERVER
    SERVER -->|2 Container| APP[SvelteKit App<br/>+ Worker]
```

## Technologie-Stack

| Layer | Technologie | Version |
|-------|-------------|---------|
| Framework | SvelteKit | 2.x |
| Sprache | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.4.x |
| Datenbank | Supabase (PostgreSQL) | 15.x |
| ORM | Prisma | 5.x |
| Queue | Redis + BullMQ | 7.x / 5.x |
| E-Mail | Resend / SMTP | – |
| Container | Docker | 24.x |
