# Konfiguration – aitema|Termin

Alle Konfigurationsoptionen werden über Umgebungsvariablen in der Datei `.env` gesetzt.
Die Vorlage befindet sich in `.env.example` im Wurzelverzeichnis des Projekts.

## Pflichtfelder

| Variable | Beschreibung |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL-Verbindungsstring |
| `PUBLIC_BASE_URL` | Öffentliche URL des Bürgerportals |

## Terminbuchung anpassen

```env
# Bis zu 60 Tage im Voraus buchbar
MAX_DAYS_AHEAD=60

# Terminslots à 15 Minuten
SLOT_DURATION_MINUTES=15

# Maximal 3 Termine pro Bürger pro Tag
MAX_BOOKINGS_PER_DAY=3
```

## Kiosk-Display

```env
# Anzeige alle 5 Sekunden aktualisieren
KIOSK_REFRESH_INTERVAL_SECONDS=5
```

Das Kiosk-Display ist unter `{PUBLIC_BASE_URL}/kiosk` erreichbar.
Es benötigt keine Anmeldung und ist für Großbildschirme im Wartebereich optimiert.

## E-Mail-Bestätigungen

```env
SMTP_HOST=mail.ihre-gemeinde.de
SMTP_PORT=587
SMTP_USER=termin@ihre-gemeinde.de
SMTP_PASS=sicheres_passwort
SMTP_FROM=termin@ihre-gemeinde.de
```

Bürgerinnen und Bürger erhalten:
- Buchungsbestätigung mit Termin-Details
- Erinnerung 24 Stunden vor dem Termin
- Absagebestätigung

## Weitere Informationen

Siehe auch:
- [Installation](installation.md)
- [FAQ](faq.md)
