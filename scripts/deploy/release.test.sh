#!/usr/bin/env bash
# Local fixtures only: never contacts a server, sudo, systemd or PostgreSQL.
set -Eeuo pipefail
script="$(cd "$(dirname "$0")" && pwd)/release.sh"
temp="$(mktemp -d)"
trap 'rm -rf "$temp"' EXIT
mkdir "$temp/bin"
export PATH="$temp/bin:$PATH"
export EVENTS="$temp/events" SCENARIO=success
sed 's@/usr/bin/node@node@g' "$script" > "$temp/release.sh"
script="$temp/release.sh"

# Windows cannot create Unix symlinks here. Only the fixture substitutes links;
# Ubuntu CI exercises real atomic symlink switches and flock.
case "$(uname -s)" in
  MINGW*|MSYS*)
    printf '#!/usr/bin/env bash\nprintf "%%s\\n" "$2" > "$3"\n' > "$temp/bin/ln"
    printf '#!/usr/bin/env bash\ncat "${@: -1}"\n' > "$temp/bin/readlink"
    ;;
esac

cat > "$temp/bin/node" <<'STUB'
#!/usr/bin/env bash
echo migration >> "$EVENTS"
[[ "$SCENARIO" != migrate_fail ]]
STUB

cat > "$temp/bin/sudo" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$EVENTS"
case "$*" in
  *valrify-backup) [[ "$SCENARIO" != backup_fail ]] ;;
  *systemctl*) [[ "$SCENARIO" != restart_fail ]] ;;
  *) exit 99 ;;
esac
STUB
cat > "$temp/bin/curl" <<'STUB'
#!/usr/bin/env bash
if [[ "$SCENARIO" == health_fail || "$SCENARIO" == rollback_fail ]]; then
  [[ "$(readlink -e "$DEPLOY_TEST_ROOT/current")" == "$DEPLOY_TEST_ROOT/releases/baseline" && "$SCENARIO" != rollback_fail ]] || exit 22
fi
case "$*" in
  *api/health*) echo '{"status":"ok"}' ;;
  *admin/overview*) printf 401 ;;
  */rekber*) echo 'Valrify belum berafiliasi dengan rekber mana pun. <link href="/_next/static/test.css">' ;;
  *.css*) exit 0 ;;
  *) exit 99 ;;
esac
STUB
printf '#!/usr/bin/env bash\nexit 0\n' > "$temp/bin/sleep"
# Git Bash has no flock; the real lock is exercised in Ubuntu CI below.
if ! command -v flock >/dev/null; then
  printf '#!/usr/bin/env bash\nexit 0\n' > "$temp/bin/flock"
fi
chmod +x "$temp/bin/"*

sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
id="$sha-123-1"
for scenario in success backup_fail migrate_fail health_fail restart_fail rollback_fail checksum_fail revision_fail invalid_id; do
  export SCENARIO="$scenario" DEPLOY_TEST_ROOT="$temp/$scenario"
  root="$DEPLOY_TEST_ROOT"
  mkdir -p "$root/releases/baseline/api" "$root/releases/baseline/web" "$root/shared" "$root/incoming/$id" "$root/package/api/dist" "$root/package/api/scripts" "$root/package/web/apps/web"
  ln -s "$root/releases/baseline" "$root/current"
  printf 'DATABASE_URL=postgresql://unused\n' > "$root/shared/api.env"
  : > "$root/shared/web.env"
  : > "$root/package/api/dist/main.js"
  : > "$root/package/web/apps/web/server.js"
  : > "$root/package/api/scripts/migrate.cjs"
  printf '%s\n' "$sha" > "$root/package/REVISION"
  [[ "$scenario" != revision_fail ]] || printf 'wrong\n' > "$root/package/REVISION"
  tar -czf "$root/incoming/$id/valrify-linux-x64.tar.gz" -C "$root/package" .
  (cd "$root/incoming/$id" && sha256sum valrify-linux-x64.tar.gz > valrify-linux-x64.tar.gz.sha256)
  [[ "$scenario" != checksum_fail ]] || printf 'corrupt' >> "$root/incoming/$id/valrify-linux-x64.tar.gz"
  : > "$EVENTS"
  target="$id"
  [[ "$scenario" != invalid_id ]] || target=../../escape
  result=0
  bash "$script" "$root" "$target" > "$root/output" 2>&1 || result=$?
  if [[ "$scenario" == success ]]; then
    [[ "$result" == 0 && "$(readlink -e "$root/current")" == "$root/releases/$id" ]]
    [[ "$(sed -n '1p' "$EVENTS")" == '-n /usr/local/sbin/valrify-backup' ]]
    [[ "$(sed -n '2p' "$EVENTS")" == migration ]]
    [[ "$(sed -n '3p' "$EVENTS")" == '-n /usr/bin/systemctl restart valrify-api.service valrify-web.service' ]]
  else
    [[ "$result" != 0 && "$(readlink -e "$root/current")" == "$root/releases/baseline" ]]
    case "$scenario" in
      backup_fail) ! grep -q 'migration\|systemctl' "$EVENTS" ;;
      migrate_fail) ! grep -q systemctl "$EVENTS" ;;
      checksum_fail|revision_fail|invalid_id) [[ ! -s "$EVENTS" ]] ;;
      health_fail) grep -q 'Previous application restored' "$root/output" ;;
      restart_fail|rollback_fail) grep -q 'ROLLBACK FAILED' "$root/output" ;;
    esac
  fi
  echo "PASS $scenario"
done

if [[ "$(uname -s)" == Linux ]]; then
  export DEPLOY_TEST_ROOT="$temp/success" SCENARIO=success
  : > "$EVENTS"
  (cd "$DEPLOY_TEST_ROOT" && flock -x 8 && bash "$script" "$DEPLOY_TEST_ROOT" "$sha-124-1" > "$temp/locked" 2>&1) 8> "$DEPLOY_TEST_ROOT/.deploy.lock" && exit 1
  grep -q 'Another deployment is running' "$temp/locked"
  [[ ! -s "$EVENTS" ]]
  echo 'PASS concurrent deployment rejected'
fi
