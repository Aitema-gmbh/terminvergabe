# Änderungsprotokoll

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt hält sich an [Semantische Versionierung](https://semver.org/spec/v2.0.0.html).

## [Unveröffentlicht]

### Hinzugefügt
- Modernes UI-Design mit aitema Design-System (Inter, Navy/Blue/Accent-Palette)
- Bürger-Portal: Online-Terminbuchung ohne Registrierung
- Mitarbeiter-Portal: Kalender- und Kapazitätsverwaltung
- Admin-Portal: Behörden-weite Konfiguration und Auswertungen
- Intelligente Wartelisten-Funktion mit automatischer Benachrichtigung
- SMS- und E-Mail-Erinnerungen für gebuchte Termine
- QR-Code-basiertes Check-in-System vor Ort
- Barrierefreie Oberfläche (WCAG 2.1 AA)
- Hardware-Integration: Warteschlangen-Display-Support
- publiccode.yml für opencode.de-Kompatibilität
- Issue-Templates für Kommunen, Fehlerberichte und Förderanfragen
- GitHub Actions: Semantic Release, Renovate Bot, Willkommens-Bot
- End-to-End-Tests mit Playwright
- Docker-Compose-Deployment inkl. PostgreSQL-Migration

### Geändert
- Buchungsmaske vereinfacht (von 5 auf 3 Schritte reduziert)
- Kalender-Ansicht auf FullCalendar v6 aktualisiert

## [1.0.0] – 2024-01-01

### Hinzugefügt
- Erstveröffentlichung
- Online-Terminvereinbarung für kommunale Dienstleistungen
- Flexible Dienstleistungs- und Standortverwaltung
- Automatische Terminbestätigung per E-Mail
- Stornierung und Umbuchung durch Bürgerinnen und Bürger
- Statistik-Dashboard für Auslastungsanalysen
- REST-API für Drittsystem-Integration
- DSGVO-konformes Datenschutzkonzept
- Docker-Compose-Deployment
- Mehrsprachige Benutzeroberfläche (Deutsch)
