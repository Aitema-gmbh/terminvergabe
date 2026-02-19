# aitema|Termin - API Dokumentation

Base URL: `http://localhost:3000`

## REST Endpoints

### Booking (Terminbuchung)

#### `GET /api/v1/:tenantSlug/booking/days`
Verfuegbare Tage im Monat abrufen.

Query Parameter:
- `serviceId` (string, required): Dienstleistungs-ID
- `locationId` (string, required): Standort-ID
- `month` (string, required): Monat im Format `YYYY-MM`

Response:
```json
{
  "data": [
    { "date": "2025-03-10", "availableSlots": 12 },
    { "date": "2025-03-11", "availableSlots": 8 }
  ]
}
```

#### `GET /api/v1/:tenantSlug/booking/slots`
Verfuegbare Zeitslots fuer einen Tag.

Query Parameter:
- `serviceId` (string, required)
- `locationId` (string, required)
- `date` (string, required): Datum im Format `YYYY-MM-DD`

Response:
```json
{
  "data": [
    { "startTime": "2025-03-10T08:00:00Z", "endTime": "2025-03-10T08:15:00Z" },
    { "startTime": "2025-03-10T08:20:00Z", "endTime": "2025-03-10T08:35:00Z" }
  ],
  "count": 24
}
```

#### `POST /api/v1/:tenantSlug/booking/create`
Neuen Termin buchen.

Body:
```json
{
  "serviceId": "clxxx...",
  "locationId": "clxxx...",
  "slotStart": "2025-03-10T08:00:00Z",
  "citizenName": "Max Mustermann",
  "citizenEmail": "max@example.de",
  "citizenPhone": "+49123456789",
  "notes": "Bitte barrierefreien Zugang"
}
```

Response (201):
```json
{
  "data": {
    "id": "clxxx...",
    "bookingCode": "STA-AB12CD",
    "status": "CONFIRMED",
    "scheduledStart": "2025-03-10T08:00:00Z",
    "scheduledEnd": "2025-03-10T08:15:00Z",
    "service": { "name": "Personalausweis beantragen" },
    "location": { "name": "Rathaus", "address": "Marktplatz 1" }
  }
}
```

#### `POST /api/v1/:tenantSlug/booking/cancel`
Termin stornieren.

Body:
```json
{
  "bookingCode": "STA-AB12CD",
  "reason": "Kann den Termin nicht wahrnehmen"
}
```

#### `GET /api/v1/:tenantSlug/booking/lookup/:bookingCode`
Termin nachschlagen.

---

### Queue (Warteschlange)

#### `GET /api/v1/:tenantSlug/queue/status/:locationId`
Aktueller Warteschlangenstatus.

Response:
```json
{
  "data": {
    "summary": { "waiting": 5, "called": 2, "inService": 3, "completed": 15, "total": 25 },
    "tickets": [
      {
        "id": "clxxx...",
        "ticketNumber": "A005",
        "status": "CALLED",
        "serviceName": "Personalausweis",
        "counterName": "Schalter 3",
        "estimatedWaitMinutes": 10
      }
    ]
  }
}
```

#### `POST /api/v1/:tenantSlug/queue/ticket`
Wartenummer ziehen.

#### `POST /api/v1/:tenantSlug/queue/call-next`
Naechste Nummer aufrufen (auth required).

#### `POST /api/v1/:tenantSlug/queue/start-serving`
Bedienung starten (auth required).

#### `POST /api/v1/:tenantSlug/queue/complete`
Bedienung abschliessen (auth required).

---

### Display (Aufrufanlage)

#### `GET /api/v1/:tenantSlug/display/board/:locationId`
Aufrufanzeige-Daten.

#### `POST /api/v1/:tenantSlug/display/register`
Display-Geraet registrieren.

#### `POST /api/v1/:tenantSlug/display/heartbeat/:deviceId`
Geraete-Heartbeat.

---

## WebSocket Endpoints

### Queue Updates
```
ws://host/api/v1/:tenantSlug/queue/ws?locationId=xxx&type=queue
```

Messages:
- `CONNECTED` - Verbindung hergestellt
- `QUEUE_UPDATE` - Aktualisierter Warteschlangenstatus
- `TICKET_CALLED` - Ticket wurde aufgerufen (nur type=display)
- `PONG` - Antwort auf PING

Client kann senden:
- `{ "type": "PING" }` - Verbindungstest

### Display Updates
```
ws://host/api/v1/:tenantSlug/display/ws?locationId=xxx&deviceId=yyy
```

Messages:
- `BOARD_UPDATE` - Vollstaendige Anzeigedaten
- `TICKET_CALLED` - Neues Ticket aufgerufen (mit Animation)
- `HEARTBEAT_ACK` - Antwort auf Heartbeat

---

## Authentifizierung

### Endpoints
- `GET /api/auth/login` - Redirect zu Keycloak
- `GET /api/auth/callback` - Keycloak Callback
- `POST /api/auth/refresh` - Token erneuern
- `POST /api/auth/logout` - Abmelden

### Geschuetzte Endpoints
Admin- und Mitarbeiter-Endpoints erfordern ein Bearer Token:
```
Authorization: Bearer <access_token>
```

---

## Health Check

```
GET /health
```
Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-03-10T10:00:00Z",
  "services": { "database": "up", "redis": "up" }
}
```
