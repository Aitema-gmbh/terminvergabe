# aitema|Termin – Open-Source-Terminvergabesystem

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![OZG konform](https://img.shields.io/badge/OZG-konform-green)](https://www.onlinezugangsgesetz.de)
[![Made in Germany](https://img.shields.io/badge/Made_in-Germany-black)](https://aitema.de)

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
