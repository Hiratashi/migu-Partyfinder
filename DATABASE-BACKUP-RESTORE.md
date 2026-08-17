# Database backup and restore

Partyfinder uses PostgreSQL custom-format dumps (`pg_dump -Fc`).

The scripts always locate the repository automatically, so they can be invoked
from another PowerShell working directory.

## Security note

Database backups contain Partyfinder user data and can also contain encrypted
Discord OAuth tokens and active application data.

Do not:

- commit backups to Git
- upload dumps publicly
- keep the only backup on the same server as production

The repository ignores the local `backups/` directory and `*.dump` files.

## Create a backup

From anywhere:

```powershell
D:\GIT\migu-s-Partyfinder\scripts\backup-db.ps1
```

Or from the repository:

```powershell
.\scripts\backup-db.ps1
```

Default destination:

```text
backups\
```

Default retention:

```text
14 days
```

Example with 30-day retention:

```powershell
.\scripts\backup-db.ps1 -RetentionDays 30
```

Every backup also gets a SHA-256 checksum file.

## Non-destructive restore test

This is the preferred way to prove that a backup works.

It restores the dump into a temporary PostgreSQL database named:

```text
partyfinder_restore_test
```

The live Partyfinder database is untouched.

Example:

```powershell
.\scripts\test-restore-db.ps1 -BackupFile ".\backups\partyfinder_20260816_170000.dump"
```

The script:

1. validates the dump archive
2. creates a temporary database
3. restores the full dump
4. queries core Partyfinder tables
5. deletes the temporary database

## Restore the live database

The restore script is intentionally protected.

Running this:

```powershell
.\scripts\restore-db.ps1 -BackupFile ".\backups\partyfinder_20260816_170000.dump"
```

does not restore anything.

A destructive restore requires:

```powershell
.\scripts\restore-db.ps1 `
  -BackupFile ".\backups\partyfinder_20260816_170000.dump" `
  -ConfirmRestore
```

Before replacing the database, the script automatically creates an additional
backup under:

```text
backups\pre-restore\
```

It then:

1. stops the Partyfinder app
2. validates the selected dump
3. drops/recreates the Partyfinder database
4. restores the dump
5. verifies core tables
6. starts Partyfinder
7. verifies `/api/health`

If restoration itself fails, the application remains stopped so the database
is not accidentally served in an unknown state.

## Production plan

These scripts provide the database mechanics we need on DigitalOcean.

Before public deployment we will additionally configure:

- scheduled backups
- encrypted/off-server backup storage
- retention appropriate for production
- periodic restore testing

A backup stored only on the same DigitalOcean Droplet is not considered a
complete disaster-recovery backup.
