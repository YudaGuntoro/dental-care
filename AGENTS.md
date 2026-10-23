# Dental Care project notes

- This checkout is the Dental Care app; use the `dental-care` origin.
- For VPS settings and repeatable deploy/update commands, use `docs/deploy-vps.md`.
- Local database bootstrap is `database/dental_care.sql`.
- Keep browser API calls same-origin under `/api`; local Next.js forwarding uses `API_PROXY_TARGET`.
- Keep production database credentials and signing keys in the server environment file; never commit or print them.
