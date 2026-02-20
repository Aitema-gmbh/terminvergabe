# Installation – aitema|Termin

## Voraussetzungen

- Docker ≥ 24.0
- Docker Compose ≥ 2.0
- Mindestens 2 GB RAM
- Mindestens 10 GB Festplattenspeicher
- Eine Domain mit SSL-Zertifikat (für Produktionsbetrieb)
- Optional: Kiosk-Display für Warteraumanzeige (handelsübliches Tablet oder Monitor)

## Systemübersicht

aitema|Termin besteht aus vier Komponenten:

| Komponente | URL | Beschreibung |
|------------|-----|-------------|
| Bürgerportal | `:5173` | Öffentliche Terminbuchung |
| Mitarbeiter-Oberfläche | `:5174` | Verwaltung und Terminsteuerung |
| Kiosk-Display | `:5175` | Warteraumanzeige (Großbildschirm) |
| Backend-API | `:8000` | REST-API |

## Schnellstart (ca. 30 Minuten)

### 1. Repository klonen

```bash
git clone https://github.com/Aitema-gmbh/terminvergabe.git
cd terminvergabe
```

### 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
nano .env  # Passwörter und Domain anpassen
```

Mindestens diese Werte müssen gesetzt werden:

| Variable | Beschreibung | Beispiel |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL-Verbindungsstring | `postgresql://aitema:pass@db:5432/termin` |
| `PUBLIC_BASE_URL` | URL des Bürgerportals | `https://termin.gemeinde.de` |

### 3. Starten

```bash
docker compose up -d
```

### 4. Öffnen

- Bürgerportal: http://localhost:5173
- Mitarbeiter: http://localhost:5174
- Kiosk: http://localhost:5175

## Kiosk-Display einrichten

Das Kiosk-Display zeigt die aktuelle Warteschlange im Warteraum an.

### Tablet/Monitor konfigurieren

1. Browser im Vollbildmodus öffnen (`F11`)
2. URL aufrufen: `https://termin.gemeinde.de/kiosk`
3. Für automatischen Start: Browser-Kiosk-Modus aktivieren

### Raspberry Pi Kiosk (empfohlen)

```bash
# Chromium im Kiosk-Modus starten
chromium-browser --kiosk --noerrdialogs --disable-infobars   https://termin.gemeinde.de/kiosk
```

## Produktionsbetrieb

### SSL-Zertifikat mit Let's Encrypt (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name termin.ihre-gemeinde.de;

    ssl_certificate /etc/letsencrypt/live/termin.ihre-gemeinde.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/termin.ihre-gemeinde.de/privkey.pem;

    # Bürgerportal
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Mitarbeiter-Oberfläche (intern, ggf. nur im LAN)
server {
    listen 443 ssl;
    server_name termin-admin.ihre-gemeinde.de;

    ssl_certificate /etc/letsencrypt/live/termin-admin.ihre-gemeinde.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/termin-admin.ihre-gemeinde.de/privkey.pem;

    # Nur aus dem Verwaltungs-LAN erreichbar
    allow 10.0.0.0/8;
    deny all;

    location / {
        proxy_pass http://localhost:5174;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
certbot --nginx -d termin.ihre-gemeinde.de -d termin-admin.ihre-gemeinde.de
```

## Datensicherung

```bash
# Datenbank täglich sichern
0 2 * * * docker exec termin_db pg_dump -U aitema termin > /backup/termin-$(date +%Y%m%d).sql

# Backups 30 Tage aufbewahren
0 3 * * * find /backup -name "termin-*.sql" -mtime +30 -delete
```

## Updates

```bash
git pull
docker compose pull
docker compose up -d
```

## Häufige Probleme

### Kiosk zeigt keine aktuellen Daten

```bash
# Aktualisierungsintervall prüfen
grep KIOSK_REFRESH_INTERVAL_SECONDS .env
# WebSocket-Verbindung prüfen
docker compose logs backend | grep websocket
```

### E-Mail-Bestätigungen kommen nicht an

```bash
docker compose logs backend | grep smtp
# SMTP-Einstellungen testen
docker compose exec backend python manage.py sendtestemail admin@gemeinde.de
```

### Terminkollisionen

```bash
# Datenbank-Konsistenz prüfen
docker compose exec backend python manage.py check_slots
```

## Support

Bei Fragen: [GitHub Issues](https://github.com/Aitema-gmbh/terminvergabe/issues)
oder per E-Mail: kontakt@aitema.de
