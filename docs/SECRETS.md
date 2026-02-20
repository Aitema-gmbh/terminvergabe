# Secrets und Konfiguration – aitema|Termin

## Schnellstart

```bash
# Template kopieren und anpassen
cp .env.production.example .env.production
nano .env.production
```

## Sichere Passwörter generieren

```bash
# 32-Byte Hex Secret (für Passwörter, JWT)
openssl rand -hex 32

# 32-Byte Base64 Secret (für SESSION_SECRET, CSRF_SECRET)
openssl rand -base64 32

# UUID (alternative)
uuidgen
```

## Pflichtfelder

| Variable | Beschreibung | Generierung |
|----------|-------------|-------------|
| `POSTGRES_PASSWORD` | Datenbank-Passwort | `openssl rand -hex 32` |
| `REDIS_PASSWORD` | Redis-Passwort (Queue-Management) | `openssl rand -hex 32` |
| `KEYCLOAK_ADMIN_PASSWORD` | Keycloak-Admin-Passwort | `openssl rand -hex 32` |
| `KEYCLOAK_CLIENT_SECRET` | Keycloak-Client-Secret | `openssl rand -hex 32` |
| `JWT_SECRET` | JWT-Signierungsschlüssel | `openssl rand -hex 32` |
| `SESSION_SECRET` | Session-Verschlüsselungsschlüssel | `openssl rand -base64 32` |
| `CSRF_SECRET` | CSRF-Schutzschlüssel | `openssl rand -base64 32` |
| `BUERGER_ORIGIN` | URL Bürger-Frontend | z.B. `https://termin.example.de` |
| `MITARBEITER_ORIGIN` | URL Mitarbeiter-Frontend | z.B. `https://termin-intern.example.de` |
| `ADMIN_ORIGIN` | URL Admin-Frontend | z.B. `https://termin-admin.example.de` |

## Drei Frontends

Die Terminvergabe besteht aus drei getrennten Frontends:

| Frontend | Beschreibung | Standard-URL |
|----------|-------------|-------------|
| Bürger | Öffentliche Terminbuchung | `https://termin.DOMAIN.de` |
| Mitarbeiter | Sachbearbeiter-Ansicht | `https://termin-intern.DOMAIN.de` |
| Admin | Verwaltungskonfiguration | `https://termin-admin.DOMAIN.de` |

Alle drei Origins müssen in `CORS_ORIGINS` eingetragen sein.

## Keycloak SSO-Einrichtung

1. Keycloak-Admin-Konsole aufrufen: `https://sso.IHRE-DOMAIN.de`
2. Realm `termin` erstellen
3. Client `termin-backend` anlegen (vertraulicher Client)
4. `KEYCLOAK_CLIENT_SECRET` aus Keycloak-Client-Einstellungen kopieren
5. Rollen anlegen: `termin-admin`, `termin-mitarbeiter`, `termin-buerger`

## Kiosk-Display

Das Kiosk-Display zeigt die Warteschlange im Bürgerbüro an.
Der Zugriff ist mit einer PIN gesichert (`KIOSK_PIN`).
Ändere den Standardwert `1234` vor dem Produktionsbetrieb\!

## GitHub Actions Secrets

Für CI/CD müssen folgende Secrets in GitHub unter
`Settings → Secrets → Actions` hinterlegt werden:

| Secret | Beschreibung |
|--------|-------------|
| `GHCR_TOKEN` | GitHub Container Registry Token (ghcr.io) |
| `DEPLOY_SSH_KEY` | SSH-Private-Key für den Deployment-Server |
| `DEPLOY_HOST` | IP oder Hostname des Deployment-Servers |
| `POSTGRES_PASSWORD_PROD` | Produktions-Datenbank-Passwort |
| `REDIS_PASSWORD_PROD` | Redis-Produktions-Passwort |
| `KEYCLOAK_CLIENT_SECRET_PROD` | Keycloak-Client-Secret |
| `JWT_SECRET_PROD` | Produktions-JWT-Secret |
| `SESSION_SECRET_PROD` | Produktions-Session-Secret |
| `SENTRY_DSN` | Sentry-DSN für Error-Tracking (optional) |
| `SMS_TWILIO_AUTH_TOKEN` | Twilio Auth-Token (nur wenn SMS aktiviert) |

## .gitignore (wichtig\!)

Stelle sicher, dass `.env.production` in `.gitignore` eingetragen ist:

```
.env
.env.*
\!.env*.example
\!.env.prod.example
\!.env.production.example
```

## OZG-Konformität

Die Terminvergabe ist OZG-konform implementiert:
- Barrierefreiheit nach BITV 2.0 / WCAG 2.1 AA
- Datenschutz nach DSGVO (Terminlöschung nach Ablauf)
- Keine Pflicht zur Registrierung für Bürger

## Sicherheitshinweise

- **Kiosk-PIN**: Standardwert `1234` vor Produktionsbetrieb ändern\!
- **Rotation**: Ändere alle Secrets bei Verdacht auf Kompromittierung sofort
- **Backup**: Sichere `.env.production` verschlüsselt außerhalb des Repos
- **SMS**: Aktiviere SMS-Benachrichtigungen erst nach DSGVO-Prüfung
- Melde Sicherheitslücken gemäß `/SECURITY.md`
