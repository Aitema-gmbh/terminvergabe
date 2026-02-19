# aitema|Termin – Deployment Guide

> Version 1.0 | Februar 2026

## Inhaltsverzeichnis

1. [Systemanforderungen](#systemanforderungen)
2. [Docker Compose Setup](#docker-compose-setup)
3. [Erste Einrichtung](#erste-einrichtung)
4. [Kiosk und Display Hardware](#kiosk--display-hardware)
5. [BundID Integration](#bundid-integration)
6. [Monitoring & Backup](#monitoring--backup)
7. [Updates](#updates)

---

## Systemanforderungen

### Minimum (1 Standort, bis 100 Termine/Tag)

| Komponente | Anforderung |
|---|---|
| CPU | 2 vCPU |
| RAM | 2 GB |
| Speicher | 20 GB SSD |
| OS | Ubuntu 22.04+ / Debian 12+ |
| Docker | 24.0+ |
| Docker Compose | 2.20+ |

### Empfohlen (Multi-Standort, bis 500 Termine/Tag)

| Komponente | Anforderung |
|---|---|
| CPU | 4 vCPU |
| RAM | 4 GB |
| Speicher | 40 GB SSD |
| OS | Ubuntu 22.04+ / Debian 12+ |
| Docker | 24.0+ |
| Docker Compose | 2.20+ |

### Netzwerk

- Port 80/443 (HTTP/HTTPS) eingehend
- Port 5432 (PostgreSQL) nur intern
- Oeffentliche Domain mit DNS-Eintrag
- Fuer Kiosk/Display: lokales Netzwerk zum Server

---

## Docker Compose Setup

### 1. Repository klonen

```bash
git clone https://github.com/aitema/termin.git /opt/aitema-termin
cd /opt/aitema-termin
```

### 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
nano .env
```

Wichtige Variablen:

```env
# Allgemein
DOMAIN=termin.musterstadt.de
ADMIN_EMAIL=admin@musterstadt.de
NODE_ENV=production

# Datenbank
DATABASE_URL=postgresql://termin:<passwort>@postgres:5432/aitema_termin
POSTGRES_USER=termin
POSTGRES_PASSWORD=<sicheres-passwort-generieren>
POSTGRES_DB=aitema_termin

# Redis
REDIS_URL=redis://redis:6379

# SMTP (fuer Buchungsbestaetigungen)
SMTP_HOST=mail.musterstadt.de
SMTP_PORT=587
SMTP_USER=termin@musterstadt.de
SMTP_PASSWORD=<smtp-passwort>
SMTP_FROM=Terminvergabe Musterstadt <termin@musterstadt.de>

# SMS (optional, fuer Erinnerungen)
SMS_PROVIDER=sipgate
SMS_API_KEY=<api-key>

# BundID (optional)
BUNDID_ENABLED=false
BUNDID_CLIENT_ID=<client-id>
BUNDID_CLIENT_SECRET=<client-secret>
BUNDID_ISSUER=https://id.bund.de
```

### 3. Docker Compose starten

```bash
docker compose up -d
```

Dies startet folgende Services:

| Service | Port | Beschreibung |
|---|---|---|
| `app` | 3000 | aitema\|Termin Anwendung |
| `postgres` | 5432 | PostgreSQL 16 Datenbank |
| `redis` | 6379 | Redis (Sessions, Echtzeit-Queue) |
| `caddy` | 80, 443 | Reverse Proxy mit Auto-TLS |

### 4. Prisma Migration ausfuehren

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

### 5. Status pruefen

```bash
docker compose ps
docker compose logs -f app
```

Die Anwendung ist nach ca. 15 Sekunden unter `https://<DOMAIN>` erreichbar.

---

## Erste Einrichtung

### 1. Admin-Account

Nach dem Seed-Vorgang wird ein Admin-Account erstellt. Zugangsdaten erscheinen in der Konsole.

Login unter: `https://<DOMAIN>/admin`

### 2. Tenant (Organisation) anlegen

1. Admin-Panel oeffnen
2. "Organisation" -> "Neue Organisation"
3. Name, Adresse, Logo hochladen
4. Kontaktdaten und Impressum hinterlegen

### 3. Standorte konfigurieren

1. "Standorte" -> "Neuer Standort"
2. Name und Adresse des Buergerbueros
3. Anzahl Schalter/Arbeitsplaetze festlegen
4. Raumplan hochladen (optional)

### 4. Services definieren

Fuer jeden Standort die angebotenen Dienstleistungen konfigurieren:

```
Beispiel-Services:
- Personalausweis beantragen (20 Min)
- Reisepass beantragen (20 Min)
- Meldebescheinigung (10 Min)
- Fuehrungszeugnis (10 Min)
- Kfz-Zulassung (15 Min)
- Gewerbeanmeldung (15 Min)
```

Fuer jeden Service:
- Name und Beschreibung
- Geschaetzte Dauer in Minuten
- Benoetigte Dokumente (Info fuer Buerger)
- Zugeordnete Schalter/Mitarbeiter
- Online-buchbar: Ja/Nein
- Walk-in erlaubt: Ja/Nein

### 5. Oeffnungszeiten

Pro Standort konfigurierbar:

```
Beispiel:
Mo: 08:00 - 16:00
Di: 08:00 - 18:00  (langer Dienstag)
Mi: 08:00 - 12:00
Do: 08:00 - 16:00
Fr: 08:00 - 12:00
Sa/So: geschlossen
```

Feiertage und Sonderoeffnungszeiten koennen vorab geplant werden.

### 6. Mitarbeiter anlegen

1. "Mitarbeiter" -> "Neuer Mitarbeiter"
2. Name, E-Mail, zugeordneter Standort
3. Rollen zuweisen (Admin, Sachbearbeiter, Empfang)
4. Schalter-Zuordnung
5. Einladungs-E-Mail versenden

---

## Kiosk & Display Hardware

### Kiosk-Terminal (Walk-in)

Fuer das Wartenummern-Ziehen vor Ort.

**Empfohlene Hardware:**

| Komponente | Empfehlung |
|---|---|
| Geraet | Touchscreen-Tablet (10"+) oder Kiosk-Terminal |
| OS | Android 10+ / Chrome OS / Linux |
| Browser | Chrome/Chromium (Kiosk-Modus) |
| Drucker | Thermodrucker fuer Wartenummern (optional) |

**Einrichtung:**

```bash
# Kiosk-URL
https://<DOMAIN>/kiosk/<standort-id>

# Chrome Kiosk-Modus (Linux)
chromium-browser --kiosk --disable-pinch \
  --noerrdialogs --disable-translate \
  https://<DOMAIN>/kiosk/<standort-id>
```

**Thermodrucker (optional):**

```bash
# Unterstuetzte Drucker: Epson TM-T20III, Star TSP143III
# Konfiguration im Admin-Panel unter Standort -> Hardware
```

### Aufrufanzeige (Display)

Fuer Wartebereiche – zeigt aktuelle Aufrufe und Wartezeiten.

**Empfohlene Hardware:**

| Komponente | Empfehlung |
|---|---|
| Display | TV/Monitor ab 32" (Full HD) |
| Player | Raspberry Pi 4 (2GB+) oder Mini-PC |
| OS | Raspberry Pi OS Lite / Ubuntu |
| Browser | Chromium (Kiosk-Modus) |

**Raspberry Pi Setup:**

```bash
# 1. Raspberry Pi OS Lite installieren
# 2. Autologin und Chromium installieren
sudo apt update && sudo apt install -y chromium-browser xserver-xorg xinit

# 3. Autostart konfigurieren
cat > /home/pi/.xinitrc << EOF
xset s off
xset -dpms
xset s noblank
chromium-browser --kiosk --disable-pinch \
  --noerrdialogs --incognito \
  https://<DOMAIN>/display/<standort-id>
EOF

# 4. Auto-Start bei Boot
echo "startx" >> /home/pi/.bashrc
```

**Display-URL:**

```
https://<DOMAIN>/display/<standort-id>
```

Konfigurierbar im Admin-Panel:
- Layout (1-spaltig, 2-spaltig)
- Schriftgroesse
- Farben und Logo
- Lauftext / Hinweise
- Audio-Aufruf (Text-to-Speech)

---

## BundID Integration

Fuer OZG-konforme Identifikation bei der Terminbuchung.

### Voraussetzungen

- BundID Service-Account (Beantragung ueber das BundID-Portal)
- SAML oder OIDC Anbindung
- Gueltige Zertifikate

### Konfiguration

```env
# .env
BUNDID_ENABLED=true
BUNDID_CLIENT_ID=<von-bundid-portal>
BUNDID_CLIENT_SECRET=<von-bundid-portal>
BUNDID_ISSUER=https://id.bund.de
BUNDID_REDIRECT_URI=https://<DOMAIN>/auth/bundid/callback
BUNDID_TRUST_LEVEL=substantial
```

```bash
# Container neu starten
docker compose restart app
```

### Vertrauensniveaus

| Niveau | Beschreibung | Einsatz |
|---|---|---|
| `low` | Benutzername/Passwort | Einfache Terminbuchung |
| `substantial` | eID-Karte | Ausweisangelegenheiten |
| `high` | eID mit PIN | Signaturpflichtige Vorgaenge |

Pro Service konfigurierbar, welches Vertrauensniveau benoetigt wird.

---

## Monitoring & Backup

### Health Check

```bash
# Anwendungs-Health
curl https://<DOMAIN>/api/health

# Datenbank-Verbindung
docker compose exec postgres pg_isready

# Redis
docker compose exec redis redis-cli ping
```

### Echtzeit-Dashboard

Das Admin-Panel zeigt live:
- Aktuelle Warteschlange pro Standort
- Durchschnittliche Wartezeit
- Auslastung der Schalter
- Anzahl offener Termine heute

### Automatische Backups

```bash
#!/bin/bash
# /opt/aitema-termin/scripts/backup.sh
BACKUP_DIR=/opt/backups/aitema-termin
DATE=$(date +%Y%m%d_%H%M)

mkdir -p $BACKUP_DIR

# PostgreSQL Dump
docker compose exec -T postgres pg_dump -U termin aitema_termin | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Konfiguration sichern
cp /opt/aitema-termin/.env $BACKUP_DIR/env_$DATE.bak

# Alte Backups loeschen (aelter als 30 Tage)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.bak" -mtime +30 -delete
```

Crontab:

```bash
# Taeglich um 1:00 Uhr
0 1 * * * /opt/aitema-termin/scripts/backup.sh
```

### Monitoring mit Prometheus (optional)

```yaml
# prometheus.yml
scrape_configs:
  - job_name: aitema-termin
    static_configs:
      - targets: ["localhost:3000"]
    metrics_path: /metrics
```

Verfuegbare Metriken:
- `termin_bookings_total` – Gesamtanzahl Buchungen
- `termin_walkins_total` – Gesamtanzahl Walk-ins
- `termin_wait_time_seconds` – Wartezeit-Histogramm
- `termin_service_duration_seconds` – Bearbeitungszeit
- `termin_queue_size` – Aktuelle Warteschlangenlaenge

---

## Updates

### Managed (automatisch)

Updates werden automatisch eingespielt. Sie werden vorab per E-Mail informiert. Wartungsfenster: Sonntag 02:00-04:00 Uhr.

### Self-Hosted

```bash
cd /opt/aitema-termin

# Backup vor Update
./scripts/backup.sh

# Update ziehen
git pull origin main

# Container aktualisieren
docker compose pull
docker compose up -d --build

# Datenbank-Migrationen
docker compose exec app npx prisma migrate deploy

# Status pruefen
docker compose ps
curl https://<DOMAIN>/api/health
```

---

## Haeufige Probleme

### Buchungsbestaetigungen kommen nicht an

1. SMTP-Konfiguration pruefen: `docker compose exec app node scripts/test-smtp.js`
2. Spam-Ordner pruefen
3. SPF/DKIM-Eintraege fuer die Domain setzen

### Kiosk zeigt keine Verbindung

1. Netzwerkverbindung pruefen
2. URL korrekt? `https://<DOMAIN>/kiosk/<standort-id>`
3. WebSocket-Verbindung testen (Browser-Konsole)
4. Firewall: WebSocket-Upgrade erlaubt?

### Display aktualisiert sich nicht

1. WebSocket-Verbindung pruefen
2. Redis laeuft? `docker compose exec redis redis-cli ping`
3. Browser-Cache leeren (Chromium: `--disable-http-cache`)

### Wartezeiten werden falsch angezeigt

1. Service-Dauer korrekt konfiguriert?
2. Genug historische Daten vorhanden? (System lernt aus Erfahrungswerten)
3. Ausreisser durch manuelle Pausen? Pausen-System nutzen.

---

## Sicherheit

### Empfohlene Massnahmen

- [ ] HTTPS erzwingen (Caddy macht dies automatisch)
- [ ] Admin-Zugang mit 2FA absichern
- [ ] Regelmaessige Backups testen (Restore-Test)
- [ ] Docker-Images aktuell halten
- [ ] Firewall: Nur Port 80/443 oeffentlich
- [ ] Logfiles regelmaessig pruefen
- [ ] Datenschutzerklaerung im Buchungsportal hinterlegen

### DSGVO

- Buchungsdaten werden nach konfigurierbarer Frist automatisch geloescht (Standard: 90 Tage)
- Keine Tracking-Cookies im Buchungsportal
- Datenexport (Art. 20 DSGVO) ueber Admin-Panel
- Auftragsdatenverarbeitung (AVV) bei Managed-Hosting inklusive

---

*Support: support@aitema.de | Dokumentation: https://docs.aitema.de/termin*
