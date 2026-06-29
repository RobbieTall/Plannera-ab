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

# Individual SEPPs are now ingested as part of ingest:production. The npm run ingest:sepps
# script remains available for local/direct database ingestion outside the production HTTP runner.
run_step "POST" "4. Ingest SEPP Housing 2021" "/api/admin/ingest-legislation?${SECRET_QUERY}&slug=sepp-housing-2021"
run_step "POST" "5. Ingest SEPP Biodiversity 2021" "/api/admin/ingest-legislation?${SECRET_QUERY}&slug=sepp-biodiversity-conservation-2021"
run_step "POST" "6. Ingest SEPP Industry 2021" "/api/admin/ingest-legislation?${SECRET_QUERY}&slug=sepp-industry-employment-2021"
run_step "POST" "7. Ingest SEPP Planning Systems 2021" "/api/admin/ingest-legislation?${SECRET_QUERY}&slug=sepp-planning-systems-2021"
run_step "POST" "8. Ingest SEPP Primary Production 2021" "/api/admin/ingest-legislation?${SECRET_QUERY}&slug=sepp-primary-production-2021"
run_step "POST" "9. Ingest SEPP Resilience 2021" "/api/admin/ingest-legislation?${SECRET_QUERY}&slug=sepp-resilience-hazards-2021"
run_step "POST" "10. Ingest SEPP Resources and Energy 2021" "/api/admin/ingest-legislation?${SECRET_QUERY}&slug=sepp-resources-energy-2021"
run_step "POST" "11. Ingest SEPP Transport 2021" "/api/admin/ingest-legislation?${SECRET_QUERY}&slug=sepp-transport-infrastructure-2021"
run_step "POST" "12. Ingest SEPP Precincts (Central River City) 2021" "/api/admin/ingest-legislation?${SECRET_QUERY}&slug=sepp-precincts-central-river-city-2021"
run_step "POST" "13. Ingest SEPP Precincts (Eastern Harbour City) 2021" "/api/admin/ingest-legislation?${SECRET_QUERY}&slug=sepp-precincts-eastern-harbour-city-2021"
run_step "POST" "14. Ingest SEPP Precincts (Regional) 2021" "/api/admin/ingest-legislation?${SECRET_QUERY}&slug=sepp-precincts-regional-2021"
run_step "POST" "15. Ingest SEPP Precincts (Western Parkland City) 2021" "/api/admin/ingest-legislation?${SECRET_QUERY}&slug=sepp-precincts-western-parkland-city-2021"
run_step "POST" "16. Ingest SEPP Exempt & Complying 2008" "/api/admin/ingest-legislation?${SECRET_QUERY}&slug=sepp-exempt-complying-2008"

run_step "POST" "17. Ingest Byron DCP" "/api/admin/ingest-council-dcp?${SECRET_QUERY}&lga=BYRON"
run_step "GET" "18. Final ingest status summary" "/api/admin/ingest-status?${SECRET_QUERY}"
