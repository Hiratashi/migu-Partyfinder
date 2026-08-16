# Migu's Partyfinder Tool

A community-built, guild-only raid party finder for **Elsword**. The current implementation focuses on **Doom Aporia**, with the data model designed so additional raids and party sizes can be added later.

> This is an unofficial fan/community project. It is not affiliated with, endorsed by, or operated by KOG Games or any game/server operator. Game names and related trademarks belong to their respective owners.

## Current features

- Discord OAuth login; no local passwords.
- Guild membership verification at login.
- Optional required Discord role.
- Secure random, database-backed application sessions; Discord access tokens are discarded after login.
- Open party browser with creator Discord username.
- A dedicated **My Parties** view for parties created by the current user.
- Doom Aporia encounters 21-1 through 21-5 with Full Run selection.
- Difficulty stages 1-3.
- Clear groups and multi-fight practice groups.
- Configurable raid party size (Doom currently uses 6).
- Physical / Magical / Support party needs.
- Party lifecycle: open/full, edit, leave, kick, complete, cancel, and history/archive.
- Persistent weekly availability profile with 30-minute blocks for all seven days.
- Availability preferences for encounters, characters, stages, practice groups, timezone, and notes.
- Party-to-player matching based on weekly schedule, encounters, difficulty, practice preference and eligible characters.
- Invitations and invitation acceptance.
- PostgreSQL migrations and seed data.
- Docker Compose deployment.
- Baseline security headers, same-origin checks for write requests, non-root application container, dropped Linux capabilities, and audit-log support.

## Architecture

```text
Browser
  |
  | HTTPS in production
  v
Next.js / TypeScript
  |        \
  |         \--> Discord OAuth / Discord API
  v
PostgreSQL
```

The application is intentionally a modular monolith. For a guild-sized service this keeps deployment and maintenance much simpler than splitting the frontend, API and authentication into separate services. A Discord notification bot can be added later as another container.

## Discord application

Create an application in the Discord Developer Portal and configure an OAuth2 redirect URI.

Local development:

```text
http://localhost:3000/api/auth/callback
```

Production example:

```text
https://partyfinder.example.com/api/auth/callback
```

The application requests the Discord scopes required for identity and guild membership verification. `DISCORD_GUILD_ID` limits access to the configured guild. `DISCORD_REQUIRED_ROLE_ID` can optionally restrict access further.

## Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Generate a strong application secret:

```bash
openssl rand -hex 32
```

Configure at least:

```dotenv
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://partyfinder:change-me@db:5432/partyfinder
POSTGRES_DB=partyfinder
POSTGRES_USER=partyfinder
POSTGRES_PASSWORD=change-me

DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_GUILD_ID=
DISCORD_REQUIRED_ROLE_ID=

APP_SECRET=
SECURE_COOKIES=false
```

Never commit `.env` or real secrets.

## Docker

Start the application with:

```bash
docker compose up --build
```

The migration container applies pending SQL migrations and seed data before the application starts.

Local URL:

```text
http://localhost:3000
```

## Updating after pulling changes

When an update contains database migrations:

```bash
docker compose run --rm migrate
```

Then rebuild/restart:

```bash
docker compose up -d --build
```

## Production deployment

Recommended topology:

```text
Internet
   |
Cloudflare / firewall / TLS
   |
Reverse proxy (Caddy, Traefik or nginx)
   |
127.0.0.1:3000 -> Partyfinder
   |
private Docker network -> PostgreSQL
```

For production:

```dotenv
APP_URL=https://partyfinder.example.com
SECURE_COOKIES=true
```

Do not expose PostgreSQL directly to the Internet.

### Security checklist

- Use HTTPS only in production.
- Keep Node.js, Next.js, PostgreSQL and npm dependencies patched.
- Use strong independent secrets.
- Add edge/reverse-proxy rate limiting for authentication and write endpoints.
- Back up PostgreSQL and periodically test restores.
- Do not expose the Docker socket or management dashboards publicly.
- Keep authorization checks on every write/admin operation; hiding UI buttons is not authorization.
- Review CSP hardening before a higher-risk public deployment.

## Data-driven raids and classes

Raids, encounters and classes are database data rather than hard-coded UI branches. Doom Aporia currently has a party size of 6. A future raid can use a different `party_size`, and the party-needs selectors will use that value.

Character/class icons can be stored in `public/class-icons/` and referenced through the class data.

## Availability model

Each user has one persistent weekly availability profile per raid. The profile contains:

- 30-minute availability blocks for Monday-Sunday
- timezone
- encounters they are willing to run
- eligible characters
- accepted difficulty stages
- whether practice groups are acceptable
- an optional note

The matcher compares a party's actual absolute start/end time against each player's recurring weekly schedule in that player's saved timezone.

## Planned additions

- Invitation decline/expiry and leader-side revoke controls.
- Better party composition visualization.
- Discord bot reminders and mentions.
- Ready checks.
- Admin UI for raids/classes.
- Automated tests and CI.

## License

Add the license you want to use before redistributing the project under a specific open-source license.
