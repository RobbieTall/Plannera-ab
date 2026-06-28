#!/usr/bin/env bash
set -u

if [[ -z "${BASE_URL:-}" || -z "${INGEST_ADMIN_SECRET:-}" ]]; then
  cat >&2 <<'USAGE'
Usage: BASE_URL="https://your-app.vercel.app" INGEST_ADMIN_SECRET="..." npm run ingest:production

Both BASE_URL and INGEST_ADMIN_SECRET must be set.
USAGE
  exit 1
fi

BASE_URL="${BASE_URL%/}"

run_step() {
  local method="$1"
  local label="$2"
  local path="$3"
  local url="${BASE_URL}${path}"
  local body_file
  body_file="$(mktemp)"

  printf '\n============================================================\n'
  printf '%s\n' "$label"
  printf '%s %s\n' "$method" "$url"
  printf '============================================================\n'

  local status
  status="$(curl --silent --show-error --location --request "$method" --output "$body_file" --write-out '%{http_code}' "$url")"
  cat "$body_file"
  printf '\nHTTP status: %s\n' "$status"
  rm -f "$body_file"

  if [[ ! "$status" =~ ^2[0-9][0-9]$ ]]; then
    printf 'ERROR: %s failed with HTTP status %s\n' "$label" "$status" >&2
    exit 1
  fi
}

SECRET_QUERY="secret=${INGEST_ADMIN_SECRET}"

run_step "POST" "1. Ingest all LEPs + EPA fixtures" "/api/admin/ingest-legislation?${SECRET_QUERY}"
run_step "POST" "2. Ingest Byron LEP explicitly" "/api/admin/ingest-legislation?${SECRET_QUERY}&lga=BYRON"
run_step "POST" "3. Ingest Kempsey LEP explicitly" "/api/admin/ingest-legislation?${SECRET_QUERY}&lga=KEMPSEY"
run_step "POST" "4. Ingest Byron DCP" "/api/admin/ingest-council-dcp?${SECRET_QUERY}&lga=BYRON"
run_step "GET" "5. Final ingest status summary" "/api/admin/ingest-status?${SECRET_QUERY}"
