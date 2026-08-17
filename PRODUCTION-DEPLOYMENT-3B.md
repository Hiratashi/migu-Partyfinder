# Phase 3B - Caddy and production deployment configuration

This phase prepares Partyfinder for HTTPS hosting without changing the current
local Docker workflow.

## Architecture

```text
Internet
   |
   | TCP 80 / 443
   v
Caddy
   |
   | HTTP over loopback
   v
127.0.0.1:3000
   |
   v
Partyfinder Docker app
   |
   | private Docker network only
   v
PostgreSQL
```

The existing application binding remains:

```yaml
127.0.0.1:3000:3000
```

PostgreSQL has no host port mapping.

## Files

### `deploy/Caddyfile`

Production reverse-proxy template.

It provides:

- automatic HTTPS through Caddy
- HTTP -> HTTPS handling through Caddy's automatic HTTPS behavior
- gzip/zstd response compression
- reverse proxy to `127.0.0.1:3000`
- public blocking of `/api/health`

The Docker health check can still access:

```text
http://127.0.0.1:3000/api/health
```

directly.

### `deploy/.env.production.example`

Production secret/configuration template.

Important production settings:

```env
APP_URL=https://partyfinder.example.com
SECURE_COOKIES=true
```

Generate PostgreSQL and application secrets independently:

```bash
openssl rand -hex 32
```

### `scripts/deploy-production.sh`

Future production update workflow:

1. `git pull --ff-only`
2. validate Compose
3. rebuild/start containers
4. wait for `/api/health`
5. show container status

Default repo location:

```text
/opt/migu-partyfinder
```

or pass another path:

```bash
./scripts/deploy-production.sh /srv/migu-partyfinder
```

### `scripts/verify-production.sh`

Basic external verification after deployment.

Example:

```bash
./scripts/verify-production.sh partyfinder.example.com
```

It checks:

- local app health
- public HTTPS
- `/api/health` is not publicly exposed

## Caddy behavior

A hostname in the Caddyfile enables Caddy's automatic HTTPS behavior once:

- the hostname resolves to the server
- TCP 80 is reachable
- TCP 443 is reachable

The production Caddyfile does not manually set `X-Forwarded-For`.

That is intentional. Caddy's reverse proxy handles the forwarding headers and,
by default, ignores client-supplied values for the sensitive
`X-Forwarded-*` headers before constructing its proxy values.

This is exactly what the Partyfinder application-level IP rate limiter expects.

Do not place another CDN/reverse proxy such as Cloudflare proxying in front of
Caddy without revisiting trusted-proxy configuration.

## Access logs

This Caddyfile deliberately does not enable HTTP access logging yet.

OAuth callbacks contain temporary query parameters. Avoiding request access
logs keeps us from unnecessarily persisting complete callback URLs.

Caddy's service/runtime logs remain available through systemd journal when
installed as a service.

## Installation location on Linux

In phase 3C we will install the Caddyfile as:

```text
/etc/caddy/Caddyfile
```

and keep the repository under a dedicated application directory such as:

```text
/opt/migu-partyfinder
```

## Discord Developer Portal

When the final production hostname is chosen, Discord needs the OAuth redirect
URI:

```text
https://partyfinder.example.com/api/auth/callback
```

The application's:

```env
APP_URL=https://partyfinder.example.com
```

must refer to the same origin.

## Important: do not expose port 3000

The server firewall should permit public:

```text
80/tcp
443/tcp
```

and SSH under the rules we choose in 3C.

It should NOT expose:

```text
3000/tcp
5432/tcp
```

Even if a firewall were accidentally too broad, Partyfinder's existing
loopback binding prevents port 3000 from listening on the public interface,
and PostgreSQL has no published host port.

## Rate limiting

Standard Caddy does not include a core general-purpose HTTP rate-limiting
directive.

Partyfinder already has application-level rate limiting from phase 3A.2.

We will not introduce a custom Caddy plugin just for this small deployment.

## Apply locally

This phase does not require Caddy on your Windows development machine.

Apply the files:

```powershell
.\apply-upgrade.ps1 -RepoPath "D:\GIT\migu-s-Partyfinder"
```

No rebuild is required because no application or Docker files are modified.

You can review:

```text
deploy\Caddyfile
deploy\.env.production.example
scripts\deploy-production.sh
scripts\verify-production.sh
```

No database migration is required.

## Next

Phase 3C performs the actual server work:

1. create DigitalOcean Droplet
2. secure SSH
3. configure DigitalOcean Cloud Firewall
4. install Docker
5. install Caddy
6. clone Partyfinder
7. create production `.env`
8. point DNS to the Droplet
9. configure Discord OAuth production callback
10. start Partyfinder
11. validate HTTPS and external exposure
