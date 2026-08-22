# Migu's Partyfinder Tool

> **Beta** — Migu's Partyfinder Tool is live and ready for guild testing. Features and data may still change while feedback is collected.

**Live site:** https://migu-partyfinder.tsukuyomi.ch

A community-built, guild-only raid party finder for **Elsword**. The current focus is **Doom Aporia**, with the application designed so more raids can be added later.

> This is an unofficial fan/community project. It is not affiliated with, endorsed by, or operated by KOG Games or any game/server operator. Game names and related trademarks belong to their respective owners.

## For guild members

If you just want to use Partyfinder, start here:

- [User Guide](docs/USER-GUIDE.md)
- [Beta information](docs/BETA.md)
- [Report a bug or suggest an improvement](https://github.com/Hiratashi/migu-Partyfinder/issues)

## Current features

- Discord OAuth login; no local passwords
- Guild membership verification
- Player profiles with public profile pages
- Character management with class selection and copyable in-game names
- Character armor setup for Tenebrous or Exascale, including Exascale color
- Per-character capability tags
- Admin-managed capability catalogue with global or raid-specific scope
- Raid-specific informational capability markers such as Doom Damage Ready
- Weekly availability with local-time handling
- Open party browser
- Create, edit, join, leave, cancel and complete parties
- Party invitations
- Optional preferred character selection when inviting a player
- Physical / Magical / Support composition requirements
- Doom Aporia encounter and stage selection
- Practice and clear party support
- My Parties and party history
- Admin dashboard for users, raids, classes, capabilities, parties and audit events
- Automatic party lifecycle handling, including expiry and guild-leave cleanup
- PostgreSQL persistence, Docker deployment and Caddy/HTTPS production hosting
- Application health checks, same-origin protection and rate limiting

## Player profiles and character setup

Each user can maintain a public-facing Partyfinder profile containing their characters and weekly availability.

Character configuration includes:

- in-game character name
- class
- armor setup
- capability tags

Armor setup is structured separately from capability tags:

- **Tenebrous**
- **Exascale**
  - Red
  - Blue
  - Green

Tenebrous and Exascale are mutually exclusive for a character.

Capability tags describe useful information about a character and may be global or raid-specific. They are informational and do not override normal party matching or eligibility rules.

The capability catalogue is managed through the admin interface. Capability names, descriptions, categories, raid scope, active state and display order can be adjusted later without requiring a code change. New capability definitions can also be added as needed.

## Preferred characters on invitations

When inviting a player from **Available players**, the party lead may optionally select one or more of that player's eligible characters as preferred choices.

This is a preference only:

- selecting no characters sends a normal invitation
- one or more characters may be marked as preferred
- the invited player sees the party lead's preference
- preferred characters are shown first in the invitation character picker
- the invited player may still choose any character that satisfies the normal party requirements

Preferred characters do not alter matching, eligibility, role requirements or party composition logic.

## Beta status

The core workflow is working and the live service is available for testing.

During beta:

- bugs may still appear
- UX may change based on feedback
- admin configuration may be adjusted
- database resets or migrations are still possible if needed.

Please use GitHub Issues for actionable bug reports and improvement requests.

See [docs/BETA.md](docs/BETA.md) for details.

## Quick start

1. Open https://migu-partyfinder.tsukuyomi.ch
2. Log in with Discord.
3. Add your Elsword character(s).
4. Configure armor and capabilities where useful.
5. Set your weekly availability.
6. Browse existing parties or create one.
7. Join with an eligible character.
8. Use **My Parties** to manage your upcoming raids.

Full instructions: [docs/USER-GUIDE.md](docs/USER-GUIDE.md)

## Architecture

```text
Browser
   |
   | HTTPS
   v
Caddy
   |
   v
127.0.0.1:3000
   |
   v
Next.js / TypeScript
   |
   +------> Discord OAuth / Discord API
   |
   v
PostgreSQL
```

The app is intentionally a modular monolith. For a guild-sized service, that keeps deployment and maintenance simpler than splitting the frontend, API and authentication into separate services.

## Local development

Copy the example environment file:

```bash
cp .env.example .env
```

Generate a strong application secret:

```bash
openssl rand -hex 32
```

Start the stack:

```bash
docker compose up -d --build
```

Local URL:

```text
http://localhost:3000
```

Local development should use:

```dotenv
APP_URL=http://localhost:3000
SECURE_COOKIES=false
```

Never commit `.env` or real secrets.

## Production

The current production deployment uses:

```text
https://migu-partyfinder.tsukuyomi.ch
```

Production settings use:

```dotenv
APP_URL=https://migu-partyfinder.tsukuyomi.ch
SECURE_COOKIES=true
```

The public reverse proxy exposes only HTTP/HTTPS. The Next.js application remains bound to loopback and PostgreSQL is not published to the host network.

Production deployment details are documented in:

- `PRODUCTION-DEPLOYMENT-3B.md`
- `PRODUCTION-DEPLOYMENT-3B1.md`
- `PRODUCTION-BASELINE.md`
- `DATABASE-BACKUP-RESTORE.md`

## Feedback and issues

GitHub Issues is the preferred place for beta feedback that needs action.

Use:

- **Bug report** when something is not working as expected.
- **Feature / improvement request** for ideas, UX improvements or new functionality

Please avoid posting secrets, Discord tokens, passwords, `.env` contents or private server information in issues.

## Development status

Current stage:

```text
Beta / UX polish
```

Development is continuing on feature branches before changes are merged into `main`, which is treated as the production baseline.

## Tech stack

- Next.js
- React
- TypeScript
- PostgreSQL
- Docker / Docker Compose
- Caddy
- Discord OAuth2

## Security notes

The production deployment includes:

- HTTPS
- secure HTTP-only session cookies
- same-origin protection for state-changing browser requests
- application-level rate limiting
- disabled-account/session checks
- non-root application container
- dropped Linux capabilities
- host and cloud firewalls
- PostgreSQL kept off the public network
- application and database health checks
- audit logging for important state-changing operations

## Project scope

The current raid focus is Doom Aporia. Raid, encounter, class and capability data are stored in PostgreSQL so additional content can be introduced without redesigning the entire application.

## License

No open-source license has been selected yet. Until a license is added, the repository is publicly viewable but normal copyright rules still apply.
