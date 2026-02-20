# CI/CD Workflow-Dateien

Die GitHub Actions Workflow-Dateien liegen in diesem Verzeichnis (`ci/`), da der
verwendete GitHub-Token (OAuth App) keinen `workflow`-Scope hat und daher keine
Dateien unter `.github/workflows/` pushen kann.

## Einrichtung (einmalig)

Um die Workflows zu aktivieren, muss ein GitHub-User mit ausreichenden Rechten
die Datei manuell nach `.github/workflows/` kopieren:

```bash
# Lokal auschecken
git clone git@github.com:Aitema-gmbh/terminvergabe.git
cd terminvergabe

# Workflow-Datei kopieren
mkdir -p .github/workflows
cp ci/ci.yml .github/workflows/ci.yml

# Committen mit einem Token/SSH-Key mit workflow-Scope
git add .github/workflows/ci.yml
git commit -m "ci: activate GitHub Actions workflow"
git push origin main
```

Alternativ: Die Datei direkt im GitHub Web-Interface anlegen und den Inhalt
aus `ci/ci.yml` einfuegen.

## Secrets (in GitHub Repository Settings > Secrets)

| Secret | Beschreibung |
|--------|-------------|
| `DEPLOY_SSH_KEY` | Privater SSH-Key fuer Deployment auf Hetzner (49.13.15.44) |
| `GHCR_TOKEN` | GitHub Personal Access Token mit `read:packages` + `write:packages` Scope |

## Workflow-Uebersicht

- **backend**: Node 20, PostgreSQL 16 + Redis 7 Service Containers, vitest + coverage
- **frontend-buerger**: Node 20, svelte-check + npm run build
- **frontend-mitarbeiter**: Node 20, svelte-check + npm run build
- **build-docker**: Multi-stage Matrix-Build (backend, frontend-buerger, frontend-mitarbeiter), Push zu GHCR
- **deploy**: SSH auf Hetzner + `prisma migrate deploy` + health check
