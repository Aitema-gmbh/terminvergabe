# aitema|Termin – Architektur

## System-Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    termin.aitema.de                      │
│                 Traefik Reverse Proxy                    │
└──────────┬──────────────────┬───────────────────────────┘
           │                  │
    ┌──────▼──────┐    ┌──────▼──────┐
    │  SvelteKit  │    │   Fastify   │
    │  Frontend   │    │   Backend   │
    │  :3000      │    │   :4000     │
    └──────┬──────┘    └──────┬──────┘
           │                  │
    ┌──────▼──────────────────▼──────┐
    │          PostgreSQL 16          │
    │       + Redis (Queue/PubSub)   │
    └────────────────────────────────┘
```

## Komponenten

| Komponente | Technologie | Port | Beschreibung |
|------------|------------|------|--------------|
| Frontend Bürger | SvelteKit | :3000 | Buchungsportal, Check-in |
| Frontend Staff | SvelteKit | :3001 | Queue-Dashboard, Kiosk |
| Frontend Admin | SvelteKit | :3002 | Konfiguration, Standorte |
| Backend API | Fastify/Node.js | :4000 | REST API, WebSocket |
| Datenbank | PostgreSQL 16 | :5432 | Hauptdatenspeicher |
| Queue | Redis + BullMQ | :6379 | Async Jobs (SMS, iCal) |
| Auth | Keycloak | :8080 | SSO für Staff/Admin |
| Analytics | Plausible | :8888 | DSGVO-konform, cookiefrei |

## Datenfluss: Terminbuchung

```
Bürger → Standort wählen
       → Service wählen
       → Datum/Zeit wählen
       → Persönliche Daten eingeben
       → POST /api/v1/appointments
         ├── PostgreSQL: Termin persistiert (Prisma)
         ├── BullMQ: SMS-Job eingereiht (Sipgate)
         ├── BullMQ: iCal-Job eingereiht
         └── WebSocket-Broadcast → Staff-Dashboard
       → QR-Code generiert
       → Bestätigungs-E-Mail versendet
```

## Datenfluss: Check-in am Kiosk

```
Bürger scannt QR-Code → /checkin/:bookingCode
                       → PATCH /api/v1/appointments/:id/checkin
                         ├── PostgreSQL: Status → "CHECKED_IN"
                         ├── Redis PubSub: Event published
                         └── Kiosk-Display: WebSocket update
                       → Staff-Dashboard: Bürger als "Anwesend"
```

## NoShow-Scoring

Heuristisches Scoring-Modell (0–100 Punkte = NoShow-Risiko):

| Faktor | Punkte |
|--------|--------|
| Buchung < 24h vor Termin | +20 |
| Termin vor 9:00 Uhr | +15 |
| Montag oder Freitag | +10 |
| Selten genutzte Services | +10 |
| Historische NoShow-Rate des Bürgers | +25 (max) |
| Werktag Mitte der Woche | -5 |

Score-Schwellen: 0–30 (grün), 31–60 (gelb), 61–100 (rot)

## Datenbankschema (Kernentitäten)

```
Location (Standort)
  ├── Service[] (angebotene Dienstleistungen)
  ├── TimeSlot[] (verfügbare Zeitfenster)
  └── Appointment[] (gebuchte Termine)
        ├── status: PENDING | CONFIRMED | CHECKED_IN | DONE | NOSHOW
        ├── qrCode: UUID
        └── noShowScore: 0–100

QueueEntry (Warteschlange)
  ├── appointmentId
  ├── ticketNumber
  └── calledAt
```

## WebSocket-Protokoll

```
Client → Server:  { type: "subscribe", locationId: "..." }
Server → Client:  { type: "queue_update", data: QueueEntry[] }
Server → Client:  { type: "appointment_checkin", data: Appointment }
Server → Client:  { type: "next_ticket", data: { ticket: "A042" } }
```

## Deployment (Hetzner)

```
/opt/aitema/terminvergabe/
├── docker-compose.yml         # Produktions-Setup
├── docker-compose.prod.yml    # Prod-Overrides (Ressourcen, Volumes)
├── docker-compose.traefik.yml # Traefik Labels
└── .env.production            # Secrets (nicht in Git)
```

## Sicherheit

- **HTTPS**: Traefik + Let's Encrypt (automatisch)
- **Auth**: Keycloak OIDC/PKCE für Staff/Admin-Bereiche
- **Rate Limiting**: Fastify rate-limit (100 req/min pro IP)
- **CORS**: Nur termin.aitema.de zugelassen
- **Logging**: Keine personenbezogenen Daten in Logs
