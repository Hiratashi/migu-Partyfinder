param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$TestDatabase = "partyfinder_restore_test"

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

    Write-Host ""
    Write-Host "NON-DESTRUCTIVE RESTORE TEST"
    Write-Host "Backup: $resolvedBackup"
    Write-Host "Temporary database: $TestDatabase"

    Invoke-Docker @("compose", "up", "-d", "db")

    $containerId = (& docker compose ps -q db).Trim()
    if (-not $containerId) {
        throw "Could not determine the PostgreSQL container ID."
    }

    $containerPath = "/tmp/restore-test.dump"
    Invoke-Docker @("cp", $resolvedBackup, "${containerId}:$containerPath")

    try {
        Write-Host ""
        Write-Host "Checking archive..."
        Invoke-Docker @("compose", "exec", "-T", "db", "sh", "-c", "pg_restore --list '$containerPath' >/dev/null")

        Write-Host "Recreating temporary restore database..."
        $recreateCommand = 'PGDATABASE=postgres dropdb --if-exists -U "$POSTGRES_USER" ' + "'$TestDatabase'" +
                           ' && PGDATABASE=postgres createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" ' + "'$TestDatabase'"
        Invoke-Docker @("compose", "exec", "-T", "db", "sh", "-c", $recreateCommand)

        Write-Host "Restoring backup into temporary database..."
        $restoreCommand = 'pg_restore -U "$POSTGRES_USER" -d ' + "'$TestDatabase'" +
                          " --no-owner --no-privileges '$containerPath'"
        Invoke-Docker @("compose", "exec", "-T", "db", "sh", "-c", $restoreCommand)

        Write-Host ""
        Write-Host "Verifying restored database..."
        $verifyCommand = 'psql -U "$POSTGRES_USER" -d ' + "'$TestDatabase'" +
                         ' -v ON_ERROR_STOP=1 -c "SELECT count(*) AS public_tables FROM information_schema.tables WHERE table_schema=''public'';"' +
                         ' -c "SELECT count(*) AS raids FROM raids;"' +
                         ' -c "SELECT count(*) AS classes FROM classes;"'
        Invoke-Docker @("compose", "exec", "-T", "db", "sh", "-c", $verifyCommand)

        Write-Host ""
        Write-Host "Restore test completed successfully."
        Write-Host "The live Partyfinder database was not modified."
    }
    finally {
        Write-Host ""
        Write-Host "Removing temporary restore database..."
        $dropCommand = 'PGDATABASE=postgres dropdb --if-exists -U "$POSTGRES_USER" ' + "'$TestDatabase'"
        & docker compose exec -T db sh -c $dropCommand | Out-Null
        & docker compose exec -T db sh -c "rm -f '$containerPath'" | Out-Null
    }
}
finally {
    Pop-Location
}
