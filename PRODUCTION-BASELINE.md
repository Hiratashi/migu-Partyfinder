# Production baseline hardening

Based on repository commit:

```text
8a264cc6ec0244410eafb449e21043156f09a4c1
```

## Important dependency note

The repository currently does not contain `package-lock.json`.

Therefore this patch deliberately keeps:

```dockerfile
RUN npm install
```

It does not use `npm ci`.

A committed lockfile should be added later as a separate dependency-reproducibility
improvement, after generating and testing it explicitly.

## Changes

- Required Compose environment values fail early if absent.
- Application startup validates important environment values.
- Public/non-local APP_URL requires HTTPS and SECURE_COOKIES=true.
- Placeholder database credentials are rejected by application validation.
- APP_SECRET must be at least 32 characters.
- Adds `/api/health`, including a PostgreSQL connectivity check.
- Adds a Docker healthcheck for the application container.
- Keeps port 3000 bound only to `127.0.0.1`.

## Apply

```powershell
.\apply-upgrade.ps1 -RepoPath "D:\GIT\migu-s-Partyfinder"
```

Then:

```powershell
cd D:\GIT\migu-s-Partyfinder
docker compose config
docker compose up -d --build
docker compose ps
```

Do not paste the full `docker compose config` output publicly because it can
contain resolved secrets.

Check health:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

Expected:

```text
status
------
ok
```

No database migration is required.
