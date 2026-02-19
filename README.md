<div align="center">

# aitema|Termin

**Digitale Terminvergabe und Besuchersteuerung fuer deutsche Kommunen**

[![CI](https://github.com/aitema-gmbh/terminvergabe/actions/workflows/ci.yml/badge.svg)](https://github.com/aitema-gmbh/terminvergabe/actions/workflows/ci.yml)
[![License: EUPL-1.2](https://img.shields.io/badge/License-EUPL--1.2-blue.svg)](https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-339933.svg)](https://nodejs.org)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-FF3E00.svg)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org)

*Kommunales Terminvergabe- und Besuchersteuerungssystem.*
*Online-Buchung, Walk-in-Warteschlange und digitale Aufrufanlage in einer Loesung.*

[Schnellstart](#schnellstart) | [API-Dokumentation](#api-endpoints) | [Demo](https://demo.termin.aitema.de) | [Kontakt](#kontakt)

</div>

---

## Ueberblick

**aitema|Termin** ist ein vollstaendiges, quelloffenes Terminvergabe- und
Besuchersteuerungssystem fuer deutsche Kommunalverwaltungen. Es vereint
Online-Terminbuchung fuer Buerger, Echtzeit-Warteschlangenmanagement fuer
Mitarbeiter und eine digitale Aufrufanlage -- alles in einer modernen,
mandantenfaehigen Plattform.

### Warum aitema|Termin?

- **Alles aus einer Hand**: Buchung, Warteschlange und Aufrufanlage integriert
- **Open Source**: EUPL-1.2-Lizenz, kein Vendor Lock-in
- **Barrierefrei**: WCAG 2.1 AA, mehrsprachig (DE/EN/TR/AR/UK)
- **Hardware-Integration**: Kiosk-Aufrufanzeige und Thermodruck via Raspberry Pi
- **BundID-kompatibel**: Single Sign-On ueber Keycloak mit BundID-Anbindung

---

## Features

### Online-Terminbuchung (Buerger-PWA)
- Dienstleistungskatalog mit Kategorien und Suchfunktion
- Kalenderansicht mit freien Zeitslots
- Standort- und Sachbearbeiter-Auswahl
- Buchungsbestaetigung per E-Mail und SMS
- Termin-Erinnerung (24h vorher)
- Storno und Umbuchung durch Buerger
- Progressive Web App (offline-faehig, installierbar)
- Barrierefreiheit WCAG 2.1 AA
- Mehrsprachig: Deutsch, Englisch, Tuerkisch, Arabisch, Ukrainisch

### Walk-in-Warteschlange
- Spontanbesucher-Erfassung am Empfang
- Echtzeit-Warteschlangen-Anzeige
- Priorisierung nach Dienstleistung und Wartezeit
- Automatische Zuweisung an verfuegbare Sachbearbeiter
- Wartezeitprognose fuer Buerger

### Aufrufanlage
- Digitale Anzeige im Wartebereich (TV/Monitor)
- Akustisches Signal bei Aufruf
- Raum- und Schalternummer-Anzeige
- Raspberry-Pi-basiert (Kiosk-Modus)
- Mehrsprachige Anzeige

### Mitarbeiter-Oberflaeche
- Echtzeit-Warteschlangen-Dashboard
- Buerger aufrufen, zurueckstellen, weiterleiten
- Terminkalender mit Tages-/Wochenansicht
- Notizen und Statusverfolgung pro Besuch
- Pausenverwaltung und Abwesenheiten

### Admin-Panel
- Mandanten- und Standortverwaltung
- Dienstleistungskatalog konfigurieren
- Oeffnungszeiten und Slot-Konfiguration
- Sachbearbeiter-Zuordnung
- Statistiken und Auswertungen (Wartezeiten, Auslastung)
- E-Mail- und SMS-Vorlagen

### BundID-Integration
- Authentifizierung ueber Keycloak
- BundID/eID-Anbindung fuer verifizierte Termine
- Rollen: Buerger, Mitarbeiter, Admin, Superadmin

### Statistik und Reporting
- Durchschnittliche Wartezeiten pro Dienstleistung
- Auslastung pro Standort und Zeitraum
- Stornoquoten und No-Show-Raten
- CSV-Export fuer Controlling

---

## Schnellstart

### Voraussetzungen

- Docker >= 24.0 und Docker Compose >= 2.20
- Git
- 4 GB RAM (Entwicklung), 8 GB RAM (Produktion)

### Installation

```bash
# Repository klonen
git clone https://github.com/aitema-gmbh/terminvergabe.git
cd terminvergabe

# Umgebungsvariablen konfigurieren
cp .env.example .env
# .env nach Bedarf anpassen

# Development-Umgebung starten
make dev

# Datenbank migrieren
make db-migrate

# Demo-Daten laden
make db-seed
```

### Services (Development)

| Service            | URL                          | Beschreibung                   |
|--------------------|------------------------------|--------------------------------|
| Backend API        | http://localhost:3000         | Fastify API Server             |
| API Docs           | http://localhost:3000/docs    | Swagger / OpenAPI              |
| Buerger-PWA        | http://localhost:5173         | Online-Terminbuchung           |
| Mitarbeiter-SPA    | http://localhost:5174         | Warteschlangen-Dashboard       |
| Admin-Panel        | http://localhost:5175         | Verwaltungsoberflaeche         |
| Keycloak           | http://localhost:8180         | Identity Provider              |
| Mailpit            | http://localhost:8025         | E-Mail-Testing (Dev)           |

---

## API Endpoints

### Buchung

| Methode | Endpoint                              | Beschreibung                    |
|---------|---------------------------------------|---------------------------------|
| GET     | `/api/v1/services`                    | Dienstleistungskatalog          |
| GET     | `/api/v1/locations`                   | Standorte und Oeffnungszeiten   |
| GET     | `/api/v1/slots`                       | Verfuegbare Zeitslots           |
| POST    | `/api/v1/bookings`                    | Termin buchen                   |
| GET     | `/api/v1/bookings/:id`                | Buchungsdetails                 |
| PATCH   | `/api/v1/bookings/:id`                | Termin umbuchen                 |
| DELETE  | `/api/v1/bookings/:id`                | Termin stornieren               |
| POST    | `/api/v1/bookings/:id/confirm`        | Buchung bestaetigen             |

### Warteschlange

| Methode | Endpoint                              | Beschreibung                    |
|---------|---------------------------------------|---------------------------------|
| GET     | `/api/v1/queue`                       | Aktuelle Warteschlange          |
| POST    | `/api/v1/queue/walkin`                | Walk-in-Buerger hinzufuegen     |
| POST    | `/api/v1/queue/:id/call`              | Buerger aufrufen                |
| POST    | `/api/v1/queue/:id/complete`          | Besuch abschliessen             |
| POST    | `/api/v1/queue/:id/transfer`          | An Kollegen weiterleiten        |
| POST    | `/api/v1/queue/:id/defer`             | Zurueckstellen                  |

### Aufrufanlage

| Methode | Endpoint                              | Beschreibung                    |
|---------|---------------------------------------|---------------------------------|
| GET     | `/api/v1/display/current`             | Aktueller Aufruf                |
| WS      | `/api/v1/display/ws`                  | WebSocket Echtzeit-Updates      |

### Administration

| Methode | Endpoint                              | Beschreibung                    |
|---------|---------------------------------------|---------------------------------|
| CRUD    | `/api/v1/admin/tenants`               | Mandantenverwaltung             |
| CRUD    | `/api/v1/admin/services`              | Dienstleistungsverwaltung       |
| CRUD    | `/api/v1/admin/locations`             | Standortverwaltung              |
| CRUD    | `/api/v1/admin/staff`                 | Sachbearbeiterverwaltung        |
| GET     | `/api/v1/admin/stats`                 | Statistiken und Reports         |

---

## Architektur

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    Reverse Proxy                        │
                    │                   (Caddy / Nginx)                       │
                    └───┬──────────┬──────────┬──────────┬──────────┬────────┘
                        │          │          │          │          │
             ┌──────────▼───┐ ┌────▼─────┐ ┌──▼───────┐ ┌▼────────┐ ┌▼────────┐
             │  Buerger-PWA │ │Mitarbeit.│ │  Admin   │ │ Fastify │ │Keycloak │
             │  SvelteKit   │ │SvelteKit │ │SvelteKit │ │ Backend │ │Auth/SSO │
             │  :5173       │ │  :5174   │ │  :5175   │ │  :3000  │ │  :8180  │
             └──────────────┘ └──────────┘ └──────────┘ └────┬────┘ └─────────┘
                                                             │
                                    ┌────────────────────────┼──────────────┐
                                    │                        │              │
                         ┌──────────▼────────┐   ┌───────────▼──────┐  ┌───▼────────┐
                         │   PostgreSQL 16   │   │    Redis 7       │  │  BullMQ    │
                         │   (Multi-Tenant)  │   │ (Cache + PubSub) │  │  (Jobs)    │
                         │   + Prisma ORM    │   │                  │  │            │
                         └───────────────────┘   └──────────────────┘  └────────────┘

                    ┌─────────────────────────────────────────────────────────┐
                    │                   Hardware Layer                        │
                    │                                                         │
                    │  ┌──────────────────┐      ┌──────────────────────┐    │
                    │  │  Raspberry Pi    │      │  Raspberry Pi        │    │
                    │  │  Aufrufanzeige   │      │  Thermodrucker       │    │
                    │  │  (Kiosk-Modus)   │      │  (Wartenummer)       │    │
                    │  └──────────────────┘      └──────────────────────┘    │
                    └─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Komponente          | Technologie                        | Version  |
|---------------------|------------------------------------|----------|
| Backend             | Node.js / TypeScript / Fastify     | 22       |
| ORM                 | Prisma                             | latest   |
| Job Queue           | BullMQ                             | latest   |
| Frontend Buerger    | SvelteKit (PWA)                    | 2        |
| Frontend Mitarbeiter| SvelteKit                          | 2        |
| Frontend Admin      | SvelteKit                          | 2        |
| Datenbank           | PostgreSQL                         | 16       |
| Cache / PubSub      | Redis                              | 7        |
| Auth / SSO          | Keycloak (BundID-kompatibel)       | 24.0     |
| Container           | Docker / Docker Compose            | 24+      |
| Reverse Proxy       | Caddy (Prod)                       | 2        |
| Hardware            | Raspberry Pi (Kiosk + Drucker)     | 4/5      |
| E2E Tests           | Playwright                         | latest   |
| Linting             | ESLint, Prettier                   | latest   |

---

## Projektstruktur

```
terminvergabe/
├── backend/                    # Fastify API Server
│   ├── prisma/                 # Datenmodell und Migrationen
│   │   ├── schema.prisma       # Prisma Schema
│   │   ├── migrations/         # SQL-Migrationen
│   │   └── seed.ts             # Demo-Daten
│   └── src/
│       ├── modules/            # Feature-Module
│       │   ├── booking/        # Terminbuchung
│       │   ├── queue/          # Warteschlange
│       │   ├── display/        # Aufrufanlage
│       │   ├── admin/          # Verwaltung
│       │   ├── auth/           # Keycloak-Auth
│       │   └── notification/   # E-Mail / SMS
│       ├── middleware/         # Tenant, Auth, RateLimit
│       └── lib/                # Slot-Generator, Utils
├── frontend-buerger/           # SvelteKit PWA (Buerger)
│   └── src/
│       ├── routes/             # SvelteKit Pages
│       ├── lib/                # Shared Components
│       └── i18n/               # Uebersetzungen (DE/EN/TR/AR/UK)
├── frontend-mitarbeiter/       # SvelteKit (Mitarbeiter)
│   └── src/
│       ├── routes/             # Dashboard, Queue, Kalender
│       └── lib/                # Echtzeit-Komponenten
├── frontend-admin/             # SvelteKit (Admin)
│   └── src/
│       ├── routes/             # Verwaltungs-Seiten
│       └── lib/                # Admin-Komponenten
├── hardware/                   # Raspberry Pi Integration
│   ├── kiosk/                  # Chromium Kiosk-Setup
│   ├── printer/                # ESC/POS Thermodrucker
│   ├── setup.sh                # Installations-Skript
│   └── README.md               # Hardware-Dokumentation
├── tests/                      # E2E Tests (Playwright)
├── docs/                       # Dokumentation
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Produktion
├── Makefile                    # Build-Kommandos
├── .env.example                # Umgebungsvariablen-Vorlage
├── LICENSE                     # EUPL-1.2
└── README.md
```

---

## Hardware-Integration

aitema|Termin unterstuetzt die Integration von Hardware-Komponenten fuer den
Wartebereich im Buergeramt:

### Aufrufanzeige (Kiosk)

- Raspberry Pi 4/5 mit Chromium im Kiosk-Modus
- Verbindung zum Backend ueber WebSocket
- Anzeige: Wartenummer, Raum/Schalter, Aufruf-Animation
- Automatischer Reconnect bei Verbindungsabbruch

### Thermodrucker (Wartenummer)

- ESC/POS-kompatibler Thermodrucker (z.B. Epson TM-T20III)
- Anschluss ueber USB an Raspberry Pi
- Druckt: Wartenummer, Dienstleistung, geschaetzte Wartezeit, QR-Code
- QR-Code verlinkt auf Echtzeit-Warteposition

### Einrichtung

```bash
# Auf dem Raspberry Pi
curl -fsSL https://raw.githubusercontent.com/aitema-gmbh/terminvergabe/main/hardware/setup.sh | bash

# Konfiguration
nano /etc/aitema-termin/config.env
# BACKEND_URL=https://api.termin.example.de
# DISPLAY_MODE=kiosk  # oder "printer"
# LOCATION_ID=1
```

---

## Deployment

### Produktion mit Docker Compose

```bash
# Produktions-Stack starten
docker compose -f docker-compose.prod.yml up -d

# Datenbank migrieren
docker exec termin-backend-prod npx prisma migrate deploy

# Logs anzeigen
docker compose -f docker-compose.prod.yml logs -f backend

# Backup erstellen
docker exec termin-postgres-prod pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql
```

### Empfohlene Hardware (Produktion)

| Groesse          | vCPU | RAM   | Speicher | Standorte |
|-----------------|------|-------|----------|-----------|
| Small           | 2    | 4 GB  | 50 GB    | 1-3       |
| Medium          | 4    | 8 GB  | 100 GB   | 3-10      |
| Large           | 8    | 16 GB | 200 GB   | 10+       |

---

## COSS-Modell (Commercial Open Source)

aitema|Termin folgt dem COSS-Modell:

| Merkmal                        | Community (EUPL)     | Managed              | Enterprise           |
|--------------------------------|----------------------|----------------------|----------------------|
| Quellcode                      | Vollstaendig         | Vollstaendig         | Vollstaendig         |
| Online-Buchung                 | Ja                   | Ja                   | Ja                   |
| Walk-in-Warteschlange          | Ja                   | Ja                   | Ja                   |
| Aufrufanlage                   | Ja                   | Ja                   | Ja                   |
| Self-Hosting                   | Ja                   | Ja                   | Ja                   |
| Docker Images (GHCR)           | Ja                   | Ja                   | Ja                   |
| Managed Hosting                | --                   | Ja                   | Ja                   |
| SLA / Support                  | Community            | 48h Response         | 4h Response          |
| BundID-Einrichtung             | Doku                 | Begleitet            | Vollservice          |
| Hardware-Setup (Kiosk/Drucker) | Doku                 | Remote               | Vor-Ort              |
| Schulung                       | --                   | Online               | Vor-Ort              |
| Anpassungen / Branding         | --                   | Auf Anfrage          | Inklusive            |
| SMS-Benachrichtigungen         | --                   | Ja                   | Ja                   |

---

## Development

### Lokale Entwicklung

```bash
# Gesamtes Projekt starten
make dev

# Nur Backend
make dev-backend

# Nur Frontend (Buerger)
cd frontend-buerger && npm run dev

# Tests
make test

# Einzelnen Booking-Test ausfuehren
make test-booking

# Linting
make lint

# Prisma Studio (Datenbank-Browser)
cd backend && npx prisma studio
```

### Code Style

- **TypeScript**: ESLint + Prettier (konsistente Formatierung)
- **Svelte**: svelte-check fuer Type-Checking
- **Commits**: Conventional Commits (feat:, fix:, docs:, etc.)

---

## Contributing

Beitraege sind willkommen! Bitte lies unsere [CONTRIBUTING.md](CONTRIBUTING.md) fuer
Details zum Entwicklungsprozess, Code-Style und wie du Pull Requests einreichst.

---

## Lizenz

Copyright (c) 2025 aitema GmbH

Dieses Projekt ist unter der **European Union Public Licence (EUPL) v1.2** lizenziert.
Siehe [LICENSE](LICENSE) fuer den vollstaendigen Lizenztext.

Die EUPL ist kompatibel mit GPL-2.0, GPL-3.0, AGPL-3.0, LGPL, MPL, EPL, CeCILL
und weiteren Open-Source-Lizenzen.

---

## Kontakt

**aitema GmbH**
- Web: [https://aitema.de](https://aitema.de)
- E-Mail: info@aitema.de
- GitHub: [https://github.com/aitema-gmbh](https://github.com/aitema-gmbh)

---

<div align="center">

Entwickelt mit Sorgfalt von [aitema GmbH](https://aitema.de) -- Digitale Loesungen fuer Kommunen.

</div>
