-- ============================================================
-- aitema|Termin - Initiale Datenbankstruktur
-- PostgreSQL 16 kompatibel
-- Migration: 20240101000000_init
-- ============================================================

-- Enums
CREATE TYPE "EmployeeRole" AS ENUM (
  'ADMIN',
  'TEAMLEITER',
  'SACHBEARBEITER',
  'EMPFANG'
);

CREATE TYPE "AppointmentStatus" AS ENUM (
  'BOOKED',
  'CONFIRMED',
  'CHECKED_IN',
  'CALLED',
  'IN_PROGRESS',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED'
);

CREATE TYPE "QueueStatus" AS ENUM (
  'WAITING',
  'CALLED',
  'IN_PROGRESS',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED'
);

-- ============================================================
-- Tenant (Mandant / Kommune)
-- ============================================================
CREATE TABLE "Tenant" (
  "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name"         TEXT         NOT NULL,                          -- Vollständiger Kommunenname
  "slug"         TEXT         NOT NULL,                          -- URL-freundlicher Bezeichner
  "ags"          TEXT,                                           -- Amtlicher Gemeindeschlüssel (8-stellig)
  "domain"       TEXT,                                           -- Optional: Custom-Domain
  "active"       BOOLEAN      NOT NULL DEFAULT TRUE,
  "primaryColor" TEXT         NOT NULL DEFAULT '#1e3a5f',        -- Hex-Farbe für Branding
  "logoUrl"      TEXT,
  "timezone"     TEXT         NOT NULL DEFAULT 'Europe/Berlin',
  "locale"       TEXT         NOT NULL DEFAULT 'de-DE',
  "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ  NOT NULL,

  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- Indizes Tenant
CREATE UNIQUE INDEX "Tenant_slug_key"  ON "Tenant" ("slug");
CREATE        INDEX "Tenant_slug_idx"  ON "Tenant" ("slug");
CREATE        INDEX "Tenant_ags_idx"   ON "Tenant" ("ags");

COMMENT ON TABLE  "Tenant"          IS 'Mandantentabelle: eine Zeile pro angeschlossener Kommune';
COMMENT ON COLUMN "Tenant"."slug"   IS 'Wird in URLs verwendet, z.B. /musterstadt/buchen';
COMMENT ON COLUMN "Tenant"."ags"    IS 'Amtlicher Gemeindeschlüssel des Statistischen Bundesamts';

-- ============================================================
-- TenantSettings (Konfiguration pro Mandant)
-- ============================================================
CREATE TABLE "TenantSettings" (
  "id"                   TEXT     NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"             TEXT     NOT NULL,
  -- Buchungsregeln
  "maxAdvanceBookingDays" INT     NOT NULL DEFAULT 90,           -- Max. Vorausbuchung in Tagen
  "minBookingLeadHours"  INT      NOT NULL DEFAULT 1,            -- Mindestvorlauf in Stunden
  "cancelLeadHours"      INT      NOT NULL DEFAULT 24,           -- Stornierungsfrist in Stunden
  "maxBookingsPerPerson" INT      NOT NULL DEFAULT 3,            -- Max. offene Buchungen pro Person
  "requireEmailVerify"   BOOLEAN  NOT NULL DEFAULT TRUE,
  -- Warteschlange
  "queueEnabled"         BOOLEAN  NOT NULL DEFAULT TRUE,
  "estimatedWaitDisplay" BOOLEAN  NOT NULL DEFAULT TRUE,
  -- BundID
  "bundIdEnabled"        BOOLEAN  NOT NULL DEFAULT FALSE,
  "bundIdClientId"       TEXT,
  "bundIdRedirectUri"    TEXT,
  -- Benachrichtigungen
  "reminderHoursBefore"  INT      NOT NULL DEFAULT 24,
  "smsEnabled"           BOOLEAN  NOT NULL DEFAULT FALSE,
  "emailEnabled"         BOOLEAN  NOT NULL DEFAULT TRUE,
  -- Anzeigetafel
  "displayBoardEnabled"  BOOLEAN  NOT NULL DEFAULT TRUE,
  "callSystemEnabled"    BOOLEAN  NOT NULL DEFAULT FALSE,

  CONSTRAINT "TenantSettings_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "TenantSettings_tenantId_fkey"   FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "TenantSettings_tenantId_key" ON "TenantSettings" ("tenantId");

COMMENT ON TABLE "TenantSettings" IS '1:1 Konfigurationserweiterung zum Tenant';

-- ============================================================
-- Location (Standort)
-- ============================================================
CREATE TABLE "Location" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"   TEXT        NOT NULL,
  "name"       TEXT        NOT NULL,                             -- z.B. "Bürgerbüro Mitte"
  "address"    TEXT,
  "room"       TEXT,                                             -- Raumbezeichnung
  "postalCode" TEXT,
  "city"       TEXT,
  "phone"      TEXT,
  "email"      TEXT,
  "latitude"   DOUBLE PRECISION,
  "longitude"  DOUBLE PRECISION,
  "active"     BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL,

  CONSTRAINT "Location_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE
);

CREATE INDEX "Location_tenantId_idx" ON "Location" ("tenantId");

COMMENT ON TABLE "Location" IS 'Physische Standorte (Rathäuser, Bürgerbüros) eines Tenants';

-- ============================================================
-- Service (Dienstleistung)
-- ============================================================
CREATE TABLE "Service" (
  "id"             TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"       TEXT        NOT NULL,
  "name"           TEXT        NOT NULL,                         -- z.B. "Personalausweis beantragen"
  "description"    TEXT,
  "category"       TEXT,                                         -- z.B. "Ausweisdokumente"
  "duration"       INT         NOT NULL DEFAULT 15,              -- Termindauer in Minuten
  "bufferTime"     INT         NOT NULL DEFAULT 5,               -- Puffer nach Termin in Minuten
  "requiredDocs"   TEXT[]      NOT NULL DEFAULT '{}',            -- Array benötigter Unterlagen
  "onlineFormUrl"  TEXT,
  "fee"            DOUBLE PRECISION,                             -- Gebühr in EUR (NULL = kostenlos)
  "active"         BOOLEAN     NOT NULL DEFAULT TRUE,
  "sortOrder"      INT         NOT NULL DEFAULT 0,
  "color"          TEXT        NOT NULL DEFAULT '#3b82f6',
  "icon"           TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL,

  CONSTRAINT "Service_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE
);

CREATE INDEX "Service_tenantId_category_idx" ON "Service" ("tenantId", "category");

COMMENT ON TABLE "Service" IS 'Vom Tenant angebotene Dienstleistungen';
COMMENT ON COLUMN "Service"."duration" IS 'Netto-Termindauer in Minuten ohne Puffer';

-- ============================================================
-- LocationService (M:N Standort <-> Dienstleistung)
-- ============================================================
CREATE TABLE "LocationService" (
  "id"         TEXT    NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "locationId" TEXT    NOT NULL,
  "serviceId"  TEXT    NOT NULL,
  "active"     BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT "LocationService_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "LocationService_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE,
  CONSTRAINT "LocationService_serviceId_fkey"  FOREIGN KEY ("serviceId")  REFERENCES "Service"  ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "LocationService_locationId_serviceId_key"
  ON "LocationService" ("locationId", "serviceId");

COMMENT ON TABLE "LocationService" IS 'Aktiviert einen Service an einem bestimmten Standort';

-- ============================================================
-- Employee (Mitarbeiter)
-- ============================================================
CREATE TABLE "Employee" (
  "id"        TEXT          NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"  TEXT          NOT NULL,
  "name"      TEXT          NOT NULL,
  "email"     TEXT          NOT NULL,
  "role"      "EmployeeRole" NOT NULL DEFAULT 'SACHBEARBEITER',
  "active"    BOOLEAN       NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ   NOT NULL,

  CONSTRAINT "Employee_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "Employee_tenantId_email_key" ON "Employee" ("tenantId", "email");
CREATE        INDEX "Employee_tenantId_idx"        ON "Employee" ("tenantId");

COMMENT ON TABLE "Employee" IS 'Sachbearbeiter und Administratoren eines Tenants';

-- ============================================================
-- Counter (Schalter)
-- ============================================================
CREATE TABLE "Counter" (
  "id"         TEXT    NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "locationId" TEXT    NOT NULL,
  "number"     INT     NOT NULL,                                 -- Schalternummer (1-basiert)
  "name"       TEXT,                                             -- Optionaler Anzeigename
  "active"     BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT "Counter_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "Counter_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "Counter_locationId_number_key" ON "Counter" ("locationId", "number");

COMMENT ON TABLE "Counter" IS 'Physische Schalter an einem Standort';

-- ============================================================
-- CounterAssignment (Schalterzuweisung pro Tag)
-- ============================================================
CREATE TABLE "CounterAssignment" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "counterId"  TEXT        NOT NULL,
  "employeeId" TEXT        NOT NULL,
  "date"       DATE        NOT NULL,
  "startTime"  TIMESTAMPTZ NOT NULL,
  "endTime"    TIMESTAMPTZ NOT NULL,

  CONSTRAINT "CounterAssignment_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "CounterAssignment_counterId_fkey"  FOREIGN KEY ("counterId")  REFERENCES "Counter"  ("id") ON DELETE CASCADE,
  CONSTRAINT "CounterAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE
);

CREATE INDEX "CounterAssignment_counterId_date_idx"  ON "CounterAssignment" ("counterId",  "date");
CREATE INDEX "CounterAssignment_employeeId_date_idx" ON "CounterAssignment" ("employeeId", "date");

COMMENT ON TABLE "CounterAssignment" IS 'Welcher Mitarbeiter sitzt wann an welchem Schalter';

-- ============================================================
-- Appointment (Termin)
-- ============================================================
CREATE TABLE "Appointment" (
  "id"               TEXT               NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"         TEXT               NOT NULL,
  "locationId"       TEXT               NOT NULL,
  "serviceId"        TEXT               NOT NULL,
  "employeeId"       TEXT,
  -- Zeitraum
  "date"             DATE               NOT NULL,
  "startTime"        TIMESTAMPTZ        NOT NULL,
  "endTime"          TIMESTAMPTZ        NOT NULL,
  -- Bürgerdaten
  "citizenName"      TEXT               NOT NULL,
  "citizenEmail"     TEXT,
  "citizenPhone"     TEXT,
  -- Status
  "status"           "AppointmentStatus" NOT NULL DEFAULT 'BOOKED',
  -- Referenz
  "bookingRef"       TEXT               NOT NULL,               -- z.B. "TRM-2026-00042"
  "confirmationSent" BOOLEAN            NOT NULL DEFAULT FALSE,
  "reminderSent"     BOOLEAN            NOT NULL DEFAULT FALSE,
  -- Prozess-Timestamps
  "checkedInAt"      TIMESTAMPTZ,
  "calledAt"         TIMESTAMPTZ,
  "completedAt"      TIMESTAMPTZ,
  -- BundID
  "bundIdVerified"   BOOLEAN            NOT NULL DEFAULT FALSE,
  "notes"            TEXT,
  "createdAt"        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ        NOT NULL,

  CONSTRAINT "Appointment_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "Appointment_tenantId_fkey"  FOREIGN KEY ("tenantId")   REFERENCES "Tenant"   ("id") ON DELETE CASCADE,
  CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id"),
  CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId")  REFERENCES "Service"  ("id"),
  CONSTRAINT "Appointment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "Appointment_bookingRef_key"      ON "Appointment" ("bookingRef");
CREATE        INDEX "Appointment_tenantId_date_idx"   ON "Appointment" ("tenantId",   "date");
CREATE        INDEX "Appointment_locationId_date_idx" ON "Appointment" ("locationId", "date");
CREATE        INDEX "Appointment_status_idx"          ON "Appointment" ("status");
CREATE        INDEX "Appointment_bookingRef_idx"      ON "Appointment" ("bookingRef");

COMMENT ON TABLE  "Appointment"              IS 'Online-Terminbuchungen der Bürger';
COMMENT ON COLUMN "Appointment"."bookingRef" IS 'Eindeutige Buchungsreferenz für Bürger (Format TRM-YYYY-NNNNN)';
COMMENT ON COLUMN "Appointment"."date"       IS 'Nur das Datum, für schnelle Tagesabfragen ohne Zeitzone';

-- ============================================================
-- QueueEntry (Wartenummer / Walk-In)
-- ============================================================
CREATE TABLE "QueueEntry" (
  "id"            TEXT          NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"      TEXT          NOT NULL,
  "locationId"    TEXT          NOT NULL,
  "serviceId"     TEXT          NOT NULL,
  "counterId"     TEXT,
  -- Wartenummer
  "ticketNumber"  TEXT          NOT NULL,                        -- z.B. "A042"
  "citizenName"   TEXT,
  -- Status
  "status"        "QueueStatus" NOT NULL DEFAULT 'WAITING',
  "priority"      INT           NOT NULL DEFAULT 0,              -- Höher = dringlicher
  -- Timestamps
  "createdAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "calledAt"      TIMESTAMPTZ,
  "startedAt"     TIMESTAMPTZ,
  "completedAt"   TIMESTAMPTZ,
  -- Berechnet
  "estimatedWait" INT,                                           -- Geschätzte Wartezeit in Minuten

  CONSTRAINT "QueueEntry_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "QueueEntry_tenantId_fkey"  FOREIGN KEY ("tenantId")  REFERENCES "Tenant"   ("id") ON DELETE CASCADE,
  CONSTRAINT "QueueEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id"),
  CONSTRAINT "QueueEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"  ("id"),
  CONSTRAINT "QueueEntry_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "Counter"  ("id") ON DELETE SET NULL
);

CREATE INDEX "QueueEntry_tenantId_locationId_status_idx"
  ON "QueueEntry" ("tenantId", "locationId", "status");
CREATE INDEX "QueueEntry_ticketNumber_idx" ON "QueueEntry" ("ticketNumber");

COMMENT ON TABLE "QueueEntry" IS 'Walk-In Warteschlange: Bürger ohne Vorab-Termin';
COMMENT ON COLUMN "QueueEntry"."priority" IS '0 = normal, positive Werte = bevorzugt (z.B. Rollstuhlfahrer)';

-- ============================================================
-- OpeningHours (Öffnungszeiten)
-- ============================================================
CREATE TABLE "OpeningHours" (
  "id"           TEXT    NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "locationId"   TEXT    NOT NULL,
  "dayOfWeek"    INT     NOT NULL,                               -- 0=Montag, 4=Freitag, 6=Sonntag
  "openTime"     TEXT    NOT NULL,                               -- "08:00"
  "closeTime"    TEXT    NOT NULL,                               -- "16:00"
  "specificDate" DATE,                                           -- Gesetzt bei Feiertagsüberschreibung
  "closed"       BOOLEAN NOT NULL DEFAULT FALSE,                 -- TRUE = geschlossen an diesem Tag
  "note"         TEXT,                                           -- z.B. "Heiligabend"

  CONSTRAINT "OpeningHours_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "OpeningHours_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE
);

CREATE INDEX "OpeningHours_locationId_dayOfWeek_idx"
  ON "OpeningHours" ("locationId", "dayOfWeek");

COMMENT ON TABLE  "OpeningHours"                IS 'Reguläre und datumsspezifische Öffnungszeiten';
COMMENT ON COLUMN "OpeningHours"."dayOfWeek"    IS '0=Montag ... 6=Sonntag (abweichend von JS Date.getDay()!)';
COMMENT ON COLUMN "OpeningHours"."specificDate" IS 'Wenn gesetzt, überschreibt diese Zeile den regulären Wochentag';
