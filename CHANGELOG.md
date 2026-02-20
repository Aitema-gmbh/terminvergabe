# Changelog

Alle wesentlichen Änderungen an aitema|Termin werden in dieser Datei dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).
Versionierung nach [Semantic Versioning](https://semver.org/).

## [Unveröffentlicht]

## [1.0.0] – 2025-01-01

### Hinzugefügt
- Online-Terminbuchung für Bürgerinnen und Bürger (OZG-konform)
- 5-Schritt-Buchungsassistent (Standort → Dienst → Termin → Daten → Bestätigung)
- QR-Code-Terminbestätigungen per E-Mail
- Kiosk-Display-System für Warteräume (7rem+ Schriftgröße, barrierefrei)
- Mitarbeiter-Dashboard mit Echtzeit-Warteschlangenmanagement
- Admin-Portal: Behördenweite Konfiguration und Auswertungen
- Mehrbehörden-/Mehrstandort-Unterstützung
- Intelligente Wartelisten-Funktion mit automatischer Benachrichtigung
- SMS- und E-Mail-Erinnerungen für gebuchte Termine
- QR-Code-basiertes Check-in-System vor Ort
- Echtzeit-WebSocket-Updates für Warteschlange
- Statistische Auswertungen zur Kapazitätsplanung
- Barrierefreie Oberfläche (WCAG 2.1 AA)
- Modernes UI mit aitema Design-System (SvelteKit, Inter-Font, Navy/Blue/Accent-Palette)
- Dark-Mode-Unterstützung
- Docker-Compose-Deployment (Installation in ca. 20 Minuten)
- Datenbankschema-Dokumentation (Prisma + DSGVO)
- System-Architektur-Dokumentation
- OpenAPI 3.1 Spezifikation
- publiccode.yml für opencode.de-Kompatibilität
- End-to-End-Tests mit Playwright
- Issue-Templates für Kommunen, Fehlerberichte und Förderanfragen
- Renovate-Bot für automatische Dependency-Updates
- CONTRIBUTING.md mit Entwickler-Richtlinien
- GitHub Actions CI/CD-Pipeline mit Matrix-Builds und Auto-Deploy

### Technischer Stack
- **Frontend/Backend:** SvelteKit 2, TypeScript
- **Datenbank:** PostgreSQL via Supabase
- **ORM:** Prisma
- **Lizenz:** AGPL-3.0

[Unveröffentlicht]: https://github.com/Aitema-gmbh/terminvergabe/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Aitema-gmbh/terminvergabe/releases/tag/v1.0.0
