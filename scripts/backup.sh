#!/bin/bash
# BOMS Backup Script - isolated to boms_uploads_data volume only
# Runs daily via cron: 0 2 * * * /var/www/boms/scripts/backup.sh

BACKUP_DIR="/var/backups/boms"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/boms_uploads_$DATE.tar.gz"

mkdir -p "$BACKUP_DIR"

# Backup only BOMS uploads volume (no cross-contamination with other sites)
docker run --rm \
  -v boms_uploads_data:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/boms_uploads_$DATE.tar.gz" -C /data .

# Keep last 7 days of backups only
find "$BACKUP_DIR" -name "boms_uploads_*.tar.gz" -mtime +7 -delete

echo "[$DATE] BOMS backup completed: $BACKUP_FILE"
