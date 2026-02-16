Write-Host "Update Google Refresh Token on Server" -ForegroundColor Cyan

# Add PuTTY to PATH if not already there
$puttyPath = "C:\Program Files\PuTTY"
if (Test-Path $puttyPath) {
    $env:PATH = "$puttyPath;$env:PATH"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigFile = Join-Path $ScriptDir "server-config.txt"

if (Test-Path $ConfigFile) {
    $Config = Get-Content $ConfigFile
    $ServerIP = $Config[0].Trim()
    $Username = $Config[1].Trim()
    $Password = $Config[2].Trim()
} else {
    Write-Host "Config file not found" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

# Read the new token from local .env.local
$ProjectDir = Split-Path -Parent $ScriptDir
$EnvFile = Join-Path $ProjectDir ".env.local"
$NewToken = (Get-Content $EnvFile | Where-Object { $_ -match "^GOOGLE_REFRESH_TOKEN=" }) -replace "^GOOGLE_REFRESH_TOKEN=", ""

if ([string]::IsNullOrEmpty($NewToken)) {
    Write-Host "Could not find GOOGLE_REFRESH_TOKEN in .env.local" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "New token: $($NewToken.Substring(0, 20))..." -ForegroundColor Green
Write-Host "Server: $ServerIP" -ForegroundColor Green

# Cache the host key first (accept automatically)
Write-Host "Caching SSH host key..." -ForegroundColor Cyan
echo y | plink -ssh -pw "$Password" "${Username}@${ServerIP}" "exit" 2>$null

Write-Host "Updating token on server..." -ForegroundColor Yellow
plink -ssh -batch -pw "$Password" "${Username}@${ServerIP}" "cd /root/barangay-website && sed -i 's|^GOOGLE_REFRESH_TOKEN=.*|GOOGLE_REFRESH_TOKEN=$NewToken|' .env.local"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Token updated!" -ForegroundColor Green

    Write-Host "Restarting application..." -ForegroundColor Yellow
    plink -ssh -batch -pw "$Password" "${Username}@${ServerIP}" "pm2 restart barangay-website"

    Write-Host "Done! Server is using the new token." -ForegroundColor Green
} else {
    Write-Host "Failed to update token. Trying with manual host key acceptance..." -ForegroundColor Yellow
    Write-Host "Please run this command manually first to accept the host key:" -ForegroundColor Cyan
    Write-Host "  plink -ssh ${Username}@${ServerIP}" -ForegroundColor White
    Write-Host "Type 'y' when prompted, then try this script again." -ForegroundColor Cyan
}

Read-Host "Press Enter to exit"
