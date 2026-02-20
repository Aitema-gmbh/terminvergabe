# Deployment-Anleitung: aitema|Termin

Vollstaendige Anleitung zur Installation des OZG-konformen Terminvergabesystems fuer Kommunen.

## Systemvoraussetzungen

| Komponente | Mindest | Empfohlen |
|------------|---------|-----------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB |
| Speicher | 20 GB SSD | 50 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Docker | 24.0+ | 26.0+ |
| Docker Compose | 2.20+ | 2.27+ |
| Offene Ports | 80, 443 | 80, 443 |
| Kiosk (optional) | Raspberry Pi 4 | Raspberry Pi 4 (4GB RAM) |

---

## Installation (ca. 20 Minuten)

### Schritt 1: Server vorbereiten

```bash
# System aktualisieren
apt update && apt upgrade -y

# Docker installieren
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Docker Compose Plugin
apt install docker-compose-plugin -y

# Hilfswerkzeuge
apt install -y git curl nano ufw

# Firewall
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw enable
```

### Schritt 2: Repository klonen

```bash
mkdir -p /opt/kommunal && cd /opt/kommunal
git clone https://github.com/Aitema-gmbh/terminvergabe.git
cd terminvergabe
```

### Schritt 3: Konfiguration

```bash
cp .env.example .env
nano .env
```

Vollstaendige Konfiguration in `.env`:

```env
# ================================================================
# PFLICHTFELDER
# ================================================================

DOMAIN=termine.ihre-kommune.de
POSTGRES_PASSWORD=SICHERES_DATENBANKPASSWORT
JWT_SECRET=LANGER_ZUFAELLIGER_SCHLUESSEL

# ================================================================
# KOMMUNALE STAMMDATEN
# ================================================================

MUNICIPALITY_NAME=Stadtverwaltung Musterhausen
MUNICIPALITY_SHORT=Musterhausen
MUNICIPALITY_WEBSITE=https://www.musterhausen.de
MUNICIPALITY_PHONE=+49 1234 5678-0
MUNICIPALITY_ADDRESS=Rathausplatz 1, 12345 Musterhausen
MUNICIPALITY_LOGO_URL=https://www.musterhausen.de/logo.png

# ================================================================
# E-MAIL-KONFIGURATION
# ================================================================

SMTP_HOST=smtp.musterhausen.de
SMTP_PORT=587
SMTP_USER=termine@musterhausen.de
SMTP_PASS=E-MAIL-PASSWORT
SMTP_TLS=true
FROM_EMAIL=termine@musterhausen.de
FROM_NAME=Terminverwaltung Musterhausen

# ================================================================
# SMS-BENACHRICHTIGUNGEN (optional)
# ================================================================

# Anbieter: twilio, vonage, oder sipgate
SMS_PROVIDER=sipgate
SMS_API_KEY=IHR_SMS_API_SCHLUESSEL
SMS_SENDER=Musterhausen
SMS_ENABLED=false  # auf "true" setzen wenn konfiguriert

# ================================================================
# TERMINBUCHUNGS-EINSTELLUNGEN
# ================================================================

# Buchungsvorlauf in Stunden (min. X Stunden im Voraus buchbar)
BOOKING_MIN_ADVANCE_HOURS=2

# Buchungshorizont in Tagen (max. X Tage im Voraus buchbar)
BOOKING_MAX_ADVANCE_DAYS=60

# Stornierungsfrist in Stunden (bis X Stunden vorher stornierbar)
CANCELLATION_DEADLINE_HOURS=24

# Erinnerungsmail X Stunden vor Termin
REMINDER_HOURS_BEFORE=24

# Warteliste aktivieren
WAITLIST_ENABLED=true
WAITLIST_MAX_SIZE=10

# ================================================================
# OZG-SCHNITTSTELLEN (optional)
# ================================================================

# BundID / Servicekonto-Anbindung
SERVICEKONTO_ENABLED=false
# SERVICEKONTO_CLIENT_ID=...
# SERVICEKONTO_CLIENT_SECRET=...

# FIM/XZuFi-Leistungsverzeichnis
XZUFI_ENABLED=false
# XZUFI_ENDPOINT=https://...

# ================================================================
# KIOSK-MODUS
# ================================================================

KIOSK_ENABLED=true
KIOSK_PIN=1234  # PIN fuer Kiosk-Verwaltungsbereich aendern!
KIOSK_IDLE_TIMEOUT_SECONDS=60
KIOSK_LANGUAGE=de
```

### Schritt 4: Starten

```bash
# System starten
docker compose -f docker-compose.prod.yml up -d

# Status pruefen
docker compose -f docker-compose.prod.yml ps
```

### Schritt 5: Erste Einrichtung

```bash
# Admin-Account anlegen
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py createsuperuser

# Demo-Daten laden (optional fuer Tests)
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py loaddata demo_locations demo_services

# System-Check
curl https://termine.ihre-kommune.de/api/health
```

---

## Mehrere Standorte konfigurieren

### Standorte (Locations) anlegen

Das System unterstuetzt beliebig viele Standorte (Rathaeuser, Bezirksaemter, etc.):

**Per Admin-UI:**
`https://termine.ihre-kommune.de/admin/locations/add/`

**Per CLI:**

```bash
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py shell -c "
from appointments.models import Location, Service

# Hauptstandort: Rathaus
rathaus = Location.objects.create(
    name='Rathaus Musterhausen',
    short_name='Rathaus',
    address='Rathausplatz 1',
    zip_code='12345',
    city='Musterhausen',
    phone='+49 1234 5678-100',
    email='rathaus@musterhausen.de',
    is_active=True,
    # Oeffnungszeiten (ISO Wochentage: 1=Mo, 7=So)
    opening_hours={
        '1': {'open': '08:00', 'close': '16:00'},  # Montag
        '2': {'open': '08:00', 'close': '18:00'},  # Dienstag
        '3': {'open': '08:00', 'close': '16:00'},  # Mittwoch
        '4': {'open': '08:00', 'close': '18:00'},  # Donnerstag
        '5': {'open': '08:00', 'close': '12:00'},  # Freitag
    }
)

# Bezirksamt Nord
bezirk_nord = Location.objects.create(
    name='Bezirksamt Nord',
    short_name='BA-Nord',
    address='Nordstrasse 15',
    zip_code='12346',
    city='Musterhausen-Nord',
    phone='+49 1234 5678-200',
    email='ba-nord@musterhausen.de',
    is_active=True,
    opening_hours={
        '1': {'open': '08:00', 'close': '16:00'},
        '3': {'open': '08:00', 'close': '16:00'},
        '5': {'open': '08:00', 'close': '12:00'},
    }
)

print(f'Standorte angelegt: {Location.objects.count()}')
"
```

### Dienstleistungen konfigurieren

```bash
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py shell -c "
from appointments.models import Location, Service

rathaus = Location.objects.get(short_name='Rathaus')
ba_nord = Location.objects.get(short_name='BA-Nord')

services = [
    {
        'name': 'Personalausweis beantragen',
        'duration_minutes': 15,
        'simultaneous_bookings': 2,
        'requires_documents': ['Altes Ausweisdokument', 'Passfoto (biometrisch)', '37 EUR Gebuehr'],
        'locations': [rathaus, ba_nord],
    },
    {
        'name': 'Reisepass beantragen',
        'duration_minutes': 20,
        'simultaneous_bookings': 2,
        'requires_documents': ['Personalausweis', 'Passfoto (biometrisch)', '70 EUR Gebuehr'],
        'locations': [rathaus],
    },
    {
        'name': 'Fuehrungszeugnis beantragen',
        'duration_minutes': 10,
        'simultaneous_bookings': 3,
        'requires_documents': ['Personalausweis', '13 EUR Gebuehr'],
        'locations': [rathaus, ba_nord],
    },
    {
        'name': 'Ummeldung Wohnsitz',
        'duration_minutes': 15,
        'simultaneous_bookings': 2,
        'requires_documents': ['Personalausweis', 'Wohnungsgeberbestaetigung'],
        'locations': [rathaus, ba_nord],
    },
    {
        'name': 'KFZ-Zulassung',
        'duration_minutes': 30,
        'simultaneous_bookings': 1,
        'requires_documents': ['Personalausweis', 'Fahrzeugpapiere', 'eVB-Nummer', 'SEPA-Mandat'],
        'locations': [rathaus],
    },
]

for svc_data in services:
    locations = svc_data.pop('locations')
    svc = Service.objects.create(**svc_data)
    svc.locations.set(locations)
    print(f'  Dienst: {svc.name}')

print(f'Dienstleistungen: {Service.objects.count()}')
"
```

### Mitarbeitende (Sachbearbeiter) zuweisen

```bash
# In Admin-UI: Admin > Benutzer > Neuen Sachbearbeiter anlegen
# Oder per CLI:
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py create_staff \
    --username=m.mueller \
    --email=m.mueller@musterhausen.de \
    --location=Rathaus \
    --services="Personalausweis beantragen,Reisepass beantragen"
```

---

## Kiosk-Display einrichten (Raspberry Pi / Digital Signage)

### Raspberry Pi vorbereiten

```bash
# Raspberry Pi OS installieren (64-bit Lite empfohlen)
# Dann per SSH:

# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Chromium und Display-Tools installieren
sudo apt install -y chromium-browser xorg openbox

# Kiosk-Skript erstellen
cat > /home/pi/kiosk.sh << 'KIOSK'
#!/bin/bash
export DISPLAY=:0
xset s off          # Bildschirmschoner aus
xset -dpms          # Energiesparmodus aus
xset s noblank      # Bildschirm immer an

openbox-session &

sleep 3

# Chromium im Vollbild-Kiosk-Modus starten
chromium-browser \
  --kiosk \
  --no-first-run \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --app=https://termine.ihre-kommune.de/kiosk \
  --window-size=1920,1080
KIOSK
chmod +x /home/pi/kiosk.sh

# Autostart einrichten
mkdir -p /home/pi/.config/autostart
cat > /home/pi/.config/autostart/kiosk.desktop << 'DESKTOP'
[Desktop Entry]
Type=Application
Name=Kiosk
Exec=/home/pi/kiosk.sh
DESKTOP

# Passwortlosen SSH-Schluessel fuer Updates
ssh-keygen -t ed25519 -f /home/pi/.ssh/id_kiosk -N ""
```

### Digital Signage (groessere Displays)

```bash
# Fuer Windows-basierte Digital-Signage-Systeme:
# URL: https://termine.ihre-kommune.de/kiosk?fullscreen=1&lang=de

# Fuer Android-basierte Displays:
# Fully Kiosk Browser App:
# URL: https://termine.ihre-kommune.de/kiosk
# Vollbild: Ja
# Passwortschutz: KIOSK_PIN aus .env

# Warteschlangen-Anzeige (fuer Warte-Displays):
# https://termine.ihre-kommune.de/display/queue?location=Rathaus
```

### Kiosk-URL-Parameter

| Parameter | Wert | Beschreibung |
|-----------|------|--------------|
| `location` | Standort-ID | Nur diesen Standort anzeigen |
| `lang` | `de`, `en`, `tr`, `ar` | Sprache (Mehrsprachigkeit) |
| `service` | Service-ID | Direkt zu Dienst springen |
| `theme` | `light`, `dark`, `kommune` | Anzeigemodus |
| `font_size` | `normal`, `large`, `xlarge` | Schriftgroesse |

---

## E-Mail und SMS-Benachrichtigungen

### E-Mail-Vorlagen anpassen

```bash
# Vorlagen bearbeiten (in Admin-UI):
# Admin > Einstellungen > E-Mail-Vorlagen

# Verfuegbare Vorlagen:
# - booking_confirmation.html  (Buchungsbestaetigung)
# - booking_reminder.html      (Erinnerung 24h vorher)
# - booking_cancellation.html  (Stornierung)
# - booking_rescheduled.html   (Terminverschiebung)
# - waitlist_notification.html (Nachruekkende von Warteliste)

# Test-E-Mail senden
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py send_test_email \
    --template=booking_confirmation \
    --to=test@musterhausen.de
```

### SMS-Integration (sipgate)

```bash
# sipgate API-Schluessel einrichten:
# 1. Account auf sipgate.de anlegen
# 2. API-Token generieren: app.sipgate.com/settings/apitoken
# 3. In .env eintragen:

SMS_PROVIDER=sipgate
SMS_API_KEY=TOKENID:TOKEN
SMS_SENDER=Musterhausen  # max. 11 Zeichen
SMS_ENABLED=true

# Test-SMS senden
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py send_test_sms --to=+4912345678
```

### Erinnerungslogik konfigurieren

```env
# In .env - Mehrfache Erinnerungen moeglich:
REMINDER_SCHEDULE=48h,24h,2h  # 48h, 24h und 2h vor Termin

# Kanalpreferenz des Buergers respektieren
REMINDER_CHANNEL=email         # "email", "sms", "both"
ALLOW_CHANNEL_CHOICE=true      # Buerger waehlt selbst
```

---

## OZG-Compliance-Checkliste

Das System ist vorbereitet fuer die Anforderungen des Onlinezugangsgesetzes (OZG):

| Anforderung | Status | Konfiguration |
|-------------|--------|---------------|
| Online-Antragstellung | Erfuellt | Standardmaessig aktiv |
| Mobile-Optimierung | Erfuellt | Responsives Design |
| Barrierefreiheit WCAG 2.1 AA | Erfuellt | Getestet mit NVDA/VoiceOver |
| Mehrsprachigkeit | Erfuellt | DE, EN, TR, AR eingebaut |
| BundID-Anbindung | Vorbereitet | `SERVICEKONTO_ENABLED=true` |
| Nutzerkonto (optional) | Erfuellt | Buchung ohne Account moeglich |
| Ende-zu-Ende-Verschluesselung | Erfuellt | TLS 1.3 |
| Datenschutz by Design | Erfuellt | Minimale Datenspeicherung |
| Verfuegbarkeit 99,5% | Abhaengig | Health-Monitoring einrichten |
| Barrierefreiheitserklaerung | Manuell | Template: `docs/barrierefreiheit.md` |

### WCAG 2.1 Barrierefreiheit sicherstellen

```bash
# In .env:
ACCESSIBILITY_MODE=true       # Erweitertes ARIA-Markup
HIGH_CONTRAST_OPTION=true     # Kontrastreichen Modus anbieten
LARGE_TEXT_OPTION=true        # Grosse Schrift anbieten
SCREEN_READER_OPTIMIZED=true  # Screenreader-Optimierungen

# Barrierefreiheits-Test durchfuehren
# https://wave.webaim.org/
# https://termine.ihre-kommune.de als URL eingeben
```

---

## Integration mit Buergerportalen

### Servicekonto.NRW / BundID

```bash
# In .env (Testumgebung):
SERVICEKONTO_ENABLED=true
SERVICEKONTO_ENVIRONMENT=staging
SERVICEKONTO_CLIENT_ID=IHR_CLIENT_ID
SERVICEKONTO_CLIENT_SECRET=IHR_CLIENT_SECRET
SERVICEKONTO_REDIRECT_URI=https://termine.ihre-kommune.de/auth/callback

# Produktionsumgebung:
SERVICEKONTO_ENVIRONMENT=production
```

### Kommunales Buergerportal (iFrameIntegration)

```html
<!-- In Ihr bestehendes CMS/Buergerportal einbetten: -->
<iframe
  src="https://termine.ihre-kommune.de/embed?location=Rathaus&lang=de"
  width="100%"
  height="600"
  frameborder="0"
  title="Online-Terminbuchung Rathaus Musterhausen"
  allowfullscreen>
</iframe>
```

```bash
# CORS fuer Ihr Buergerportal freischalten:
# In .env:
CORS_ALLOWED_ORIGINS=https://www.musterhausen.de,https://buerger.musterhausen.de
```

### REST-API fuer externe Systeme

```bash
# API-Dokumentation
curl https://termine.ihre-kommune.de/api/docs/

# Freie Termine abfragen (oeffentlich)
curl "https://termine.ihre-kommune.de/api/v1/slots/?service=1&date=2026-03-01"

# Buchung erstellen (API-Key erforderlich)
curl -X POST https://termine.ihre-kommune.de/api/v1/bookings/ \
  -H "Authorization: Bearer IHR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service": 1,
    "slot": "2026-03-01T10:00:00",
    "citizen": {
      "name": "Max Mustermann",
      "email": "max@example.com",
      "phone": "+4912345678"
    }
  }'
```

---

## Backup-Strategie

```bash
mkdir -p /backup/terminvergabe

cat > /usr/local/bin/termin-backup.sh << 'BACKUP_SCRIPT'
#!/bin/bash
set -e

BACKUP_DIR=/backup/terminvergabe
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=365

echo "[$(date)] Starte Terminvergabe-Backup..."

# Datenbank (Termine, Buchungen, Konfiguration)
docker exec terminvergabe-db pg_dump -U postgres terminvergabe \
  | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"

# Konfiguration
cp /opt/kommunal/terminvergabe/.env "$BACKUP_DIR/config-$DATE.env"

# Logs komprimieren
tar czf "$BACKUP_DIR/logs-$DATE.tar.gz" /var/log/docker/ 2>/dev/null || true

# Alte Backups loeschen
find "$BACKUP_DIR" -name "*.gz" -mtime "+$RETENTION_DAYS" -delete

echo "[$(date)] Backup OK: $(du -sh $BACKUP_DIR | cut -f1)"
BACKUP_SCRIPT
chmod +x /usr/local/bin/termin-backup.sh

echo "0 3 * * * root /usr/local/bin/termin-backup.sh >> /var/log/termin-backup.log 2>&1" \
  > /etc/cron.d/termin-backup
```

---

## Monitoring und Benachrichtigungen

```bash
# Health-Endpoint
curl https://termine.ihre-kommune.de/api/health

# Auslastungsstatistiken
curl https://termine.ihre-kommune.de/api/v1/stats/today/ \
  -H "Authorization: Bearer ADMIN_API_KEY"

# Beispiel-Antwort:
# {
#   "total_appointments": 47,
#   "available_slots": 23,
#   "cancellations": 3,
#   "waitlist_count": 5,
#   "top_service": "Personalausweis beantragen"
# }

# Taeglich automatischer Report per E-Mail
# In .env:
DAILY_REPORT_ENABLED=true
DAILY_REPORT_EMAIL=verwaltung@musterhausen.de
DAILY_REPORT_TIME=07:00
```

---

## Troubleshooting

### Termine werden nicht angezeigt

```bash
# Oeffnungszeiten des Standorts pruefen
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py check_slots --location=Rathaus --date=2026-03-01

# Dienstleistung dem Standort zugeordnet?
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py shell -c "
from appointments.models import Location, Service
loc = Location.objects.get(short_name='Rathaus')
print(list(loc.services.values_list('name', flat=True)))
"
```

### E-Mail-Erinnerungen werden nicht gesendet

```bash
# Celery-Worker (fuer asynchrone E-Mails) pruefen
docker compose -f docker-compose.prod.yml logs celery-worker --tail=30

# E-Mail-Queue leeren
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py process_email_queue --verbose

# SMTP-Verbindung testen
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py test_smtp
```

### Kiosk-Browser-Probleme

```bash
# Raspberry Pi: Browser-Cache leeren
rm -rf /home/pi/.cache/chromium/

# Kiosk-URL direkt testen
curl -I https://termine.ihre-kommune.de/kiosk

# Kiosk-PIN zuruecksetzen
# In Admin-UI: Einstellungen > Kiosk > PIN aendern
```

---

## Updates

```bash
cd /opt/kommunal/terminvergabe

# Backup vor Update
/usr/local/bin/termin-backup.sh

# Update
git pull origin main
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec backend \
  python3 manage.py migrate

# Verifikation
curl https://termine.ihre-kommune.de/api/health
```

---

## Support

| Kanal | Kontakt |
|-------|---------|
| E-Mail | support@aitema.de |
| GitHub Issues | https://github.com/Aitema-gmbh/terminvergabe/issues |
| OZG-Plattform | https://ozg.de |
| Dokumentation | https://aitema.de/api-docs/terminvergabe |

---

*Letzte Aktualisierung: Februar 2026 | aitema GmbH*
*OZG-konform | EUPL 1.2*
