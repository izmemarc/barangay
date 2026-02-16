Write-Host "Barangay Monorepo Deployment" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

trap {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Add PuTTY to PATH if not already there
$puttyPath = "C:\Program Files\PuTTY"
if (Test-Path $puttyPath) {
    $env:PATH = "$puttyPath;$env:PATH"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

# Server config
$ServersFile = Join-Path $ScriptDir "servers.txt"
$SingleServerFile = Join-Path $ScriptDir "server-config.txt"

$Servers = @()

if (Test-Path $ServersFile) {
    $lines = Get-Content $ServersFile | Where-Object { $_ -ne "" }
    for ($i = 0; $i -lt $lines.Count; $i += 4) {
        $server = @{
            IP = $lines[$i].Trim()
            Username = $lines[$i + 1].Trim()
            Password = $lines[$i + 2].Trim()
            Label = if ($i + 3 -lt $lines.Count -and $lines[$i + 3] -notmatch '^\d') { $lines[$i + 3].Trim() } else { "Server $([math]::Floor($i/4) + 1)" }
        }
        $Servers += $server
    }
    Write-Host "Found $($Servers.Count) servers" -ForegroundColor Green
} elseif (Test-Path $SingleServerFile) {
    $Config = Get-Content $SingleServerFile
    $Servers += @{
        IP = $Config[0].Trim()
        Username = $Config[1].Trim()
        Password = $Config[2].Trim()
        Label = "Server 1"
    }
} else {
    Write-Host "No server config found! Create deployment/servers.txt" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

foreach ($s in $Servers) {
    Write-Host "  $($s.Label): $($s.IP)" -ForegroundColor Green
}

Set-Location $ProjectDir

# Clean local caches
Write-Host "`nCleaning local caches..." -ForegroundColor Yellow
Get-ChildItem -Path "sites" -Directory | ForEach-Object {
    Remove-Item -Recurse -Force (Join-Path $_.FullName ".next") -ErrorAction SilentlyContinue
}

# Create archive with monorepo structure
Write-Host "Creating archive..." -ForegroundColor Yellow
$Archive = "deploy.zip"
Remove-Item $Archive -Force -ErrorAction SilentlyContinue

# Archive the monorepo: packages/, sites/, deployment/, root config files
Compress-Archive -Path "packages", "sites", "deployment", "pnpm-workspace.yaml", "package.json", ".npmrc", "tsconfig.base.json" -DestinationPath $Archive -Force

if (-not (Test-Path $Archive)) {
    Write-Host "Archive creation failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Archive created: $Archive ($([math]::Round((Get-Item $Archive).Length / 1MB, 1)) MB)" -ForegroundColor Green

$RemotePath = "/root/barangay-monorepo"
$HealthEndpoint = "/api/oauth/health"
$SuccessCount = 0
$FailCount = 0

function Deploy-ToServer {
    param (
        [hashtable]$Server,
        [string]$ArchivePath,
        [int]$ServerIndex,
        [int]$TotalServers
    )

    $ip = $Server.IP
    $user = $Server.Username
    $pw = $Server.Password
    $label = $Server.Label

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Deploying to $label ($ip) [$($ServerIndex+1)/$TotalServers]" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    # Test SSH
    echo y | plink -ssh -pw "$pw" "${user}@${ip}" "echo 'OK'" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "SSH connection failed!" -ForegroundColor Red
        return $false
    }

    # Create directory
    echo y | plink -ssh -pw "$pw" "${user}@${ip}" "mkdir -p $RemotePath/logs"

    # Clean old archives and code (keep .env.local files in sites/*)
    Write-Host "Cleaning old files..." -ForegroundColor Cyan
    echo y | plink -ssh -pw "$pw" "${user}@${ip}" "cd $RemotePath && rm -f deploy*.zip && rm -rf packages deployment pnpm-workspace.yaml tsconfig.base.json"
    # Clean site dirs but preserve .env.local
    echo y | plink -ssh -pw "$pw" "${user}@${ip}" "cd $RemotePath && for d in sites/*/; do [ -d `"`$d`" ] && find `"`$d`" -maxdepth 1 ! -name .env.local ! -name `"`$(basename `$d)`" -exec rm -rf {} + 2>/dev/null; done"

    # Upload
    Write-Host "Uploading archive..." -ForegroundColor Yellow
    pscp -pw "$pw" $ArchivePath "${user}@${ip}:${RemotePath}/"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Upload failed!" -ForegroundColor Red
        return $false
    }

    # Extract
    Write-Host "Extracting..." -ForegroundColor Yellow
    echo y | plink -ssh -pw "$pw" "${user}@${ip}" "cd $RemotePath && unzip -o -q deploy.zip && rm deploy.zip"

    # Install pnpm if needed
    Write-Host "Checking pnpm..." -ForegroundColor Yellow
    echo y | plink -ssh -pw "$pw" "${user}@${ip}" "which pnpm > /dev/null 2>&1 || npm install -g pnpm"

    # Install dependencies
    Write-Host "Installing dependencies (pnpm install)..." -ForegroundColor Yellow
    echo y | plink -ssh -pw "$pw" "${user}@${ip}" "cd $RemotePath && pnpm install --frozen-lockfile 2>&1 || pnpm install 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "pnpm install failed!" -ForegroundColor Red
        return $false
    }

    # Build all sites
    Write-Host "Building all sites..." -ForegroundColor Yellow
    $buildResult = echo y | plink -ssh -pw "$pw" "${user}@${ip}" "cd $RemotePath && NODE_OPTIONS='--max-old-space-size=3072' pnpm build:all 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed! Trying individual builds..." -ForegroundColor Red
        # Try building banadero alone
        $buildResult = echo y | plink -ssh -pw "$pw" "${user}@${ip}" "cd $RemotePath && NODE_OPTIONS='--max-old-space-size=3072' pnpm build:banadero 2>&1"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Build failed!" -ForegroundColor Red
            $buildResult | Select-Object -Last 20 | ForEach-Object { Write-Host $_ -ForegroundColor Red }
            return $false
        }
    }
    Write-Host "Build complete." -ForegroundColor Green

    # Check env vars for each site
    Write-Host "Checking environment variables..." -ForegroundColor Yellow
    $envCheck = echo y | plink -ssh -pw "$pw" "${user}@${ip}" "for d in $RemotePath/sites/*/; do name=`$(basename `$d); if [ -f `"`$d.env.local`" ]; then echo `"OK: `$name`"; else echo `"MISSING: `$name`"; fi; done"
    Write-Host $envCheck -ForegroundColor Cyan

    # Configure nginx
    Write-Host "Configuring nginx..." -ForegroundColor Yellow
    echo y | plink -ssh -pw "$pw" "${user}@${ip}" "sudo cp $RemotePath/deployment/nginx/barangay-sites.conf /etc/nginx/sites-available/barangay-sites && sudo ln -sf /etc/nginx/sites-available/barangay-sites /etc/nginx/sites-enabled/"

    $sslCheck = echo y | plink -ssh -pw "$pw" "${user}@${ip}" "test -d /etc/letsencrypt/live/default && echo 'SSL_EXISTS' || echo 'SSL_MISSING'"
    if ($sslCheck -match "SSL_MISSING") {
        Write-Host "  No SSL cert. Using HTTP-only fallback." -ForegroundColor Yellow
        echo y | plink -ssh -pw "$pw" "${user}@${ip}" @"
cat > /etc/nginx/sites-available/barangay-sites << 'NGINXEOF'
map `$host `$backend_port {
    default                     3001;
    banaderolegazpi.online      3001;
    www.banaderolegazpi.online  3001;
}
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 10M;
    proxy_http_version 1.1;
    proxy_set_header Host `$host;
    proxy_set_header X-Real-IP `$remote_addr;
    proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto `$scheme;
    location /_next/static/ { proxy_pass http://127.0.0.1:`$backend_port; add_header Cache-Control "public, max-age=31536000, immutable" always; }
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp|avif|woff|woff2|css|js)$ { proxy_pass http://127.0.0.1:`$backend_port; add_header Cache-Control "public, max-age=31536000, immutable" always; }
    location /api/ { proxy_pass http://127.0.0.1:`$backend_port; add_header Cache-Control "no-cache, no-store, must-revalidate" always; }
    location / { proxy_pass http://127.0.0.1:`$backend_port; }
}
NGINXEOF
"@
    }

    $nginxTest = echo y | plink -ssh -pw "$pw" "${user}@${ip}" "sudo nginx -t 2>&1"
    if ($nginxTest -match "test is successful") {
        Write-Host "  Nginx config valid." -ForegroundColor Green
        echo y | plink -ssh -pw "$pw" "${user}@${ip}" "sudo systemctl restart nginx"
    } else {
        Write-Host "  Nginx config test failed!" -ForegroundColor Red
    }

    # Firewall
    echo y | plink -ssh -pw "$pw" "${user}@${ip}" "sudo ufw allow 80/tcp > /dev/null 2>&1; sudo ufw allow 443/tcp > /dev/null 2>&1; sudo ufw allow 22/tcp > /dev/null 2>&1"

    # Start with PM2
    Write-Host "Starting with PM2..." -ForegroundColor Yellow
    echo y | plink -ssh -pw "$pw" "${user}@${ip}" "cd $RemotePath && pm2 stop all > /dev/null 2>&1; pm2 delete all > /dev/null 2>&1; pm2 flush > /dev/null 2>&1"
    echo y | plink -ssh -pw "$pw" "${user}@${ip}" "cd $RemotePath && pm2 start deployment/ecosystem.config.js 2>&1 && pm2 save > /dev/null 2>&1"

    # Health check
    Write-Host "Health check (waiting 8s)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 8
    $healthResult = echo y | plink -ssh -pw "$pw" "${user}@${ip}" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001${HealthEndpoint}"

    if ($healthResult -eq "200") {
        Write-Host "$label is HEALTHY (HTTP 200)" -ForegroundColor Green
        return $true
    } else {
        Write-Host "$label health check: $healthResult" -ForegroundColor Red
        echo y | plink -ssh -pw "$pw" "${user}@${ip}" "pm2 logs banadero --lines 15 --nostream"
        return $false
    }
}

# Rolling deployment
Write-Host "`n--- Starting Rolling Deployment ---" -ForegroundColor Cyan

for ($i = 0; $i -lt $Servers.Count; $i++) {
    $result = Deploy-ToServer -Server $Servers[$i] -ArchivePath $Archive -ServerIndex $i -TotalServers $Servers.Count

    if ($result) {
        $SuccessCount++
    } else {
        $FailCount++
        if ($i -lt $Servers.Count - 1) {
            $continue = Read-Host "Server failed. Continue? (Y/N)"
            if ($continue -ne 'Y' -and $continue -ne 'y') { break }
        }
    }

    if ($result -and $i -lt $Servers.Count - 1) {
        Write-Host "Waiting 30s before next server..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }
}

Remove-Item $Archive -Force -ErrorAction SilentlyContinue

Write-Host "`n=============================" -ForegroundColor Cyan
Write-Host "Success: $SuccessCount / $($Servers.Count)" -ForegroundColor $(if ($FailCount -eq 0) { "Green" } else { "Yellow" })
if ($FailCount -gt 0) {
    Write-Host "Failed: $FailCount" -ForegroundColor Red
}
Read-Host "`nPress Enter to exit"
