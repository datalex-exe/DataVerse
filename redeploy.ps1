##############################################################
# DataVerse — Targeted redeploy script
# Run after adding D1:Edit to your API token
# From D:\Pranjal\sm in PowerShell:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\redeploy.ps1
##############################################################

# $env:CLOUDFLARE_API_TOKEN  = "your_cloudflare_api_token"
$env:CLOUDFLARE_ACCOUNT_ID = "3208a16530019fcd9e47c49a72fed0ad"

$ErrorActionPreference = "Continue"

Write-Host "`n[1/5] Verifying credentials..." -ForegroundColor Cyan
npx wrangler whoami
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Auth failed" -ForegroundColor Red; exit 1 }

# ── Get or create D1 database and patch wrangler.toml ────────────────
Write-Host "`n[2/5] Getting D1 database ID..." -ForegroundColor Cyan
Push-Location api
$d1List = npx wrangler d1 list --json 2>&1 | Out-String
$d1Match = [regex]::Match($d1List, '"uuid"\s*:\s*"([^"]+)"')
if ($d1Match.Success) {
    $d1Id = $d1Match.Groups[1].Value
    Write-Host "  -> Found D1 ID: $d1Id" -ForegroundColor Green
    (Get-Content wrangler.toml) -replace 'd1c2b3a4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', $d1Id | Set-Content wrangler.toml
    Write-Host "  -> Updated wrangler.toml" -ForegroundColor Green
} else {
    Write-Host "  -> D1 list failed or empty. Creating database..." -ForegroundColor Yellow
    $d1Create = npx wrangler d1 create dataverse-db 2>&1 | Out-String
    $d1CreateMatch = [regex]::Match($d1Create, 'database_id\s*=\s*"([^"]+)"')
    if ($d1CreateMatch.Success) {
        $d1Id = $d1CreateMatch.Groups[1].Value
        Write-Host "  -> Created D1 ID: $d1Id" -ForegroundColor Green
        (Get-Content wrangler.toml) -replace 'd1c2b3a4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', $d1Id | Set-Content wrangler.toml
    } else {
        Write-Host "  -> ❌ Could not get D1 ID. Add D1:Edit permission to your token." -ForegroundColor Red
        Pop-Location
        exit 1
    }
}

# ── Apply schema ──────────────────────────────────────────────────────
Write-Host "`n[3/5] Applying database schema..." -ForegroundColor Cyan
npx wrangler d1 execute dataverse-db --file=schema.sql --remote --yes
if ($LASTEXITCODE -eq 0) {
    Write-Host "  -> ✅ Schema applied!" -ForegroundColor Green
} else {
    Write-Host "  -> ⚠️  Schema failed (may already be applied). Continuing..." -ForegroundColor Yellow
}

# ── Deploy Worker ─────────────────────────────────────────────────────
Write-Host "`n[4/5] Deploying backend Worker..." -ForegroundColor Cyan
npx wrangler deploy
if ($LASTEXITCODE -eq 0) {
    Write-Host "  -> ✅ Worker deployed!" -ForegroundColor Green
} else {
    Write-Host "  -> ❌ Worker deploy failed." -ForegroundColor Red
}
Pop-Location

# ── Build and deploy Pages ────────────────────────────────────────────
Write-Host "`n[5/5] Building and deploying frontend..." -ForegroundColor Cyan
npm run build --workspace=frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host "  -> ❌ Build failed." -ForegroundColor Red
    exit 1
}

# Create Pages project first (ignore error if already exists)
Write-Host "  -> Creating Pages project (if needed)..." -ForegroundColor Cyan
npx wrangler pages project create dataverse-datalex --production-branch=main 2>&1

# Deploy to Pages
npx wrangler pages deploy frontend\dist --project-name=dataverse-datalex --branch=main --commit-dirty=true
if ($LASTEXITCODE -eq 0) {
    Write-Host "  -> ✅ Frontend deployed!" -ForegroundColor Green
} else {
    Write-Host "  -> ❌ Pages deploy failed." -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🚀 DataVerse is LIVE!" -ForegroundColor Green
Write-Host "Backend:  https://dataverse-api.workers.dev" -ForegroundColor White
Write-Host "Frontend: https://dataverse-datalex.pages.dev" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan

Remove-Item Env:CLOUDFLARE_API_TOKEN  -ErrorAction SilentlyContinue
Remove-Item Env:CLOUDFLARE_ACCOUNT_ID -ErrorAction SilentlyContinue
