# Current State: aitema|Termin (Terminvergabe)
**Stand:** 2026-02-20
**Status:** Live (alle Seiten erreichbar)

## Live URLs
- Frontend (Buerger): https://termin.aitema.de
- Buchen: https://termin.aitema.de/buchen (Haupt-Einstieg via Redirect)
- Staff-Portal: https://termin.aitema.de/staff

## Container Status

| Container | Image | Status |
|-----------|-------|--------|
| termin-buerger | aitema-termin-buerger:latest | Up (healthy) |
| termin-backend | aitema-termin-backend:latest | Up |
| termin-postgres | postgres:16-alpine | Up (healthy) |
| termin-redis | redis:7-alpine | Up (healthy) |

## Letzter Deployment
- Datum: 2026-02-20
- Methode: Docker Compose + Traefik
- Images: aitema-termin-buerger:latest (SvelteKit), aitema-termin-backend:latest
- Stack-Verzeichnis: /opt/aitema/terminvergabe/
- Frontend: SvelteKit auf Port 3000
- Backend: Node.js/API auf Port 3000

## Bekannte Issues

### Root-Redirect (temporary statt permanent)
- https://termin.aitema.de/ -> 302 Redirect -> /buchen
- Traefik-Middleware termin-root-redirect (in redirects.yml konfiguriert)
- Koennte auf 301 permanent umgestellt werden

### Kein dedizierter API Health-Endpunkt dokumentiert
- Kein /api/health Endpunkt bekannt
- Termin-Backend laeuft auf Port 3000 (intern)

## Naechste Schritte
1. API Health-Endpunkt hinzufuegen oder dokumentieren
2. Root-Redirect auf 301 permanent umstellen
3. Staff-Portal Login und Workflow testen
4. Terminbuchungs-Workflow E2E testen

## Technischer Stack
- Frontend (Buerger): SvelteKit (aitema-termin-buerger:latest, Port 3000)
- Backend: Node.js API (aitema-termin-backend:latest, Port 3000)
- Datenbank: PostgreSQL 16 Alpine (Locale: de_DE.UTF-8)
- Session/Cache: Redis 7 Alpine
- Reverse Proxy: Traefik v3.6 + Cloudflare Origin Cert
- TLS: Cloudflare Origin Certificate (gueltig bis 2041)

## Healthcheck URLs
- https://termin.aitema.de/ -> HTTP 200 (via Redirect zu /buchen)
- https://termin.aitema.de/buchen -> HTTP 200 OK
- https://termin.aitema.de/staff -> HTTP 200 OK

## HTTP->HTTPS Redirect
- http://termin.aitema.de/ -> 301 -> https://termin.aitema.de/ (korrekt via Traefik)
