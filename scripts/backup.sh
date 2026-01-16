#!/bin/bash

# Backup script for AI Research System production data
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

mkdir -p "$BACKUP_PATH"

echo "📦 Creating backup at $BACKUP_PATH..."

# Backup database
echo "🗄️  Backing up database..."
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U ${DB_USER:-ai_research_user} ${DB_NAME:-ai_research_db} > "$BACKUP_PATH/database.sql"

# Backup media files
echo "📁 Backing up media files..."
tar -czf "$BACKUP_PATH/media.tar.gz" media/

# Backup Redis data (if persistent)
if [ -d "redis_data" ]; then
    echo "🔄 Backing up Redis data..."
    docker-compose -f docker-compose.prod.yml exec -T redis redis-cli SAVE
    tar -czf "$BACKUP_PATH/redis.tar.gz" redis_data/
fi

# Create archive
echo "📦 Creating backup archive..."
cd "$BACKUP_DIR"
tar -czf "backup_$TIMESTAMP.tar.gz" "backup_$TIMESTAMP"
rm -rf "backup_$TIMESTAMP"
cd ..

echo "✅ Backup complete: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete
