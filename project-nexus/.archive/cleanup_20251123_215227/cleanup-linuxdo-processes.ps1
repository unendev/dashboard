# LinuxDo Process Cleanup Script
# Purpose: Close all LinuxDo related processes to allow re-running batch files

Write-Host "========================================"
Write-Host "LinuxDo Process Cleanup"
Write-Host "========================================"
Write-Host ""

# Find all LinuxDo related processes
$processes = Get-WmiObject Win32_Process | Where-Object {
    $_.CommandLine -like "*linuxdo*" -or 
    $_.CommandLine -like "*run-linuxdo*" -or
    $_.CommandLine -like "*scraper_optimized.py*"
}

if ($processes.Count -eq 0) {
    Write-Host "No LinuxDo related processes found." -ForegroundColor Green
    exit 0
}

Write-Host "Found $($processes.Count) process(es):" -ForegroundColor Yellow
foreach ($proc in $processes) {
    Write-Host "  - PID: $($proc.ProcessId) | Name: $($proc.Name) | CommandLine: $($proc.CommandLine)"
}
Write-Host ""

# Ask for confirmation
$confirmation = Read-Host "Do you want to close these processes? (Y/N)"
if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit 0
}

# Close processes
$closedCount = 0
foreach ($proc in $processes) {
    try {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
        Write-Host "Closed: PID $($proc.ProcessId) ($($proc.Name))" -ForegroundColor Green
        $closedCount++
    } catch {
        Write-Host "Failed to close PID $($proc.ProcessId): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "Cleanup completed: $closedCount process(es) closed" -ForegroundColor Green
Write-Host "========================================"









