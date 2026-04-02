param(
    [string]$TaskName = "SafeGuardExternalFeedImporter",
    [string]$ConfigPath = "external_feed_importer_config.json",
    [string]$PythonExe = "",
    [int]$IntervalMinutes = 1
)

$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $workspace

if ([string]::IsNullOrWhiteSpace($PythonExe)) {
    if (Test-Path ".venv\Scripts\python.exe") {
        $PythonExe = (Resolve-Path ".venv\Scripts\python.exe").Path
    } else {
        $cmd = Get-Command python -ErrorAction SilentlyContinue
        if ($null -eq $cmd) {
            throw "Python executable not found. Provide -PythonExe."
        }
        $PythonExe = $cmd.Source
    }
}

$configFullPath = if ([System.IO.Path]::IsPathRooted($ConfigPath)) {
    $ConfigPath
} else {
    (Resolve-Path $ConfigPath).Path
}

$importerPath = (Resolve-Path "external_feed_importer.py").Path
$argument = "`"$importerPath`" --config `"$configFullPath`""

$action = New-ScheduledTaskAction -Execute $PythonExe -Argument $argument -WorkingDirectory $workspace
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
    -RepetitionDuration ([TimeSpan]::MaxValue)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel LeastPrivilege

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "Scheduled task '$TaskName' created/updated."
Write-Host "Python: $PythonExe"
Write-Host "Config: $configFullPath"
Write-Host "Interval: every $IntervalMinutes minute(s)"

Start-ScheduledTask -TaskName $TaskName
Write-Host "Task started."
