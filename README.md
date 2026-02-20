# aitema|Termin – Open-Source-Terminvergabesystem

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![GitHub Stars](https://img.shields.io/github/stars/Aitema-gmbh/terminvergabe?style=social)](https://github.com/Aitema-gmbh/terminvergabe/stargazers)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://github.com/Aitema-gmbh/terminvergabe/pkgs/container/terminvergabe)
[![OZG](https://img.shields.io/badge/OZG-konform-brightgreen)](https://aitema.de/loesungen/terminvergabe)
[![opencode.de](https://img.shields.io/badge/opencode.de-Kompatibel-0069B4)](https://opencode.de)
[![API Docs](https://img.shields.io/badge/API-Dokumentation-orange)](https://aitema.de/api-docs/terminvergabe)

Modernes Online-Terminbuchungssystem für Bürgerbüros und Behörden – OZG-konform, SvelteKit-Frontend, kostenlos.

## 🏛️ Warum aitema|Termin?

Laut Studien verbringen Bürgerinnen und Bürger durchschnittlich 15 Minuten in der Warteschleife, um Behördentermine zu vereinbaren. aitema|Termin ermöglicht einfache Online-Buchung – ohne Lizenzkosten, DSGVO-konform, selbst-hostbar.

## 🚀 Schnellstart (Docker)

```bash
git clone https://github.com/Aitema-gmbh/terminvergabe.git
cd terminvergabe
cp .env.example .env
docker compose up -d
```

Öffne http://localhost:5173 – das Terminbuchungssystem ist bereit!

## ✨ Funktionen

- **5-Schritt-Buchungsassistent** – Standort → Service → Termin → Daten → Bestätigung
- **QR-Code-Bestätigung** – Terminnachweis direkt auf dem Smartphone
- **Kiosk-Display** – Große Anzeige für Wartenummern im Bürgerbüro
- **Mitarbeiter-Dashboard** – Live-Warteschlange, schnelle Aktionen
- **Mehrere Standorte** – Verschiedene Behördenstandorte verwaltbar
- **OZG-konform** – Erfüllt Anforderungen des Online-Zugangsgesetzes
- **Erinnerungsbenachrichtigungen** – Per E-Mail (konfigurierbar)

## 🏗️ Technologie

| Schicht | Technologie |
|---------|-------------|
| Frontend | SvelteKit 2 |
| Styling | Tailwind CSS 4 |
| Sprache | TypeScript |
| Datenbank | PostgreSQL 15 |
| Deployment | Docker Compose |
| Lizenz | AGPL-3.0 |

## 📞 Kontakt & Support

- **Bug melden:** [GitHub Issues](https://github.com/Aitema-gmbh/terminvergabe/issues)
- **Kontakt:** kontakt@aitema.de

---
*Entwickelt mit ❤️ in Deutschland | [aitema.de](https://aitema.de)*
