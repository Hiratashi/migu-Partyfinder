# Migu's Partyfinder Tool

A guild-only Elsword raid party finder. The MVP targets **Doom Aporia (21-1 / 21-2 / 21-3)** and is intentionally structured so additional raids, classes, invitation workflows and Discord notifications can be added without replacing the core architecture.

## Included in this starter

- Discord OAuth login; no local passwords.
- Guild membership verification at login.
- Optional required Discord role.
- Secure random, database-backed sessions stored as SHA-256 hashes; Discord access tokens are discarded after login.
- Doom Aporia party creation with encounter selection, difficulty stage, clear/practice mode, specific time or time range, and requested Physical/Magical/Support slots.
- Browser-local time display while all timestamps are stored as PostgreSQL `timestamptz`/UTC.
- Character profiles with data-driven class definitions.
- Party joining with a selected character.
- PostgreSQL migrations and seed data.
- Docker Compose deployment with an internal-only database network, non-root app container, dropped Linux capabilities, and no-new-privileges.
- Baseline HTTP security headers / CSP and same-origin checks on state-changing browser API calls.
- Basic leader-to-user invitation flow for guild members who have logged into the app.
- Audit-log table ready for privileged actions.

## Architecture

```text
Browser
  |
  | HTTPS (production: Cloudflare / reverse proxy)
  v
Next.js 16 / TypeScript
  |        \
  |         \--> Discord OAuth / Discord API
  v
PostgreSQL 17
```

This is a modular monolith on purpose. For a guild-sized application, splitting the frontend, API, authentication and bot into microservices adds operational complexity without a useful benefit. A Discord bot can later be another container that uses the same database/API.

## 1. Discord application

Create an application in the Discord Developer Portal.

Under **OAuth2**, create this redirect URI for local development:

```text
http://localhost:3000/api/auth/callback
```

For production, add your real HTTPS URL, e.g.:

```text
https://partyfinder.example.com/api/auth/callback
```

The site requests only `identify guilds`. It retrieves the user's identity and guild list, verifies `DISCORD_GUILD_ID`, then discards the OAuth access token.

If `DISCORD_REQUIRED_ROLE_ID` is configured, the application also checks the current user's member object for that role during login.

## 2. Configure environment

```bash
cp .env.example .env
openssl rand -hex 32
```

Put the generated value in `APP_SECRET`, then configure:

```dotenv
APP_URL=http://localhost:3000
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_GUILD_ID=...
DISCORD_REQUIRED_ROLE_ID=
SECURE_COOKIES=false
```

Also replace the example PostgreSQL password in `.env`.

Do **not** commit `.env`.

## 3. Start with Docker

```bash
docker compose up --build
```

The `migrate` service applies SQL migrations and seed data before the application starts.

Open:

```text
http://localhost:3000
```

## Production deployment

Recommended topology:

```text
Internet
   |
Cloudflare DNS/WAF/TLS
   |
Reverse proxy (Caddy, Traefik or nginx)
   |
127.0.0.1:3000 -> Migu Partyfinder container
   |
private Docker network -> PostgreSQL
```

The compose file intentionally binds Next.js to `127.0.0.1:3000`, not every interface. Put a TLS reverse proxy in front of it.

Production `.env` changes:

```dotenv
APP_URL=https://partyfinder.example.com
SECURE_COOKIES=true
```

Never expose PostgreSQL port 5432 publicly.

### Reverse-proxy requirements

- TLS/HTTPS only.
- Forward the original host/protocol correctly.
- Set a reasonable request-body size.
- Add edge rate limiting for `/api/auth/*` and write endpoints.
- If using Cloudflare, keep the origin firewall restricted where practical.

## Database / adding classes

Classes are database data, not frontend conditionals. The starter seeds only three examples:

- Shakti / SH / PHYSICAL / DPS
- Code Sariel / CS / MAGICAL / DPS
- Radiant Soul / RaS / MAGICAL / SUPPORT

Add the complete Elrios Rift class catalogue to `scripts/seed.mjs`, then rerun:

```bash
docker compose run --rm migrate
```

Icons can be added to `public/class-icons/` and referenced through the `classes.icon_path` column.

## Adding another raid

A raid is represented by `raids` + `encounters`. Party logic references IDs rather than hard-coded `21-1`, `21-2`, `21-3` values. The current create page intentionally selects Doom Aporia, but the database/API design is already multi-raid capable.

The next refactor would replace the Doom-specific create page with `/raids/[raid]/parties/new` and load raid metadata dynamically.

## Security notes

This starter provides a sound baseline, not a claim of invulnerability. Before exposing it publicly:

1. Put it behind HTTPS and set `SECURE_COOKIES=true`.
2. Use long independent secrets and rotate leaked secrets immediately.
3. Keep Node, Next.js, PostgreSQL and npm dependencies patched.
4. Add reverse-proxy/Cloudflare rate limiting.
5. Back up PostgreSQL and test restores.
6. Add centralized application/container logs and alerting.
7. Add automated tests before expanding write/admin functionality.
8. Add authorization checks for every future edit/delete/invite/admin endpoint; hiding a button is never authorization.
9. Consider re-checking guild membership periodically or on sensitive actions if immediate revocation is important.
10. Do not expose Docker socket, database, or management dashboards to the public Internet.

## Current MVP limitations / next backlog

- Invitation workflow is included for users who have logged into the site at least once; Discord-wide user discovery is deferred to the bot phase.
- Availability/search entries independent of a created party.
- Discord bot reminders and Discord mentions.
- Ready checks.
- Leave/kick/edit/cancel party controls.
- Full Elrios Rift class catalogue and official/approved class icons.
- Admin UI for raids/classes.
- Persistent distributed rate limiting (Redis is unnecessary until you actually run multiple app replicas; edge rate limiting is enough for the initial deployment).
- Unit/E2E test suite.

## Suggested next implementation order

1. Fill the actual class catalogue and icons.
2. Add party leader edit/cancel + user leave operations.
3. Add player availability (`availability` table) and matching.
4. Add invitation decline/expiry and leader-side revoke controls.
5. Add Discord bot container for invitation + upcoming-raid notifications.
6. Add admin UI for raids/classes and remove the remaining Doom-specific page assumptions.

## Local development without the app container

Run PostgreSQL with Docker, then run Next.js on your machine:

```bash
docker compose up db
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

For this mode, set `DATABASE_URL` to use `localhost` instead of Docker hostname `db`.

## License

Private guild project. Add the license you want before publishing publicly.

### CSP note

The starter CSP currently allows inline scripts because Next.js hydration requires either inline script allowance or a nonce-based CSP integration. Before a higher-risk/public deployment, migrate to the documented nonce-based CSP pattern rather than assuming this baseline policy is the final hardening state.
