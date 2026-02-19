# aitema|Termin

Kommunales Terminvergabe- und Besuchersteuerungssystem.

## Architektur

- **Backend**: Node.js 22 / TypeScript / Fastify / Prisma / BullMQ
- **Frontend Buerger**: SvelteKit PWA (WCAG 2.1 AA, i18n: DE/EN/TR/AR/UK)
- **Frontend Mitarbeiter**: SvelteKit (Echtzeit-Warteschlange)
- **Frontend Admin**: SvelteKit (Mandanten-/Dienstverwaltung)
- **Datenbank**: PostgreSQL 16 (Multi-Tenant)
- **Cache/Queue**: Redis 7 (Cache, PubSub, BullMQ)
- **Auth**: Keycloak (BundID-kompatibel)
- **Hardware**: Raspberry Pi (Aufrufanzeige + Thermodrucker)

## Quickstart

```bash
# Voraussetzungen: Docker, Docker Compose, Make

# 1. Projekt klonen und starten
cp .env.example .env
make dev

# 2. Datenbank migrieren
make migrate

# 3. Demo-Daten laden
make seed
```

## Services (Development)

| Service          | URL                          |
|------------------|------------------------------|
| Backend API      | http://localhost:3000         |
| API Docs         | http://localhost:3000/docs    |
| Buerger-PWA      | http://localhost:5173         |
| Mitarbeiter-SPA  | http://localhost:5174         |
| Admin-Panel      | http://localhost:5175         |
| Keycloak         | http://localhost:8180         |
| Mailpit          | http://localhost:8025         |

## Projektstruktur

```
terminvergabe/
├── backend/              # Fastify API Server
│   ├── prisma/           # Datenmodell & Migrationen
│   └── src/
│       ├── modules/      # Feature-Module
│       │   ├── booking/  # Terminbuchung
│       │   ├── queue/    # Warteschlange
│       │   ├── display/  # Aufrufanlage
│       │   ├── admin/    # Verwaltung
│       │   ├── auth/     # Keycloak-Auth
│       │   └── notification/ # E-Mail/SMS
│       ├── middleware/    # Tenant, Auth, RateLimit
│       └── lib/          # Slot-Generator
├── frontend-buerger/     # SvelteKit PWA
├── frontend-mitarbeiter/ # SvelteKit Mitarbeiter
├── frontend-admin/       # SvelteKit Admin
├── hardware/             # Raspberry Pi
│   ├── kiosk/            # Aufrufanzeige
│   └── printer/          # Thermodrucker
├── tests/                # Unit & E2E Tests
└── docs/                 # API-Dokumentation
```

## Lizenz

EUPL-1.2 - European Union Public Licence
