#!/usr/bin/env bash
set -euo pipefail

# ==============================================================
# import-db.sh — Restore dumped database to target PostgreSQL
#
# Usage:
#   1. Transfer the dump file to the machine that can reach the target DB
#   2. Get your NEW Render external connection string from Dashboard
#   3. Run:
#
#   ./scripts/import-db.sh ./reviewos-backup-20260401.dump
#   ./scripts/import-db.sh ./reviewos-backup-20260401.dump "postgres://user:pass@host:5432/dbname"
#
# Notes:
#   - The database must already exist (Render auto-creates it)
#   - Uses 4 parallel restore jobs for speed
#   - Drops existing public schema before restore (clean slate)
# ==============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ $# -lt 1 ]; then
    echo -e "${RED}✗ Usage: $0 <dump-file> [database-url]${NC}"
    echo ""
    echo "  If database-url is omitted, you will be prompted to paste it."
    echo ""
    echo "  Examples:"
    echo "    $0 ./reviewos-backup-20260401.dump"
    echo "    $0 ./reviewos-backup-20260401.dump \"postgres://user:pass@host:5432/dbname\""
    exit 1
fi

DUMP_FILE="$1"

if [ ! -f "$DUMP_FILE" ]; then
    echo -e "${RED}✗ Dump file not found: ${DUMP_FILE}${NC}"
    exit 1
fi

# Validate dump file format
FILE_TYPE=$(file "$DUMP_FILE")
if echo "$FILE_TYPE" | grep -qi "PostgreSQL"; then
    echo -e "${GREEN}✓ Dump file recognized as PostgreSQL custom format${NC}"
else
    echo -e "${YELLOW}⚠ File type check ambiguous: ${FILE_TYPE}${NC}"
    echo -e "${YELLOW}  Proceeding anyway; pg_restore will validate it.${NC}"
fi

if [ $# -ge 2 ]; then
    DB_URL="$2"
    echo -e "${GREEN}✓ Database URL provided as argument${NC}"
else
    echo -e "${YELLOW}Enter your NEW Render external database URL:${NC}"
    echo "  (paste from new DB's Render Dashboard → Info → Connections → External)"
    read -r -s DB_URL
    echo ""
fi

if [ -z "$DB_URL" ]; then
    echo -e "${RED}✗ No database URL provided. Aborting.${NC}"
    exit 1
fi

# Normalize postgres:// → postgresql://
if [[ "$DB_URL" == postgres://* ]]; then
    DB_URL="${DB_URL/postgres:\/\//postgresql://}"
    echo -e "${YELLOW}ℹ Normalized URL scheme to postgresql://${NC}"
fi

echo ""
echo -e "${YELLOW}Step 1: Testing connection to target...${NC}"
pg_isready -d "$DB_URL" -t 10
echo -e "${GREEN}✓ Connection OK${NC}"

echo ""
echo -e "${YELLOW}Step 2: Dropping existing public schema (clean slate)...${NC}"
psql -d "$DB_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;" 2>&1
echo -e "${GREEN}✓ Schema reset complete${NC}"

echo ""
echo -e "${YELLOW}Step 3: Restoring from dump file...${NC}"
echo "  Source: ${DUMP_FILE}"
echo "  Parallel jobs: 4"
echo ""

pg_restore \
    -v \
    --no-owner \
    --no-acl \
    -j 4 \
    --dbname="$DB_URL" \
    "$DUMP_FILE"

echo ""
echo -e "${GREEN}✓ Restore complete!${NC}"

echo ""
echo -e "${YELLOW}Step 4: Running integrity check...${NC}"
# Compare table row counts between original summary (if available) and restored DB
echo "  Counting rows across all tables..."
TABLE_COUNT=$(psql -d "$DB_URL" -t -A -c "
    SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
")
echo "  Tables restored: ${TABLE_COUNT}"

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Row counts per table:${NC}"
    psql -d "$DB_URL" -c "
        SELECT
            relname AS table_name,
            n_live_tup AS estimated_rows
        FROM pg_stat_user_tables
        ORDER BY relname;
    "
    echo -e "${YELLOW}ℹ Row counts are estimates until you VACUUM ANALYZE.${NC}"
fi

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}  Migration complete!              ${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo "Verify your application connects to the NEW database URL, then:"
echo "  1. Update DATABASE_URL in Render environment variables"
echo "  2. Restart your services"
echo "  3. Run smoke tests"
echo "  4. Once confirmed working, delete the old database from Render"
