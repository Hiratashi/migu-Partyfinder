$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Users:"
docker compose exec db psql -U partyfinder -d partyfinder -c `
  "select username,is_admin,access_disabled from users order by username;"

Write-Host ""
Write-Host "Party status counts:"
docker compose exec db psql -U partyfinder -d partyfinder -c `
  "select status,count(*) from parties group by status order by status;"

Write-Host ""
Write-Host "Audit events:"
docker compose exec db psql -U partyfinder -d partyfinder -c `
  "select count(*) as audit_events from audit_log;"

Write-Host ""
Write-Host "Raids:"
docker compose exec db psql -U partyfinder -d partyfinder -c `
  "select name,active,sort_order from raids order by sort_order,name;"

Write-Host ""
Write-Host "Classes:"
docker compose exec db psql -U partyfinder -d partyfinder -c `
  "select count(*) as classes from classes;"
