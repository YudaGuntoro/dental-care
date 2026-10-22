#!/usr/bin/env bash
# Routine updates for the EXISTING Toho VPS. Pull the repository before running.
set -Eeuo pipefail
umask 077

case "${1:-}" in
  fe) services=(fe) ;;
  be) services=(api) ;;
  both|fe-be) services=(api fe) ;;
  *) echo 'Usage: bash deploy/update-vps.sh {fe|be|both}' >&2; exit 2 ;;
esac

[[ "$(id -u)" == 0 ]] || { echo 'Run as root: sudo -i' >&2; exit 1; }
for required in docker curl; do command -v "$required" >/dev/null; done
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
docker info >/dev/null

stamp="$(date -u +%Y%m%dT%H%M%SZ)-$$"
snapshot="/root/wms-toho-updates/$stamp"
mkdir -p "$snapshot"
chmod 700 "$snapshot"

# Save the running configuration BEFORE changing anything. Never print secrets.
for service in "${services[@]}"; do
  name="wms-toho-$service"
  docker inspect "$name" > "$snapshot/$service.inspect.json"
  docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$name" > "$snapshot/$service.env"
  docker inspect --format '{{range .Mounts}}{{.Type}}|{{if .Name}}{{.Name}}{{else}}{{.Source}}{{end}}|{{.Destination}}|{{.RW}}{{println}}{{end}}' "$name" > "$snapshot/$service.mounts"
  docker inspect --format '{{range $key, $value := .NetworkSettings.Networks}}{{println $key}}{{end}}' "$name" > "$snapshot/$service.networks"
  docker inspect --format '{{range .HostConfig.ExtraHosts}}{{println .}}{{end}}' "$name" > "$snapshot/$service.hosts"
  docker inspect --format '{{.HostConfig.NetworkMode}}' "$name" > "$snapshot/$service.primary-network"
  chmod 600 "$snapshot/$service.env" "$snapshot/$service.inspect.json"
  if [[ "$service" == api ]]; then
    test -f Dockerfile.api
    # This is the confirmed VPS setup; stop rather than replace working credentials.
    grep -Eqi '^ConnectionStrings__DefaultConnection=.*Server=mysql_vps(;|$)' "$snapshot/api.env" || {
      echo 'API database host is not mysql_vps. No container was replaced. See docs/deploy-vps.md.' >&2
      exit 1
    }
    docker inspect mysql_vps >/dev/null
    docker network inspect wms-toho-net >/dev/null
    docker network inspect wms-toho-net --format '{{range .Containers}}{{println .Name}}{{end}}' | grep -qx mysql_vps || {
      echo 'mysql_vps is not on wms-toho-net. No container was replaced.' >&2
      exit 1
    }
  else
    test -f Dockerfile.fe
  fi
done

# A failed build leaves every running service untouched.
for service in "${services[@]}"; do
  if [[ "$service" == api ]]; then
    docker build -f Dockerfile.api -t wms-toho-api:latest .
  else
    docker build -f Dockerfile.fe --build-arg NEXT_PUBLIC_API_BASE_URL="" -t wms-toho-fe:latest .
  fi
done

wait_ready() {
  local service="$1" code attempt endpoint
  if [[ "$service" == api ]]; then endpoint='http://127.0.0.1:5279/api/parts';
  else endpoint='http://127.0.0.1:8098/signin'; fi
  for ((attempt=1; attempt<=30; attempt++)); do
    code="$(curl --max-time 3 -s -o /dev/null -w '%{http_code}' "$endpoint" || true)"
    if [[ "$service" == api && ( "$code" == 401 || "$code" == 200 ) ]] ||
       [[ "$service" == fe && "$code" == 200 ]]; then return 0; fi
    sleep 2
  done
  return 1
}

restore_previous() {
  local name="$1" previous="$2"
  if docker inspect "$name" >/dev/null 2>&1; then docker rm -f "$name" >/dev/null; fi
  docker rename "$previous" "$name"
  docker start "$name" >/dev/null
}

for service in "${services[@]}"; do
  name="wms-toho-$service"
  previous="$name-previous-$stamp"
  network="$(cat "$snapshot/$service.primary-network")"
  [[ "$network" != default ]] || network=bridge
  args=(--detach --name "$name" --restart unless-stopped --env-file "$snapshot/$service.env")
  if [[ "$service" == api ]]; then
    network=wms-toho-net
    args+=(--publish 5279:8080 --env ASPNETCORE_URLS=http://0.0.0.0:8080)
  else
    args+=(--publish 8098:3000 --env HOSTNAME=0.0.0.0 --env PORT=3000)
  fi
  args+=(--network "$network")
  while IFS='|' read -r mount_type source target writable; do
    [[ -n "$mount_type" ]] || continue
    case "$mount_type" in
      bind|volume)
        mount="type=$mount_type,source=$source,target=$target"
        [[ "$writable" != false ]] || mount+=',readonly'
        args+=(--mount "$mount") ;;
      *) echo "Unsupported mount type: $mount_type. No replacement was started." >&2; exit 1 ;;
    esac
  done < "$snapshot/$service.mounts"
  while IFS= read -r host; do [[ -z "$host" ]] || args+=(--add-host "$host"); done < "$snapshot/$service.hosts"

  docker stop "$name" >/dev/null
  if ! docker rename "$name" "$previous"; then docker start "$name" >/dev/null; exit 1; fi
  trap 'restore_previous "$name" "$previous"; exit 1' ERR
  if ! docker run "${args[@]}" "$name:latest"; then
    restore_previous "$name" "$previous"
    exit 1
  fi
  while IFS= read -r extra_network; do
    if [[ -n "$extra_network" && "$extra_network" != "$network" ]]; then
      docker network connect "$extra_network" "$name"
    fi
  done < "$snapshot/$service.networks"
  if ! wait_ready "$service"; then
    docker logs --tail 40 "$name" >&2
    restore_previous "$name" "$previous"
    echo "$name did not become ready; the previous container was restored." >&2
    exit 1
  fi
  trap - ERR
  docker rm "$previous" >/dev/null
  echo "Updated $name successfully."
done

# Routine updates do not change MySQL, run SQL migrations, or rewrite/reload Nginx.
echo "Configuration snapshots: $snapshot"
docker ps --filter name=wms-toho
