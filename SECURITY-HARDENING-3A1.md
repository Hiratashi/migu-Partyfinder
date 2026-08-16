# 3A.1 Authentication and browser-security hardening

This patch is intentionally narrow. It does not change database schema,
sessions, Discord guild-membership behavior, or normal Partyfinder UI.

## Changes

### Strict same-origin enforcement

`sameOrigin()` now rejects requests that omit the `Origin` header.

Partyfinder is a browser application, so authenticated write endpoints do not
need to accept arbitrary clients that bypass CSRF protection by simply
omitting `Origin`.

Existing write routes already use `sameOrigin()`.

### Logout protected too

`POST /api/auth/logout` now uses the same origin check as the other write
endpoints.

A rejected logout receives:

```json
{"error":"bad_origin"}
```

with HTTP 403.

### Safer Discord OAuth error logging

Discord OAuth token-exchange failures now log only the HTTP status through the
thrown error.

The response body from Discord is no longer copied into the application error
message.

### Remove duplicate OAuth exchange implementation

The obsolete `exchangeCode()` implementation in `src/lib/discord.ts` is
removed.

The callback already uses `exchangeDiscordCodeWithRefresh()` from
`src/lib/discord-oauth.ts`.

The authorization URL and token exchange now also share the same redirect URI
rule:

```text
DISCORD_REDIRECT_URI, if configured
otherwise
APP_URL/api/auth/callback
```

### Browser headers

Adds:

```text
Strict-Transport-Security: max-age=31536000
```

and CSP:

```text
object-src 'none'
```

HSTS is only honored by browsers when delivered over HTTPS, so it does not
force your current `http://localhost:3000` development site into HTTPS.

This patch deliberately does NOT remove:

```text
script-src 'unsafe-inline'
```

A nonce-based CSP should be treated separately because Next.js uses inline
bootstrap scripts and removing it blindly can break the application.

## Apply

```powershell
.\apply-upgrade.ps1 -RepoPath "D:\GIT\migu-s-Partyfinder"
```

Then:

```powershell
cd D:\GIT\migu-s-Partyfinder
docker compose up -d --build
docker compose ps
```

Verify:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

Then verify normal browser behavior:

1. Discord login works.
2. Account -> Logout works.
3. Log in again.
4. Create/edit a character or another normal write action.

## Optional negative test

A direct POST without an Origin header should now fail:

```powershell
Invoke-WebRequest `
  -Method POST `
  -Uri http://127.0.0.1:3000/api/auth/logout `
  -SkipHttpErrorCheck
```

Expected HTTP status:

```text
403
```

This direct request does not carry the authenticated browser cookie and is
only a security-behavior check.

No database migration is required.
