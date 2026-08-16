# Phase 3B.1 production deployment cleanup

Two issues were found during the first Linux clone.

## `NUL`

The repository contained an accidental tracked file named:

```text
NUL
```

The patch installer removes it from the working tree and adds `NUL` to
`.gitignore`.

Commit the deletion afterward so future Linux clones no longer contain it.

## Docker privilege

`miguadmin` is intentionally not a member of the `docker` group because Docker
group membership is effectively root-equivalent.

Therefore the production deployment script now uses:

```bash
sudo docker compose ...
```

instead of direct `docker compose`.

## Apply locally

```powershell
.\apply-upgrade.ps1 -RepoPath "D:\GIT\migu-s-Partyfinder"

cd D:\GIT\migu-s-Partyfinder
git add -A
git commit -m "Fix production deployment permissions"
git push
```

Then on the Droplet:

```bash
cd /opt/migu-partyfinder
git pull --ff-only
```

No database migration or Docker rebuild is required.
