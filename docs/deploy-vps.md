# Toho Technology Indonesia - VPS update commands

This is the permanent reference for the current VPS. Routine updates reuse the
working configuration and do not ask for database settings or passwords again.

## Confirmed installation

| Setting | Current value |
| --- | --- |
| Repository directory | `/www/wwwroot/wms-toho` |
| Git branch | `main` |
| Domain | `https://wms.toho.my.id` |
| Frontend image / container | `wms-toho-fe:latest` / `wms-toho-fe` |
| Frontend published port | `8098:3000` |
| Backend image / container | `wms-toho-api:latest` / `wms-toho-api` |
| Backend published port | `5279:8080` |
| Backend + MySQL network | `wms-toho-net` |
| MySQL container / connection host | `mysql_vps` |
| MySQL database / port | `wms-system-toho` / `3306` |
| Existing API environment file | `/root/wms-toho-api.env` (server only) |
| Nginx virtual host | `/www/server/panel/vhost/nginx/wms.toho.my.id.conf` |
| Dockerfiles on VPS | `Dockerfile.fe`, `Dockerfile.api` |

Run the commands as root. If logged in as `ubuntu`, first run `sudo -i`.
The Dockerfiles already exist on the VPS; do not replace them during routine
updates. Credentials are server-side only and are never stored in this guide.

## Update frontend only

```bash
cd /www/wwwroot/wms-toho
git pull --ff-only origin main && bash deploy/update-vps.sh fe
```

Only the frontend is rebuilt and restarted. Backend and MySQL are untouched.

## Update backend only

```bash
cd /www/wwwroot/wms-toho
git pull --ff-only origin main && bash deploy/update-vps.sh be
```

Only the backend is rebuilt and restarted. Its current environment, credentials,
mounts, extra hosts and network memberships are captured and reused. The primary
backend network remains `wms-toho-net`; the database host remains `mysql_vps`.

## Update frontend and backend

```bash
cd /www/wwwroot/wms-toho
git pull --ff-only origin main && bash deploy/update-vps.sh both
```

Both images are built before either service is stopped. The backend is updated
first, then the frontend. `fe-be` is also accepted as a mode alias.

## What the update script preserves

`deploy/update-vps.sh` is tailored to the confirmed installation above:

- No password prompt: snapshot the live selected containers' environment into
  root-only files under `/root/wms-toho-updates/<timestamp>/` and reuse those files.
- Keep the confirmed ports, mounts, extra hosts and network memberships. Reuse
  the existing network; never delete or recreate the MySQL container/network.
- Build all selected images before stopping any selected service. A build failure
  leaves the running services untouched.
- Keep the previous container until the replacement is ready. Restore it if
  container creation or the readiness check fails.
- Wait for frontend `/signin` HTTP 200 and backend `/api/parts` HTTP 401 or 200.
  An unauthenticated API readiness response checks HTTP availability, not database
  authentication. Confirm login and application data after an update.
- No automatic SQL migration, credential reset, Nginx edit/reload, or MySQL restart.
  The part-location removal migration has already been applied manually on the VPS.
- Frontend browser requests stay same-origin `/api/...`. Do not change
  `NEXT_PUBLIC_API_BASE_URL` to a localhost URL or separate API port.

If preflight detects a missing container/network or a different API database host,
it stops before replacing a running container. Consult the recovery section only
when the working setup has actually changed. The script is for this known setup,
not a general-purpose Docker/Compose replacement; custom runtime features beyond
those listed above require updating the script first.

## Quick checks after any update

```bash
docker ps --filter name=wms-toho
curl -I https://wms.toho.my.id/signin
curl -I https://wms.toho.my.id/parts
docker logs --since 2m --tail 50 wms-toho-api
```

Check login, Staff List, and the Stock In part dropdown in the browser. Pages
should return no-store headers, with no `s-maxage=31536000`. Static assets keep
separate caching rules. A connection problem needs the latest API log; do not
rebuild the frontend or rerun SQL migrations to fix a database network problem.

## One-time configuration changes

Routine update commands above never repeat these steps. The following sections
are reference material for a new setup, recovery, or an explicitly requested
Nginx change. They do not need to be rerun for each deployment.

## Database recovery reference - not part of routine updates

The existing VPS database container is `mysql_vps`. This procedure adds it to
an application network without removing its existing networks. Enter the exact
MySQL username and password at the prompts. Credentials are not committed here.
The connection test must succeed before recreating the API. Run as root in Bash.

```bash
set -e
docker network inspect wms-toho-net >/dev/null 2>&1 || docker network create wms-toho-net
if ! docker network inspect wms-toho-net --format '{{range .Containers}}{{println .Name}}{{end}}' | grep -qx mysql_vps; then
  docker network connect wms-toho-net mysql_vps
fi

read -rp 'MySQL username: ' WMS_DB_USER
read -rsp 'MySQL password: ' WMS_DB_PASSWORD
echo

MYSQL_PWD="$WMS_DB_PASSWORD" docker run --rm --network wms-toho-net \
  -e MYSQL_PWD mysql:8.0 \
  mysql -h mysql_vps -u "$WMS_DB_USER" -D wms-system-toho -e 'SELECT 1 AS connection_ok;'

umask 077
printf 'ConnectionStrings__DefaultConnection=Server=mysql_vps;Port=3306;Database=wms-system-toho;User ID=%s;Password=%s;SslMode=None;AllowPublicKeyRetrieval=True;\n' \
  "$WMS_DB_USER" "$WMS_DB_PASSWORD" > /root/wms-toho-api.env
chmod 600 /root/wms-toho-api.env
unset WMS_DB_PASSWORD WMS_DB_USER

docker stop wms-toho-api
docker rm wms-toho-api
docker run -d --name wms-toho-api \
  --restart unless-stopped \
  --network wms-toho-net \
  --env-file /root/wms-toho-api.env \
  -p 5279:8080 wms-toho-api:latest
docker logs --tail 30 wms-toho-api
```

Retry login after the API starts. If the connection test reports `Access denied`,
check the exact username and its MySQL host grants before recreating the API.
If other runtime options are needed, retain them in the `docker run` command.

## Disable page and API caching on ALL routes

The production build renders all application routes dynamically through root
`dynamic = "force-dynamic"` and `revalidate = 0`. This includes `/`, `/signin`,
`/parts`, `/locations`, `/customers`, `/pic-cards`, `/users`, `/stock-in`,
`/stock-out`, and `/item-check`. Fetch requests use `cache: "no-store"`.
The API also returns no-store headers, including unauthorized responses.

After pulling, update the existing aaPanel virtual host at
`/www/server/panel/vhost/nginx/wms.toho.my.id.conf`:

1. Back up the existing virtual host configuration.
2. Preserve SSL certificates, HTTPS redirects, logging and ACME verification.
3. Remove the existing application proxy locations (`/`, `/api/`, `/_next/static/`)
   and competing static-extension locations. Check included proxy files as well.
4. Inside the site's `server` block include the checked-in configuration:

```nginx
include /www/wwwroot/wms-toho/deploy/nginx/wms-toho.locations.conf;
```

This file disables Nginx proxy caching and overrides stale upstream cache headers
for pages and `/api/`. Hashed JS/CSS retain one-year immutable caching, public
images/fonts can cache for seven days, and optimized images retain Next.js caching.
Do not apply no-store rules at server level to static assets. Do not add a second
`location /` or duplicate `/api/` block.

Validate and reload only after the configuration test succeeds:

```bash
nginx -t && /etc/init.d/nginx reload
```

Pulling application code alone does not update the active Nginx virtual host.
This repository does not contain the live VPS configuration or SSH credentials.

### Verify after deployment

```bash
for page in / /signin /parts /locations /customers /pic-cards /users /stock-in /stock-out /item-check; do
  curl -sSI "https://wms.toho.my.id$page"
done
curl -sSI https://wms.toho.my.id/api/parts
```

Every page must return `Cache-Control: no-store, no-cache, must-revalidate,
proxy-revalidate`, `Pragma: no-cache`, and `Expires: 0`. There must be no
`s-maxage=31536000`. An unauthenticated API request should return 401 with the
same no-store headers. Static assets should retain their own caching policy.

For repeatable production checks:

```bash
cd Frontend
npm run check:cache -- https://wms.toho.my.id
```

In browser Developer Tools > Network, login and navigate the admin pages.
Requests must target `https://wms.toho.my.id/api/...`, with no localhost, separate
API port, or mixed HTTP URL in the browser.

### Standalone production startup

With `output: "standalone"`, the frontend Docker runtime must copy
`.next/standalone` plus `.next/static` and `public`, and launch its `server.js`
with `HOSTNAME=0.0.0.0` and `PORT=3000`. Do not run `next start` for this output.

References: [Next.js headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)
and [Nginx proxy cache](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache).

## Testing the update script without a VPS

Run `python3 deploy/tests/test_update_vps.py` with Bash and Python 3.10+ available.
The test uses temporary directories and mocked Docker/curl functions; it never
contacts Docker, MySQL, or the VPS. It checks all three modes, configuration
preservation, build failure, failed container creation, readiness rollback, and
preflight rejection for the wrong DB host or missing shared MySQL network.
On Windows, set `WMS_TEST_BASH` to the Git for Windows `bash.exe` path.
