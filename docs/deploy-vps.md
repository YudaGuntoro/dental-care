# Dental Care VPS deployment

Use this guide for routine Dental Care updates on the confirmed Ubuntu VPS. Run commands as `root` (`sudo -i` if logged in as `ubuntu`).

## Confirmed production settings

| Setting | Value |
| --- | --- |
| Repository | `https://github.com/YudaGuntoro/dental-care.git` |
| VPS checkout | `/www/wwwroot/dental-care` |
| Branch | `main` |
| Domain | `https://dental-care.nusakaryadigital.com` |
| aaPanel proxy upstream | `http://127.0.0.1:8099` |
| Frontend container/image/host port | `dental-care-fe` / `dental-care-fe:latest` / `127.0.0.1:8099 -> 3000` |
| API container/image/host port | `dental-care-api` / `dental-care-api:latest` / `127.0.0.1:5280 -> 8080` |
| Docker network | `dental-care-net` |
| MySQL container/hostname | `mysql_vps` |
| Database | `dental_care` |
| Database user | `yudaguntoro` |
| API environment file | `/root/dental-care-api.env` (server only; mode `600`) |

The frontend sends browser requests to the same-origin `/api` route. Its Next.js rewrite forwards requests internally to `http://dental-care-api:8080`. The API is published on localhost port `5280` for VPS-side diagnostics; it does not need its own public proxy. Keep the aaPanel proxy pointed at port `8099` and configure SSL for the domain there.

The production database password and JWT signing key belong only in `/root/dental-care-api.env`. Never copy them into this repository or this document. The frontend and API Dockerfiles (`Dockerfile.fe` and `Dockerfile.api`) were created on the VPS checkout during initial setup and are used by the commands below.

## Routine update: frontend and API

Build both new images before replacing either running container. The runtime configuration is reused from the existing API environment file and Docker network.

```bash
cd /www/wwwroot/dental-care
git pull --ff-only origin main

docker build -f Dockerfile.api -t dental-care-api:latest .
docker build -f Dockerfile.fe -t dental-care-fe:latest .

docker rm -f dental-care-api
docker run -d \
  --name dental-care-api \
  --restart unless-stopped \
  --network dental-care-net \
  --env-file /root/dental-care-api.env \
  -p 127.0.0.1:5280:8080 \
  dental-care-api:latest

docker rm -f dental-care-fe
docker run -d \
  --name dental-care-fe \
  --restart unless-stopped \
  --network dental-care-net \
  -e API_PROXY_TARGET=http://dental-care-api:8080 \
  -p 127.0.0.1:8099:3000 \
  dental-care-fe:latest

docker ps --filter name=dental-care
docker logs --since 5m --tail 100 dental-care-api
docker logs --since 5m --tail 100 dental-care-fe
curl -I https://dental-care.nusakaryadigital.com/signin
```

This replaces the selected containers and causes a short interruption during restart. It does not restart or recreate MySQL. Check the logs and test login plus the clinic menus after deployment.

### Frontend-only update

```bash
cd /www/wwwroot/dental-care
git pull --ff-only origin main
docker build -f Dockerfile.fe -t dental-care-fe:latest .
docker rm -f dental-care-fe
docker run -d --name dental-care-fe --restart unless-stopped \
  --network dental-care-net \
  -e API_PROXY_TARGET=http://dental-care-api:8080 \
  -p 127.0.0.1:8099:3000 dental-care-fe:latest
```

### API-only update

```bash
cd /www/wwwroot/dental-care
git pull --ff-only origin main
docker build -f Dockerfile.api -t dental-care-api:latest .
docker rm -f dental-care-api
docker run -d --name dental-care-api --restart unless-stopped \
  --network dental-care-net \
  --env-file /root/dental-care-api.env \
  -p 127.0.0.1:5280:8080 dental-care-api:latest
```

If the application release includes a database migration, review and run that migration against `dental_care` as a separate step before testing the updated app. Routine image updates do not run SQL automatically.

## Clinic appointment services migration

The base `database/dental_care.sql` does not create `appointment_services`. The API uses this table when listing appointments, so the clinic dashboard and doctor room can return HTTP 500 until the migration is applied. This migration was applied during the initial production setup; do not rerun it for every app update.

If a new installation needs it, run from the repository checkout. The password prompt does not echo the database password:

```bash
cd /www/wwwroot/dental-care
read -rsp 'Database password: ' DB_PASSWORD
echo
docker run --rm -i \
  --network dental-care-net \
  -e MYSQL_PWD="$DB_PASSWORD" \
  mysql:8.0 \
  mysql -h mysql_vps -u yudaguntoro dental_care \
  < Backend/DentalCare.Persistence/Migrations/20261021_002_add_appointment_services.sql
unset DB_PASSWORD
```

To confirm that the table exists, use the same password prompt and run:

```bash
read -rsp 'Database password: ' DB_PASSWORD
echo
docker run --rm --network dental-care-net -e MYSQL_PWD="$DB_PASSWORD" mysql:8.0 \
  mysql -h mysql_vps -u yudaguntoro dental_care \
  -e "SHOW TABLES LIKE 'appointment_services';"
unset DB_PASSWORD
```

## Troubleshooting

```bash
docker ps --filter name=dental-care
docker logs --since 10m --tail 100 dental-care-api
docker logs --since 10m --tail 100 dental-care-fe
curl -i http://127.0.0.1:5280/api/clinic/appointments
curl -I https://dental-care.nusakaryadigital.com/signin
```

An unauthenticated API request may return `401`; that confirms the API answered. For an authenticated request, inspect the browser Network response and the API logs. HTTP `500` for appointments can indicate that `appointment_services` has not been created; apply the migration above and check the API log for any further database schema error.
