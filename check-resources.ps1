# Check resource usage of banadero dev server
# Run: powershell -ExecutionPolicy Bypass .\check-resources.ps1

Write-Host "`n=== Banadero Resource Monitor ===" -ForegroundColor Cyan
Write-Host ""

# Find Next.js dev server on port 3001
$port = 3001
$connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1

if ($connection) {
    $pid = $connection.OwningProcess
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue

    if ($process) {
        Write-Host "Dev Server Found (Port $port):" -ForegroundColor Green
        Write-Host ("  PID:        {0}" -f $process.Id)
        Write-Host ("  Name:       {0}" -f $process.ProcessName)
        Write-Host ("  CPU Time:   {0:F2} seconds" -f $process.CPU)
        Write-Host ("  RAM:        {0:F0} MB" -f ($process.WorkingSet64 / 1MB))
        Write-Host ("  Threads:    {0}" -f $process.Threads.Count)

        # Get CPU percentage (sample over 1 second)
        $cpu1 = $process.CPU
        Start-Sleep -Milliseconds 1000
        $process.Refresh()
        $cpu2 = $process.CPU
        $cpuPercent = ($cpu2 - $cpu1) * 100

        Write-Host ("  CPU Usage:  {0:F1}%" -f $cpuPercent) -ForegroundColor Yellow
        Write-Host ""
    }
} else {
    Write-Host "Dev server not running on port $port" -ForegroundColor Red
    Write-Host "Start it with: pnpm dev:banadero" -ForegroundColor Yellow
    Write-Host ""
}

# Show all Node.js processes
Write-Host "All Node.js Processes:" -ForegroundColor Cyan
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    $totalRAM = 0
    Write-Host ("  {0,-8} {1,-15} {2,-12} {3}" -f "PID", "CPU (seconds)", "RAM (MB)", "Command Line")
    Write-Host ("  {0,-8} {1,-15} {2,-12} {3}" -f "---", "-------------", "--------", "------------")

    foreach ($proc in $nodeProcesses) {
        $ramMB = [math]::Round($proc.WorkingSet64 / 1MB, 0)
        $totalRAM += $ramMB

        # Try to get command line
        $cmdLine = ""
        try {
            $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
            if ($cmdLine -and $cmdLine.Length -gt 50) {
                $cmdLine = $cmdLine.Substring(0, 50) + "..."
            }
        } catch {
            $cmdLine = "N/A"
        }

        Write-Host ("  {0,-8} {1,-15:F2} {2,-12} {3}" -f $proc.Id, $proc.CPU, $ramMB, $cmdLine)
    }

    Write-Host ""
    Write-Host ("  Total RAM: {0} MB" -f $totalRAM) -ForegroundColor Yellow
    Write-Host ("  Process Count: {0}" -f $nodeProcesses.Count) -ForegroundColor Yellow
} else {
    Write-Host "  No Node.js processes found" -ForegroundColor Red
}

Write-Host ""

# System info
Write-Host "Your PC Specs:" -ForegroundColor Cyan
$cpu = Get-CimInstance -ClassName Win32_Processor
$ram = Get-CimInstance -ClassName Win32_ComputerSystem
Write-Host ("  CPU:  {0} ({1} cores)" -f $cpu.Name.Trim(), $cpu.NumberOfLogicalProcessors)
Write-Host ("  RAM:  {0:F1} GB total" -f ($ram.TotalPhysicalMemory / 1GB))

$ramUsed = (Get-Counter '\Memory\Available MBytes').CounterSamples.CookedValue
$ramTotal = $ram.TotalPhysicalMemory / 1MB
$ramUsedPercent = (($ramTotal - $ramUsed) / $ramTotal) * 100
Write-Host ("        {0:F1} GB used ({1:F0}%)" -f (($ramTotal - $ramUsed) / 1024), $ramUsedPercent)

Write-Host ""
