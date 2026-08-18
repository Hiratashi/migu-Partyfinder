# 3A.3 Final application-security hardening

This is the final application-level security patch before reverse proxy and
deployment work.

No database migration is required.

## Changes

### Disabled-account defense in depth

`currentUser()` now requires:

```sql
u.access_disabled=false
```

Admin disable and guild-departure logic already revoke sessions. This adds a
second independent control: even if a stale session row somehow remains, a
disabled account cannot resolve as an authenticated Partyfinder user.

### Production `__Host-` cookies

When:

```env
SECURE_COOKIES=true
```

Partyfinder uses:

```text
__Host-migu_session
__Host-discord_oauth_state
```

These cookies are:

```text
HttpOnly
Secure
SameSite=Lax
Path=/
Priority=High
```

No Domain attribute is set.

For local development with:

```env
SECURE_COOKIES=false
```

the familiar names remain:

```text
migu_session
discord_oauth_state
```

so HTTP localhost development continues to work.

### Cookie configuration centralized

Session and Discord OAuth-state cookie behavior now lives in:

```text
src/lib/cookie-config.ts
```

This keeps production/local behavior consistent.

### Expired-session cleanup

Creating a new session removes expired sessions belonging to the same user.

It does not revoke valid sessions on other devices.

## Expected local behavior

Your current local `.env` should still contain:

```env
APP_URL=http://localhost:3000
SECURE_COOKIES=false
```

so there should be no visible login behavior change.

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

Test:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

Then in the browser:

1. Log out.
2. Log in through Discord.
3. Verify normal navigation.
4. Create/edit a character or perform another authenticated write.
5. Log out again.

## Production

In 3B the production `.env` will use:

```env
APP_URL=https://partyfinder.example.com
SECURE_COOKIES=true
```

At that point browsers will receive the `__Host-` cookie names.

## Deferred intentionally

### CSP nonce

The current CSP still allows inline scripts.

A nonce-based CSP is stronger, but integrating it correctly with the Next.js
App Router changes rendering/caching behavior. It should not be introduced as
an incidental deployment change.

### Public health endpoint

`/api/health` remains intentionally available to the local Docker health
check. In 3B, Caddy can keep this endpoint from being publicly exposed while
still allowing Docker to access it over loopback.

### Forwarded client IP

The rate limiter reads proxy forwarding headers. This is appropriate once
Caddy is the only public path to the app. The Docker application port remains
bound to `127.0.0.1`, preventing direct Internet access to port 3000.
