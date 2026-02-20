# aitema|Termin – Datenbankschema

## Übersicht

Das System nutzt **PostgreSQL via Prisma ORM** als Datenbankbackend.
Das Schema ist für den kommunalen Einsatz (Multi-Tenant) ausgelegt und DSGVO-konform.

- **ORM:** Prisma (TypeScript/Node.js)
- **Datenbank:** PostgreSQL 15
- **Prisma-Schema:** `/opt/aitema/terminvergabe/backend/prisma/schema.prisma`
- **Multi-Tenant:** Ja, alle Entitäten über `Tenant` mandantengefährt

---

## Kernentitäten

### Mandant (`Tenant`)

Jede Kommune ist ein eigener Mandant. Alle Daten sind tenant-isoliert.

```prisma
model Tenant {
  id            String   @id @default(uuid())
  name          String                        // Kommune-Name
  slug          String   @unique              // URL-Slug, z.B. "muenchen"
  ags           String?                       // Amtlicher Gemeindeschlüssel
  domain        String?                       // Custom Domain
  active        Boolean  @default(true)

  // Branding
  primaryColor  String   @default("#1e3a5f")
  logoUrl       String?

  // Lokalisierung
  timezone      String   @default("Europe/Berlin")
  locale        String   @default("de-DE")

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([slug])
  @@index([ags])
}
```

---

### Mandanten-Einstellungen (`TenantSettings`)

```prisma
model TenantSettings {
  id                    String  @id @default(uuid())
  tenantId              String  @unique

  // Buchungsregeln
  maxAdvanceBookingDays Int     @default(90)    // Max. Vorlaufzeit in Tagen
  minBookingLeadHours   Int     @default(1)     // Min. Vorlaufzeit in Stunden
  cancelLeadHours       Int     @default(24)    // Storno-Frist
  maxBookingsPerPerson  Int     @default(3)     // Max. Buchungen pro Person
  requireEmailVerify    Boolean @default(true)

  // Warteschlangen
  queueEnabled          Boolean @default(true)
  estimatedWaitDisplay  Boolean @default(true)

  // BundID-Integration
  bundIdEnabled         Boolean @default(false)
  bundIdClientId        String?
  bundIdRedirectUri     String?

  // Benachrichtigungen
  reminderHoursBefore   Int     @default(24)
  smsEnabled            Boolean @default(false)
  emailEnabled          Boolean @default(true)

  // Anzeige-System (Warteanzeige)
  displayBoardEnabled   Boolean @default(true)
  callSystemEnabled     Boolean @default(false)
}
```

---

### Standort (`Location`)

Bürgerbüros, Ämter, Beratungsstellen.

```prisma
model Location {
  id          String   @id @default(uuid())
  tenantId    String
  name        String                   // z.B. "Bürgerbüro Mitte"
  address     String?
  room        String?
  postalCode  String?
  city        String?
  phone       String?
  email       String?
  latitude    Float?
  longitude   Float?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

### Dienstleistung (`Service`)

```prisma
model Service {
  id              String   @id @default(uuid())
  tenantId        String
  name            String                   // z.B. "Personalausweis beantragen"
  description     String?
  category        String?
  duration        Int                      // Dauer in Minuten
  bufferAfter     Int      @default(0)     // Pufferzeit nach dem Termin
  slotSize        Int      @default(15)    // Buchungsslot-Größe in Minuten
  maxParallel     Int      @default(1)     // Parallele Buchungen
  onlineBookable  Boolean  @default(true)
  walkInOnly      Boolean  @default(false)
  leistungId      String?                  // LeiKa-ID (OZG-Referenz)
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

### Mitarbeiter (`Employee`) und Schalter (`Counter`)

```prisma
model Employee {
  id       String       @id @default(uuid())
  tenantId String
  name     String
  email    String
  role     EmployeeRole @default(SACHBEARBEITER)
  active   Boolean      @default(true)

  @@unique([tenantId, email])
}

enum EmployeeRole {
  ADMIN
  TEAMLEITER
  SACHBEARBEITER
  EMPFANG
}

model Counter {
  id         String  @id @default(uuid())
  locationId String
  number     Int                    // Schalternummer (1, 2, 3...)
  name       String?                // z.B. "Schalter A"
  active     Boolean @default(true)

  @@unique([locationId, number])
}

model CounterAssignment {
  id         String   @id @default(uuid())
  counterId  String
  employeeId String
  date       DateTime @db.Date
  startTime  DateTime
  endTime    DateTime

  @@index([counterId, date])
  @@index([employeeId, date])
}
```

---

### Termin (`Appointment`)

Kernentität des Systems. Enthält alle Buchungsdaten.

```prisma
model Appointment {
  id               String            @id @default(uuid())
  tenantId         String
  locationId       String
  serviceId        String
  employeeId       String?

  // Zeitplanung
  date             DateTime          @db.Date
  startTime        DateTime
  endTime          DateTime

  // Bürgerdaten (DSGVO-minimal)
  citizenName      String
  citizenEmail     String?
  citizenPhone     String?

  // Status
  status           AppointmentStatus @default(BOOKED)

  // Buchungsreferenz
  bookingRef       String            @unique  // z.B. "TRM-2026-00042"
  confirmationSent Boolean           @default(false)
  reminderSent     Boolean           @default(false)

  // Ablauf-Zeitstempel
  checkedInAt      DateTime?
  calledAt         DateTime?
  completedAt      DateTime?

  bundIdVerified   Boolean           @default(false)
  notes            String?

  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@index([tenantId, date])
  @@index([locationId, date])
  @@index([status])
  @@index([bookingRef])
}

enum AppointmentStatus {
  BOOKED        // Gebucht (online)
  CONFIRMED     // Bestätigt
  CHECKED_IN    // Eingecheckt (am Standort)
  CALLED        // Aufgerufen
  IN_PROGRESS   // In Bearbeitung
  COMPLETED     // Abgeschlossen
  NO_SHOW       // Nicht erschienen
  CANCELLED     // Storniert
}
```

---

### Warteschlange (`QueueEntry`)

Spontane Walk-In-Besucher ohne Online-Buchung.

```prisma
model QueueEntry {
  id            String      @id @default(uuid())
  tenantId      String
  locationId    String
  serviceId     String
  counterId     String?     // Zugewiesener Schalter

  ticketNumber  String      // z.B. "A042"
  citizenName   String?     // Optional (anonym möglich)

  status        QueueStatus @default(WAITING)
  priority      Int         @default(0)

  createdAt     DateTime    @default(now())
  calledAt      DateTime?
  startedAt     DateTime?
  completedAt   DateTime?
  estimatedWait Int?        // Geschätzte Wartezeit in Minuten

  @@index([tenantId, locationId, status])
  @@index([ticketNumber])
}

enum QueueStatus {
  WAITING
  CALLED
  IN_PROGRESS
  COMPLETED
  NO_SHOW
  CANCELLED
}
```

---

### Öffnungszeiten (`OpeningHours`)

```prisma
model OpeningHours {
  id           String    @id @default(uuid())
  locationId   String
  dayOfWeek    Int       // 0=Montag, 6=Sonntag
  openTime     String    // "08:00"
  closeTime    String    // "16:00"
  specificDate DateTime? @db.Date
  closed       Boolean   @default(false)
  note         String?   // z.B. "Heiligabend"

  @@index([locationId, dayOfWeek])
}
```

---

## DSGVO-konforme Datenhaltung

### Automatische Löschung personenbezogener Daten

```sql
-- Abgeschlossene Termine nach 30 Tagen anonymisieren (täglicher Cronjob)
UPDATE "Appointment"
SET
  "citizenName"  = '[gelöscht]',
  "citizenEmail" = NULL,
  "citizenPhone" = NULL,
  "notes"        = NULL
WHERE
  status IN ('COMPLETED', 'NO_SHOW', 'CANCELLED')
  AND "completedAt" < NOW() - INTERVAL '30 days';

-- Warteschlangen-Einträge nach 7 Tagen löschen
DELETE FROM "QueueEntry"
WHERE status IN ('COMPLETED', 'NO_SHOW', 'CANCELLED')
  AND "createdAt" < NOW() - INTERVAL '7 days';
```

### Datenminimierung

- `citizenEmail` und `citizenPhone` sind optional
- Walk-In-Tickets können völlig anonym ausgegeben werden (`citizenName = NULL`)
- BundID-Verifizierung optional und konfigurierbar pro Mandant
- Keine dauerhafte Speicherung von Ausweisdaten

---

## Beziehungsdiagramm

```
Tenant
  ├── TenantSettings
  ├── Location
  │     ├── Counter ── CounterAssignment ── Employee
  │     ├── OpeningHours
  │     ├── Appointment
  │     └── QueueEntry
  ├── Service
  └── Employee
```

---

## Datenbank-Befehle

```bash
# Neue Migration erstellen
cd /opt/aitema/terminvergabe/backend
npx prisma migrate dev --name "beschreibung"

# Schema auf Produktionsdatenbank anwenden
npx prisma migrate deploy

# Prisma Studio (Datenbank-GUI)
npx prisma studio

# Prisma-Client neu generieren
npx prisma generate
```

Stand: Februar 2026
