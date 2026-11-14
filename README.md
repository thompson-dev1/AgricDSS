# AGRIC DSS Next.js app

This is the Next.js application. The existing PHP application remains at the repository root for rollback and has not been removed.

## Run locally

```sh
cd next-app
npm install
cp .env.example .env.local
npm run dev
```

Set `SESSION_SECRET` to a random value of at least 32 characters before deployment. `AGRIC_DB_PATH` defaults to `../database.sqlite` when commands are run from `next-app/`.

Registration email needs `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and optionally `MAIL_FROM`. Keep those values in `.env.local` or the deployment secret store; the sample values in `.env.example` are placeholders.

The database client uses the existing SQLite file for local development. In production it uses Turso through `@libsql/client`; create a Turso database, then set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in the deployment environment. Run `npm run migrate:turso -- /path/to/database.sqlite` once against a new, empty Turso database to copy the current schema and records. The migration refuses to run against a non-empty target.

## Migrated routes

- `/` — landing page
- `/login` — database-backed login
- `/register` and `/verify-email` — account creation and email verification
- `/marketplace` — product listing and search
- `/cart`, `/products/[id]`, `/orders`, and `/orders/success` — cart checkout, product detail, receipt, buyer/farmer transaction confirmation, and feedback
- `/dashboard`, `/profile`, `/admin`, `/admin/products`, `/admin/prices`, and `/admin/loans/[id]` — role-aware workspaces, profile editing, product and price management, and private loan review
- `/farmer/products`, `/farmer/sell`, `/farmer/requests`, `/farmer/loans`, `/farmer/subscription`, `/farmer/promotions`, and `/farmer/reports` — inventory, market listings, request acceptance, finance, promotion, and sales reporting
- `/buyer/requests` — buyer requirement requests
- `/services`, `/services/book/[id]`, `/bookings/[id]`, and `/shop` — service bookings and farm input purchases
- `/messages`, `/notifications`, `/prices`, and `/analytics` — messaging, notifications, market pricing, analytics, and live navigation counts

The app builds as a standalone Next.js project. Run `npm run build` to compile it. PHP is still present for rollback and comparison; user changes and existing SQLite data remain untouched. See the root `MIGRATION_PLAN.md` for schema limits and route compatibility notes.

## Deploy with Netlify and Turso

The repository root includes `netlify.toml`; Netlify uses `next-app/` as its base directory and detects the Next.js runtime. Create a Netlify site connected to this repository. Add these environment variables in the Netlify site settings:

- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from Turso
- `SESSION_SECRET` (generate with `openssl rand -base64 48`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` for email verification
- `PAYMENT_MOMO_NUMBER` if the payment instructions should show a number

Before switching traffic, copy the existing SQLite database to a new empty Turso database from a trusted local machine: `cd next-app`, set the Turso variables in your shell, then run `npm run migrate:turso -- ../database.sqlite`. Stop writes to the old PHP app during the final copy so no new records are missed. Do not commit tokens.

Netlify Blobs stores new product images, profile pictures, and private loan documents. To preserve existing files, create a Netlify personal access token and site ID, then run `npm run migrate:uploads -- ../database.sqlite` from `next-app/` with `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN` set. The migration reads loan image names from SQLite and puts those files only in private storage. The public uploads endpoint preserves existing `/uploads/...` links; loan documents remain behind admin authorization.

After setting the environment variables, deploy the site. Confirm the `/api/health` endpoint and sign in with each existing role. Keep backups of the SQLite source and exported Turso data during cutover.

## Deploy with Docker Compose

The included Compose setup runs the app as a non-root Node process, checks its database and required settings before startup, persists SQLite and uploaded files outside the image, exposes a health check, and places Caddy in front for HTTPS. Use a Linux server with Docker Compose, a persistent local disk, and a DNS name pointed at that server. The database copy step never overwrites an existing deployment database.

1. Set the domain's DNS A/AAAA record to the server and allow inbound ports 80 and 443. On the server, clone/copy this project, then prepare the app:

   ```sh
   cd next-app
   cp .env.deploy.example .env.deploy
   ```

2. Edit `.env.deploy`. Set `DOMAIN`, an absolute persistent `AGRIC_DATA_DIR`, `APP_UID`/`APP_GID`, a unique `SESSION_SECRET` (`openssl rand -base64 48`), and working SMTP credentials. Registration requires SMTP.

3. Prepare the first data directory. For the final PHP-to-Next cutover, stop PHP writes first so the SQLite and upload copies contain the final data. This creates a separate deployment copy and does not modify the source database or source uploads:

   ```sh
   export AGRIC_DATA_DIR=/srv/agric-dss/data
   mkdir -p "$AGRIC_DATA_DIR"
   python3 scripts/prepare-deploy-data.py ../database.sqlite
   sudo chown -R 1000:1000 "$AGRIC_DATA_DIR"
   ```

   Use the same numeric owner IDs in `.env.deploy`. The copy script refuses to overwrite a database or merge into a non-empty uploads directory. To use a different source database, pass its absolute path as the script argument. This preparation step uses Python’s standard SQLite library and does not require Node on the host.

4. Build and start the services:

   ```sh
   docker compose --env-file .env.deploy up -d --build
   docker compose --env-file .env.deploy ps
   docker compose --env-file .env.deploy logs -f web proxy
   ```

   Caddy obtains and renews the site's HTTPS certificate. The web container is private to the Compose network; Caddy is the public endpoint. Back up `AGRIC_DATA_DIR` regularly and keep `.env.deploy` out of version control.

For a later release, keep the same data directory and `.env.deploy`, then rebuild/restart with Compose. Uploaded product/profile images and private loan documents live in that data directory; they are not lost when the container is replaced.

## Runtime notes

The Docker Compose path keeps SQLite and uploaded files on its persistent data volume. The Netlify path uses Turso for relational data and Netlify Blobs for uploads. Loan identity images are private and are served only after an admin session check. The sales report uses browser print-to-PDF. Set `PAYMENT_MOMO_NUMBER` if farmers should see the payment destination; no payment gateway is configured.
