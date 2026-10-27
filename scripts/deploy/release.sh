#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Called as deploy, never root. The root contains incoming/, releases/, shared/.
root="$(realpath -e "${1:?deployment root required}")"
id="${2:?release id required}"
[[ "$id" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || { echo 'Invalid release id'; exit 1; }
sha="${id:0:40}"
cd "$root"
exec 9> .deploy.lock
flock -n 9 || { echo 'Another deployment is running'; exit 1; }
previous="$(readlink -e current)"
[[ "$previous" == "$root/releases/"* && -d "$previous/api" && -d "$previous/web" ]]
[[ -f shared/api.env && -f shared/web.env ]]
[[ ! -e "releases/$id" && ! -L "releases/$id" ]]
switched=0

health() {
  local body css attempt
  for attempt in {1..15}; do
    if curl -fsS --max-time 5 http://127.0.0.1:3001/api/health | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' &&
      body="$(curl -fsS --max-time 5 http://127.0.0.1:3000/rekber)" &&
      [[ "$body" == *'Valrify belum berafiliasi dengan rekber mana pun.'* ]] &&
      css="$(printf '%s' "$body" | grep -oE '/_next/static/[^" ]+\.css' | head -n 1)" &&
      [[ -n "$css" ]] &&
      curl -fsS --max-time 5 "http://127.0.0.1:3000$css" -o /dev/null &&
      [[ "$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/admin/overview)" == 401 ]]; then
      return 0
    fi
    sleep 2
  done
  return 1
}

activate() {
  ln -s "$1" "$root/.current-next"
  mv -Tf "$root/.current-next" "$root/current"
}

failed() {
  trap - ERR HUP INT TERM
  if (( switched )); then
    echo 'Deployment failed; restoring previous application (database is not reverted).'
    rm -f "$root/.current-next"
    if activate "$previous" &&
      sudo -n /usr/bin/systemctl restart valrify-api.service valrify-web.service && health; then
      echo 'Previous application restored; deployment remains failed.'
    else
      echo 'ROLLBACK FAILED: operator intervention required.' >&2
    fi
  else
    echo 'Deployment failed before activation; previous services were not restarted.' >&2
  fi
  exit 1
}
trap failed ERR HUP INT TERM

cd "$root/incoming/$id"
sha256sum --check valrify-linux-x64.tar.gz.sha256
mkdir "$root/releases/$id"
tar -xzf valrify-linux-x64.tar.gz -C "$root/releases/$id" --no-same-owner
release="$root/releases/$id"
[[ "$(cat "$release/REVISION")" == "$sha" ]]
[[ -f "$release/api/dist/main.js" && -f "$release/api/scripts/migrate.cjs" && -f "$release/web/apps/web/server.js" ]]
[[ -z "$(find "$release" -name '.env*' -print -quit)" ]]
echo "Prepared release $id; backing up before database migration."
sudo -n /usr/local/sbin/valrify-backup
cd "$release/api"
NODE_ENV=production /usr/bin/node --env-file="$root/shared/api.env" scripts/migrate.cjs

switched=1
activate "$release"
sudo -n /usr/bin/systemctl restart valrify-api.service valrify-web.service
health
trap - ERR HUP INT TERM
echo "Deployment successful: $id"
# shortcut: releases are retained for manual rollback; add bounded cleanup when disk usage warrants it.
