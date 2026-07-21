#!/usr/bin/env bash
set -euo pipefail

# ==============================================================
# export-db.sh — Export Render PostgreSQL to compressed dump file
#
# Usage:
#   1. Get your external connection string from Render Dashboard:
#      Your DB → Info → Connections → "External" → copy the URL
#   2. Run this script and paste the URL when prompted (or pass as arg):
#
#   ./scripts/export-db.sh
#   ./scripts/export-db.sh "postgres://user:pass@host:5432/dbname"
#
# Output:  reviewos-backup-YYYYMMDD.dump  (custom-format, compressed)
# ==============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

OUTPUT_DIR="."

if [ $# -ge 1 ]; then
    DB_URL="$1"
    echo -e "${GREEN}✓ Database URL provided as argument${NC}"
else
    echo -e "${YELLOW}Enter your Render external database URL:${NC}"
    echo "  (paste from Render Dashboard → Info → Connections → External)"
    read -r -s DB_URL
    echo ""
fi

if [ -z "$DB_URL" ]; then
    echo -e "${RED}✗ No database URL provided. Aborting.${NC}"
    exit 1
fi

# Normalize postgres:// → postgresql:// (pg_dump needs the latter)
if [[ "$DB_URL" == postgres://* ]]; then
    DB_URL="${DB_URL/postgres:\/\//postgresql://}"
    echo -e "${YELLOW}ℹ Normalized URL scheme to postgresql://${NC}"
fi

echo ""
echo -e "${YELLOW}Step 1: Testing connection...${NC}"
pg_isready -d "$DB_URL" -t 10
echo -e "${GREEN}✓ Connection OK${NC}"

TIMESTAMP=$(date +%Y%m%d)
OUTPUT_FILE="${OUTPUT_DIR}/reviewos-backup-${TIMESTAMP}.dump"

echo ""
echo -e "${YELLOW}Step 2: Exporting database...${NC}"
echo "  Output: ${OUTPUT_FILE}"
echo "  Format: custom (compressed, parallel-restore capable)"
echo ""

pg_dump \
    -Fc \
    -v \
    --no-owner \
    --no-acl \
    --dbname="$DB_URL" \
    -f "$OUTPUT_FILE"

echo ""
echo -e "${GREEN}✓ Export complete!${NC}"

# Verify file exists and has reasonable size
if [ -f "$OUTPUT_FILE" ]; then
    SIZE=$(stat -c%s "$OUTPUT_FILE" 2>/dev/null || stat -f%z "$OUTPUT_FILE" 2>/dev/null)
    if [ "$SIZE" -gt 1000 ]; then  # at least 1 KB
        echo -e "${GREEN}✓ Dump file created: ${OUTPUT_FILE} ($(numfmt --to=iec $SIZE 2>/dev/null || echo "$SIZE bytes"))${NC}"
    else
        echo -e "${RED}✗ Dump file appears too small (${SIZE} bytes). Something may be wrong.${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Dump file not found. Export may have failed.${NC}"
    exit 1
fi

echo ""
echo "Next step: Run  ./scripts/import-db.sh  on the target machine"
echo "           with your NEW Render database URL and this dump file."
