param(
    [string]$BackupDir = "backups",
    [int]$RetentionDays = 14,
    [switch]$SkipRetention
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
    if (-not (Test-Path -LiteralPath ".\compose.yml")) {
        throw "compose.yml was not found in repository root: $RepoRoot"
    }

    $resolvedBackupDir = if ([System.IO.Path]::IsPathRooted($BackupDir)) {
        $BackupDir
    } else {
        Join-Path $RepoRoot $BackupDir
    }

    New-Item -ItemType Directory -Path $resolvedBackupDir -Force | Out-Null

    Write-Host ""
    Write-Host "Ensuring PostgreSQL is running..."
    Invoke-Docker @("compose", "up", "-d", "db")

    $containerId = (& docker compose ps -q db).Trim()
    if (-not $containerId) {
        throw "Could not determine the PostgreSQL container ID."
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $filename = "partyfinder_$timestamp.dump"
    $hostPath = Join-Path $resolvedBackupDir $filename
    $containerPath = "/tmp/$filename"

    Write-Host ""
    Write-Host "Creating PostgreSQL custom-format backup..."
    $dumpCommand = 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f ' + "'" + $containerPath + "'"
    Invoke-Docker @("compose", "exec", "-T", "db", "sh", "-c", $dumpCommand)

    Write-Host "Validating dump structure..."
    Invoke-Docker @("compose", "exec", "-T", "db", "sh", "-c", "pg_restore --list '$containerPath' >/dev/null")

    Write-Host "Copying backup to host..."
    Invoke-Docker @("cp", "${containerId}:$containerPath", $hostPath)

    Invoke-Docker @("compose", "exec", "-T", "db", "sh", "-c", "rm -f '$containerPath'")

    if (-not (Test-Path -LiteralPath $hostPath)) {
        throw "Backup file was not copied to the host."
    }

    $file = Get-Item -LiteralPath $hostPath
    if ($file.Length -le 0) {
        throw "Backup file is empty."
    }

    $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $hostPath
    "$($hash.Hash.ToLower())  $filename" |
        Set-Content -LiteralPath "$hostPath.sha256" -Encoding ascii

    if (-not $SkipRetention -and $RetentionDays -ge 0) {
        $cutoff = (Get-Date).AddDays(-$RetentionDays)

        Get-ChildItem -LiteralPath $resolvedBackupDir -Filter "partyfinder_*.dump" -File |
            Where-Object { $_.LastWriteTime -lt $cutoff } |
            ForEach-Object {
                Write-Host "Removing expired backup: $($_.Name)"
                Remove-Item -LiteralPath $_.FullName -Force

                $oldHash = "$($_.FullName).sha256"
                if (Test-Path -LiteralPath $oldHash) {
                    Remove-Item -LiteralPath $oldHash -Force
                }
            }
    }

    Write-Host ""
    Write-Host "Backup completed successfully."
    Write-Host "File: $hostPath"
    Write-Host ("Size: {0:N2} MB" -f ($file.Length / 1MB))
    Write-Host "SHA256: $($hash.Hash.ToLower())"
}
finally {
    Pop-Location
}
