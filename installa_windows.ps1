# Installa gli add-on QCAD Studio su Windows (con -Verifica e -Ripristina).
# Replica il comportamento di installa.sh: copia i moduli Studio nella
# cartella dati di QCAD e registra i soli entry point nella lista [AddOns]
# della configurazione, con backup e possibilita' di ripristino.
#
# Uso (PowerShell, QCAD chiuso):
#   powershell -ExecutionPolicy Bypass -File .\installa_windows.ps1
#   powershell -ExecutionPolicy Bypass -File .\installa_windows.ps1 -Verifica
#   powershell -ExecutionPolicy Bypass -File .\installa_windows.ps1 -Ripristina
[CmdletBinding()]
param(
    [string]$DataDir = "$env:APPDATA\QCAD\QCAD Professional",
    [string]$ConfigFile = "$env:APPDATA\QCAD\QCAD3.ini",
    [switch]$Verifica,
    [switch]$Ripristina,
    [string]$BackupDir = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PayloadDir = Join-Path $ScriptDir "scripts\Misc"
$BackupName = "backup-studio-qcad"
$Modules = @("StudioDefaults", "StudioCadUI", "StudioDocfa")

# Entry point registrati in [AddOns] List: gli altri file sono caricati
# dagli entry point stessi e non vanno elencati.
$AddonRelativePaths = @(
    "scripts\Misc\StudioDefaults\StudioDefaults.js",
    "scripts\Misc\StudioCadUI\StudioCadUI.js",
    "scripts\Misc\StudioDocfa\StudioDocfa.js",
    "scripts\Misc\StudioDocfa\StudioDocfaControlla\StudioDocfaControlla.js",
    "scripts\Misc\StudioDocfa\StudioDocfaCornice\StudioDocfaCornice.js",
    "scripts\Misc\StudioDocfa\StudioDocfaGuida\StudioDocfaGuida.js",
    "scripts\Misc\StudioDocfa\StudioDocfaPolilinea\StudioDocfaPolilinea.js"
)

$RequiredUiFiles = @(
    "StudioCadUI.js", "StudioCadUIInit.js", "StudioCadLine.js",
    "StudioCadCopy.js", "StudioCadScala.js",
    "icons\draw.svg", "icons\edit.svg", "icons\view.svg", "icons\snap.svg",
    "icons\copy-cad.svg", "icons\docfa-check.svg", "icons\docfa-frame.svg",
    "icons\docfa-guide.svg", "icons\docfa-polygon.svg",
    "icons\docfa-a.svg", "icons\docfa-a2.svg", "icons\docfa-b.svg",
    "icons\docfa-c.svg", "icons\docfa-d.svg", "icons\docfa-e.svg",
    "icons\docfa-f.svg", "icons\docfa-g.svg"
)

function Fail([string]$Message) {
    Write-Error "ERRORE: $Message" -ErrorAction Continue
    exit 1
}

function Test-QcadRunning {
    # Il nome del processo varia con l'edizione: qcad, QCAD, QCAD-Pro.
    $running = Get-Process -ErrorAction SilentlyContinue |
        Where-Object { $_.ProcessName -match '^(qcad|QCAD|QCAD-Pro)' }
    return $null -ne $running
}

# La lista [AddOns] e' una singola riga "List=a, b, c" nel file INI.
function Get-AddonsList {
    $inside = $false
    foreach ($line in Get-Content -LiteralPath $ConfigFile) {
        if ($line -match '^\[AddOns\]$') { $inside = $true; continue }
        if ($line -match '^\[') { $inside = $false; continue }
        if ($inside -and $line -match '^List=(.*)$') { return $Matches[1] }
    }
    return $null
}

function Set-AddonsList([string]$DesiredList) {
    $lines = @(Get-Content -LiteralPath $ConfigFile)
    $output = New-Object System.Collections.Generic.List[string]
    $inside = $false; $written = $false; $seen = $false
    foreach ($line in $lines) {
        if ($line -match '^\[AddOns\]$') {
            if ($inside -and -not $written) { $output.Add("List=$DesiredList"); $written = $true }
            $inside = $true; $seen = $true; $output.Add($line); continue
        }
        if ($line -match '^\[') {
            if ($inside -and -not $written) { $output.Add("List=$DesiredList"); $written = $true }
            $inside = $false; $output.Add($line); continue
        }
        if ($inside -and $line -match '^List=') {
            if (-not $written) { $output.Add("List=$DesiredList"); $written = $true }
            continue
        }
        $output.Add($line)
    }
    if (-not $seen) { Fail "La configurazione non contiene la sezione [AddOns]: non viene modificata." }
    if ($inside -and -not $written) { $output.Add("List=$DesiredList") }

    # Scrittura atomica: file temporaneo nella stessa cartella, poi sostituzione.
    $tempFile = Join-Path (Split-Path -Parent $ConfigFile) (".QCAD3.studio." + [System.IO.Path]::GetRandomFileName())
    Set-Content -LiteralPath $tempFile -Value $output -Encoding UTF8
    Move-Item -LiteralPath $tempFile -Destination $ConfigFile -Force
}

function Test-AddonInList([string]$List, [string]$Wanted) {
    if ([string]::IsNullOrEmpty($List)) { return $false }
    foreach ($entry in $List -split ',') {
        if ($entry.Trim() -eq $Wanted) { return $true }
    }
    return $false
}

function Invoke-Verifica {
    $errors = 0
    Write-Host "Directory dati: $DataDir"
    foreach ($module in $Modules) {
        if (-not (Test-Path -LiteralPath (Join-Path $DataDir "scripts\Misc\$module"))) {
            Write-Host "FAIL modulo mancante: $module"; $errors++
        }
    }
    foreach ($file in $RequiredUiFiles) {
        if (-not (Test-Path -LiteralPath (Join-Path $DataDir "scripts\Misc\StudioCadUI\$file"))) {
            Write-Host "FAIL file mancante: StudioCadUI\$file"; $errors++
        }
    }
    if (Test-Path -LiteralPath $ConfigFile) {
        $list = Get-AddonsList
        if ($null -eq $list) {
            Write-Host "FAIL sezione [AddOns] List non trovata."; $errors++
        }
        else {
            foreach ($relative in $AddonRelativePaths) {
                $addon = Join-Path $DataDir $relative
                if (-not (Test-AddonInList $list $addon)) {
                    Write-Host "FAIL add-on non registrato: $relative"; $errors++
                }
            }
        }
    }
    else {
        Write-Host "FAIL configurazione QCAD non trovata: $ConfigFile"; $errors++
    }
    if ($errors -ne 0) { Write-Host "ESITO: FAIL ($errors problemi)"; exit 1 }
    Write-Host "ESITO: PASS - moduli presenti e registrati. Riavviare QCAD."
    exit 0
}

function Invoke-Ripristina {
    if (Test-QcadRunning) { Fail "QCAD risulta aperto: chiuderlo completamente prima del ripristino." }
    $backupRoot = Join-Path (Split-Path -Parent $ConfigFile) $BackupName
    if ([string]::IsNullOrEmpty($BackupDir)) {
        if (-not (Test-Path -LiteralPath $backupRoot)) { Fail "Nessun backup trovato in $backupRoot" }
        $candidate = Get-ChildItem -LiteralPath $backupRoot -Directory |
            Sort-Object Name | Select-Object -Last 1
        if ($null -eq $candidate) { Fail "Nessun backup trovato in $backupRoot" }
        $script:BackupDir = $candidate.FullName
    }
    $listFile = Join-Path $BackupDir "addons-list.before"
    $dataBefore = Join-Path $BackupDir "data.before"
    if (-not ((Test-Path -LiteralPath $listFile) -and (Test-Path -LiteralPath $dataBefore))) {
        Fail "Backup Studio non valido: $BackupDir"
    }
    foreach ($module in $Modules) {
        $target = Join-Path $DataDir "scripts\Misc\$module"
        if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
        $saved = Join-Path $dataBefore $module
        if (Test-Path -LiteralPath $saved) {
            Copy-Item -LiteralPath $saved -Destination (Join-Path $DataDir "scripts\Misc") -Recurse
        }
    }
    Set-AddonsList (Get-Content -LiteralPath $listFile -Raw).TrimEnd("`r", "`n")
    Write-Host "Ripristino completato dal backup: $BackupDir"
    exit 0
}

# --- Flusso principale ---

if ($Verifica -and $Ripristina) { Fail "Usare -Verifica oppure -Ripristina, non entrambi." }
if ($Verifica) { Invoke-Verifica }
if ($Ripristina) { Invoke-Ripristina }

foreach ($module in $Modules) {
    if (-not (Test-Path -LiteralPath (Join-Path $PayloadDir $module))) {
        Fail "Payload incompleto: manca il modulo $module."
    }
}
foreach ($file in $RequiredUiFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $PayloadDir "StudioCadUI\$file"))) {
        Fail "Payload incompleto: manca StudioCadUI\$file"
    }
}
if (Test-QcadRunning) { Fail "QCAD risulta aperto: chiuderlo completamente prima dell'installazione." }
if (-not (Test-Path -LiteralPath $ConfigFile)) {
    Fail "Configurazione QCAD non trovata: $ConfigFile. Avviare QCAD una volta oppure passare -ConfigFile."
}

$currentList = Get-AddonsList
if ($null -eq $currentList) { Fail "La configurazione non contiene [AddOns] List: non viene modificata." }

$desiredList = $currentList
foreach ($relative in $AddonRelativePaths) {
    $addon = Join-Path $DataDir $relative
    if (-not (Test-AddonInList $desiredList $addon)) {
        if ([string]::IsNullOrEmpty($desiredList)) { $desiredList = $addon }
        else { $desiredList = "$desiredList, $addon" }
    }
}
$configChanged = ($desiredList -ne $currentList)

# Backup prima di toccare qualsiasi cosa.
$timestamp = Get-Date -Format "ddMMyyyy-HHmmss"
$backupPath = Join-Path (Join-Path (Split-Path -Parent $ConfigFile) $BackupName) $timestamp
New-Item -ItemType Directory -Path (Join-Path $backupPath "data.before") -Force | Out-Null
Set-Content -LiteralPath (Join-Path $backupPath "addons-list.before") -Value $currentList -Encoding UTF8
Set-Content -LiteralPath (Join-Path $backupPath "INFO.txt") -Value @("data_dir=$DataDir", "config_file=$ConfigFile") -Encoding UTF8

$miscDir = Join-Path $DataDir "scripts\Misc"
New-Item -ItemType Directory -Path $miscDir -Force | Out-Null
foreach ($module in $Modules) {
    $target = Join-Path $miscDir $module
    if (Test-Path -LiteralPath $target) {
        Copy-Item -LiteralPath $target -Destination (Join-Path $backupPath "data.before") -Recurse
        Remove-Item -LiteralPath $target -Recurse -Force
    }
    Copy-Item -LiteralPath (Join-Path $PayloadDir $module) -Destination $miscDir -Recurse
}

if ($configChanged) { Set-AddonsList $desiredList }

Write-Host "Installazione completata. Backup: $backupPath"
Write-Host "Controllo aggiuntivo: installa_windows.ps1 -Verifica"
Write-Host "Riavviare QCAD per caricare la palette Studio CAD."
