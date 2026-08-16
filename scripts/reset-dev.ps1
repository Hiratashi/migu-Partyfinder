param(
    [Parameter(Mandatory=$false)]
    [switch]$ConfirmReset
)

$ErrorActionPreference = "Stop"

if (-not $ConfirmReset) {
    Write-Host ""
    Write-Host "DEVELOPMENT DATABASE RESET"
    Write-Host "This will permanently delete all Partyfinder database data:"
    Write-Host "  - users"
    Write-Host "  - characters"
    Write-Host "  - availability"
    Write-Host "  - parties / memberships / invitations"
    Write-Host "  - sessions"
    Write-Host "  - Discord OAuth tokens"
    Write-Host "  - audit log"
    Write-Host ""
    Write-Host "It will then recreate the schema using migrations."
    Write-Host ""
    Write-Host "Run again with:"
    Write-Host "  .\scripts\reset-dev.ps1 -ConfirmReset"
    Write-Host ""
    exit 2
}

Write-Host ""
Write-Host "Stopping application containers..."
docker compose down

Write-Host ""
Write-Host "Removing development database volume..."
docker compose down -v

Write-Host ""
Write-Host "Starting database..."
docker compose up -d db

Write-Host ""
Write-Host "Waiting for PostgreSQL..."
$ready = $false

for ($i = 0; $i -lt 30; $i++) {
    docker compose exec -T db pg_isready -U partyfinder -d partyfinder *> $null

    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }

    Start-Sleep -Seconds 1
}

if (-not $ready) {
    throw "PostgreSQL did not become ready in time."
}

Write-Host ""
Write-Host "Running all migrations..."
docker compose run --rm migrate

if ($LASTEXITCODE -ne 0) {
    throw "Migration failed."
}

Write-Host ""
Write-Host "Development database reset completed."
Write-Host ""
Write-Host "Next:"
Write-Host "  docker compose up -d --build"
Write-Host ""
Write-Host "Then log in with Discord again to create fresh user accounts."
