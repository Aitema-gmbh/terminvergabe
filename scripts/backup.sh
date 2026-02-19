#!/usr/bin/env bash
# ============================================================
# aitema|Termin - PostgreSQL Backup Script
# ============================================================
# Crontab (täglich um 02:00):
#   0 2 * * * /opt/aitema/terminvergabe/scripts/backup.sh >> /var/log/termin-backup.log 2>&1
# ============================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BACKUP_DIR="/opt/aitema/terminvergabe/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="termin-postgres-prod"

# Load env vars (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB)
ENV_FILE="/opt/aitema/terminvergabe/.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

DB_USER="${POSTGRES_USER:-termin}"
DB_NAME="${POSTGRES_DB:-terminvergabe}"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Optional S3/MinIO upload
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
S3_ENDPOINT="${S3_BACKUP_ENDPOINT:-}"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
log "========== Backup gestartet =========="

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Run pg_dump inside the Docker container
log "Erstelle Backup: ${BACKUP_FILE}"
docker exec "$CONTAINER_NAME" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --format=plain --no-owner --no-acl \
  | gzip > "$BACKUP_FILE"

# Verify backup
BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
if [[ "$BACKUP_SIZE" -lt 100 ]]; then
  log "FEHLER: Backup-Datei zu klein (${BACKUP_SIZE} Bytes). Backup vermutlich fehlgeschlagen."
  exit 1
fi
log "Backup erfolgreich: ${BACKUP_FILE} ($(numfmt --to=iec "$BACKUP_SIZE" 2>/dev/null || echo "${BACKUP_SIZE} Bytes"))"

# ---------------------------------------------------------------------------
# Retention: Delete backups older than RETENTION_DAYS
# ---------------------------------------------------------------------------
log "Lösche Backups älter als ${RETENTION_DAYS} Tage..."
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
log "Gelöschte alte Backups: ${DELETED}"

# ---------------------------------------------------------------------------
# Optional: S3/MinIO Upload
# ---------------------------------------------------------------------------
if [[ -n "$S3_BUCKET" ]]; then
  log "Lade Backup zu S3 hoch: s3://${S3_BUCKET}/$(basename "$BACKUP_FILE")"

  S3_CMD_ARGS=""
  if [[ -n "$S3_ENDPOINT" ]]; then
    S3_CMD_ARGS="--endpoint-url $S3_ENDPOINT"
  fi

  if command -v aws &>/dev/null; then
    # shellcheck disable=SC2086
    aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/$(basename "$BACKUP_FILE")" $S3_CMD_ARGS
    log "S3 Upload erfolgreich."
  elif command -v mc &>/dev/null; then
    mc cp "$BACKUP_FILE" "${S3_BUCKET}/$(basename "$BACKUP_FILE")"
    log "MinIO Upload erfolgreich."
  else
    log "WARNUNG: Weder aws-cli noch mc (MinIO Client) gefunden. S3-Upload übersprungen."
  fi
fi

log "========== Backup abgeschlossen =========="
