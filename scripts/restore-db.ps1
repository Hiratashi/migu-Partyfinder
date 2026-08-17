param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,

    [Parameter(Mandatory=$false)]
    [switch]$ConfirmRestore
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

function Invoke-Docker {
    param([string[]]$Arguments)
    & docker @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed: docker $($Arguments -join ' ')"
    }
}

Push-Location $RepoRoot
try {
    $resolvedBackup = if ([System.IO.Path]::IsPathRooted($BackupFile)) {
        $BackupFile
    } else {
        Join-Path $RepoRoot $BackupFile
    }

    if (-not (Test-Path -LiteralPath $resolvedBackup)) {
        throw "Backup file not found: $resolvedBackup"
    }

    if (-not $ConfirmRestore) {
        Write-Host ""
        Write-Host "DATABASE RESTORE - DESTRUCTIVE OPERATION"
        Write-Host ""
        Write-Host "This will replace the current Partyfinder database with:"
        Write-Host "  $resolvedBackup"
        Write-Host ""
        Write-Host "A safety backup of the current database will be created first."
        Write-Host ""
        Write-Host "Run again with:"
        Write-Host "  .\scripts\restore-db.ps1 -BackupFile `"$BackupFile`" -ConfirmRestore"
        Write-Host ""
        exit 2
    }

    Write-Host ""
    Write-Host "Creating pre-restore safety backup..."
    & (Join-Path $PSScriptRoot "backup-db.ps1") -BackupDir "backups\pre-restore" -RetentionDays 30
    if ($LASTEXITCODE -ne 0) {
        throw "Pre-restore safety backup failed."
    }

    Write-Host ""
    Write-Host "Stopping Partyfinder application..."
    & docker compose stop app | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "Could not stop the application container."
    }

    Invoke-Docker @("compose", "up", "-d", "db")

    $containerId = (& docker compose ps -q db).Trim()
    if (-not $containerId) {
        throw "Could not determine the PostgreSQL container ID."
    }

    $containerPath = "/tmp/partyfinder-restore.dump"
    Invoke-Docker @("cp", $resolvedBackup, "${containerId}:$containerPath")

    try {
        Write-Host ""
        Write-Host "Validating backup archive..."
        Invoke-Docker @("compose", "exec", "-T", "db", "sh", "-c", "pg_restore --list '$containerPath' >/dev/null")

        Write-Host "Replacing current database..."
        $recreateCommand = 'PGDATABASE=postgres dropdb --if-exists --force -U "$POSTGRES_USER" "$POSTGRES_DB"' +
                           ' && PGDATABASE=postgres createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$POSTGRES_DB"'
        Invoke-Docker @("compose", "exec", "-T", "db", "sh", "-c", $recreateCommand)

        Write-Host "Restoring backup..."
        $restoreCommand = 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges ' + "'$containerPath'"
        Invoke-Docker @("compose", "exec", "-T", "db", "sh", "-c", $restoreCommand)

        Write-Host "Verifying core tables..."
        $verifyCommand = 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' +
                         ' -c "SELECT count(*) AS raids FROM raids;"' +
                         ' -c "SELECT count(*) AS classes FROM classes;"'
        Invoke-Docker @("compose", "exec", "-T", "db", "sh", "-c", $verifyCommand)
    }
    catch {
        Write-Host ""
        Write-Host "RESTORE FAILED."
        Write-Host "The app will remain stopped so the database can be inspected safely."
        Write-Host "A pre-restore safety backup was created under backups\pre-restore."
        throw
    }
    finally {
        & docker compose exec -T db sh -c "rm -f '$containerPath'" | Out-Null
    }

    Write-Host ""
    Write-Host "Starting Partyfinder..."
    Invoke-Docker @("compose", "up", "-d", "app")

    Write-Host "Waiting for application health..."
    $healthy = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $response = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/health" -TimeoutSec 2
            if ($response.status -eq "ok") {
                $healthy = $true
                break
            }
        }
        catch {
        }

        Start-Sleep -Seconds 2
    }

    if (-not $healthy) {
        throw "Database restore completed, but the Partyfinder health endpoint did not become healthy in time."
    }

    Write-Host ""
    Write-Host "Restore completed successfully."
    Write-Host "Partyfinder health: ok"
}
finally {
    Pop-Location
}
