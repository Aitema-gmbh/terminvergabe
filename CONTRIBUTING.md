# Beitragen zu aitema|Termin

Vielen Dank fuer dein Interesse an aitema|Termin\! Wir freuen uns ueber Beitraege
aus der Community. Dieses Dokument erklaert, wie du zum Projekt beitragen kannst.

## Verhaltenskodex

Wir erwarten von allen Beteiligten einen respektvollen und konstruktiven Umgang.
Diskriminierung, Beleidigung oder anderes schaedliches Verhalten wird nicht toleriert.

## Wie kann ich beitragen?

### Fehler melden

1. Pruefe, ob der Fehler bereits als [Issue](https://github.com/aitema-gmbh/terminvergabe/issues) gemeldet wurde
2. Erstelle ein neues Issue mit:
   - Klare Beschreibung des Problems
   - Schritte zur Reproduktion
   - Erwartetes vs. tatsaechliches Verhalten
   - Screenshots (falls relevant)
   - Umgebung (Browser, OS, Docker-Version)

### Feature vorschlagen

1. Oeffne ein Issue mit dem Label `enhancement`
2. Beschreibe das gewuenschte Feature und den Anwendungsfall
3. Erklaere, welches Modul betroffen ist (Buerger, Mitarbeiter, Admin, Hardware)

### Code beitragen

#### Voraussetzungen

- Node.js 22+
- Docker und Docker Compose
- Git

#### Fork und Branch Workflow

```bash
# 1. Repository forken (ueber GitHub UI)

# 2. Fork klonen
git clone https://github.com/DEIN-USER/terminvergabe.git
cd terminvergabe

# 3. Upstream hinzufuegen
git remote add upstream https://github.com/aitema-gmbh/terminvergabe.git

# 4. Feature-Branch erstellen
git checkout -b feat/mein-feature

# 5. Aenderungen vornehmen und committen
git add .
git commit -m "feat: Beschreibung der Aenderung"

# 6. Branch pushen
git push origin feat/mein-feature

# 7. Pull Request ueber GitHub UI erstellen
```

#### Commit-Konventionen

Wir verwenden [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix    | Verwendung                              |
|-----------|-----------------------------------------|
| `feat:`   | Neues Feature                           |
| `fix:`    | Bugfix                                  |
| `docs:`   | Dokumentation                           |
| `style:`  | Formatierung (kein Code-Aenderung)      |
| `refactor:` | Refactoring                           |
| `test:`   | Tests hinzufuegen/aendern               |
| `chore:`  | Build, CI, Abhaengigkeiten              |

#### Code Style

**TypeScript (Backend + Frontends)**:
- Formatter: **Prettier** (automatische Formatierung)
- Linter: **ESLint** (Code-Qualitaet)
- Strikte TypeScript-Konfiguration (`strict: true`)
- Zeilenlaenge: 100 Zeichen

```bash
# Vor dem Commit ausfuehren
cd backend
npm run lint -- --fix
npm run format

# Svelte-Check (Frontends)
cd frontend-buerger
npm run check
```

**Svelte (Frontends)**:
- `svelte-check` fuer Type-Checking
- Alle Komponenten mit TypeScript (`<script lang="ts">`)
- Barrierefreiheit: ARIA-Labels pflegen

#### Tests schreiben

- Jede neue Funktion muss mit Tests abgedeckt sein
- Backend: **Vitest** mit Prisma-Mocking
- E2E: **Playwright** fuer kritische Buchungsstrecken
- Mindestens Unit-Tests fuer Services und Utilities

```bash
# Backend-Tests
cd backend
npm test

# Einzelnen Test ausfuehren
npx vitest run src/services/booking.service.test.ts

# E2E-Tests (Playwright)
cd tests
npx playwright test

# E2E mit UI
npx playwright test --ui
```

#### Wichtige Hinweise

- **Prisma-Schema**: Bei Aenderungen an `prisma/schema.prisma` immer eine Migration erstellen:
  ```bash
  cd backend && npx prisma migrate dev --name beschreibung
  ```
- **i18n**: Neue UI-Texte muessen in allen Sprachen angelegt werden (DE/EN/TR/AR/UK)
- **Barrierefreiheit**: WCAG 2.1 AA einhalten, axe-DevTools zur Pruefung nutzen

### Pull Request erstellen

1. PR-Titel folgt Conventional Commits
2. Beschreibung enthaelt:
   - Was wurde geaendert?
   - Warum wurde es geaendert?
   - Wie kann es getestet werden?
3. CI muss gruen sein (Linting, Tests, Build)
4. Mindestens ein Review erforderlich
5. Neue Uebersetzungen muessen vollstaendig sein

## Fragen?

- GitHub Discussions: [Diskussionen](https://github.com/aitema-gmbh/terminvergabe/discussions)
- E-Mail: dev@aitema.de

Vielen Dank fuer deinen Beitrag\!
