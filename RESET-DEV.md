# Development database reset

This workflow gives Partyfinder a clean development baseline.

## What is deleted

The Docker PostgreSQL volume is removed, so all current database state is
deleted, including:

- users
- characters
- availability profiles
- parties
- party memberships / invitations
- sessions
- stored Discord OAuth tokens
- audit log
- hand-created test records

## What returns automatically

The database is rebuilt by running the complete migration history.

Any configuration/catalogue data that is already created by migrations will
therefore be restored automatically, including the current raid/class seed
data provided by the migration chain.

This is preferable to preserving the current development database because it
proves that a completely fresh Partyfinder installation can be reconstructed
from Git alone.

## Safety

Running:

```powershell
.\scripts\reset-dev.ps1
```

does **not** reset anything. It prints the warning and exits.

The destructive reset requires:

```powershell
.\scripts\reset-dev.ps1 -ConfirmReset
```

## Recommended checkpoint

Before resetting:

```powershell
git add .
git commit -m "Complete admin and lifecycle development milestone"
git push
```

If you want an emergency copy of the current development database first:

```powershell
docker compose exec -T db pg_dump -U partyfinder -d partyfinder -Fc > partyfinder-before-reset.dump
```

Do not commit the dump to Git because it can contain Discord/user data.

## Reset

From the repository root:

```powershell
.\scripts\reset-dev.ps1 -ConfirmReset
```

The script:

```text
docker compose down
        |
        v
remove Docker volumes
        |
        v
start PostgreSQL
        |
        v
wait until PostgreSQL is ready
        |
        v
run all migrations
```

Afterward:

```powershell
docker compose up -d --build
```

Then log in again with Discord.

## Verify

Run:

```powershell
.\scripts\show-dev-data.ps1
```

Immediately after a clean reset you should expect:

```text
Users:        none
Parties:      none
Audit events: 0
```

while the raid/class configuration created by migrations should exist.

## Test data philosophy

Do not keep accidental development state as permanent test data.

Use:

```text
clean database
+ migrations
+ deterministic seed/configuration
```

When we later need automated integration tests, we can add a separate
`seed-test` command containing synthetic users/parties that never depends on
real Discord accounts.
