<# Download, validate and install the patcher. Existing installations are retained. #>
[CmdletBinding()]
param(
  [string]$InstallDir = (Join-Path $env:USERPROFILE '.aside-ko-patcher'),
  [string]$PackageArchive
)
$ErrorActionPreference = 'Stop'
try {
  $Node = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $Node) { throw 'Node.js 18 or newer is required. Install it from https://nodejs.org and retry.' }
  $Major = & $Node.Source -p 'process.versions.node.split(".")[0]'
  if ($LASTEXITCODE -ne 0 -or [int]$Major -lt 18) { throw 'Node.js 18 or newer is required.' }

  $InstallDir = [IO.Path]::GetFullPath($InstallDir).TrimEnd([IO.Path]::DirectorySeparatorChar)
  $Parent = Split-Path -Parent $InstallDir
  if (-not $Parent -or -not (Test-Path -LiteralPath $Parent -PathType Container)) { throw 'Installation parent directory must already exist.' }
  if ((Test-Path -LiteralPath $InstallDir) -and -not (Test-Path -LiteralPath $InstallDir -PathType Container)) { throw 'Installation destination is not a directory.' }
  $Id = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N')
  $Work = Join-Path $env:TEMP ("aside-ko-patcher-" + $Id)
  New-Item -ItemType Directory -Path $Work | Out-Null
  if ($PackageArchive) {
    $Zip = (Resolve-Path -LiteralPath $PackageArchive).Path
  } else {
    $Zip = Join-Path $Work 'package.zip'
    Invoke-WebRequest -Uri 'https://github.com/osh3772-star/aside-ko-patcher/archive/refs/heads/main.zip' -OutFile $Zip -UseBasicParsing
  }
  $Extract = Join-Path $Work 'extracted'
  Expand-Archive -LiteralPath $Zip -DestinationPath $Extract
  $Package = Join-Path $Extract 'aside-ko-patcher-main'
  foreach ($Relative in @('patch.ps1', 'src\patcher.js', 'locales\ko-KR.json')) {
    if (-not (Test-Path -LiteralPath (Join-Path $Package $Relative) -PathType Leaf)) { throw "Invalid package: missing $Relative" }
  }
  & $Node.Source --check (Join-Path $Package 'src\patcher.js')
  if ($LASTEXITCODE -ne 0) { throw 'Downloaded patcher failed JavaScript syntax validation.' }
  $Dictionary = Get-Content -LiteralPath (Join-Path $Package 'locales\ko-KR.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not $Dictionary -or $Dictionary -is [array] -or $Dictionary -isnot [pscustomobject]) { throw 'Invalid translation dictionary.' }
  $Tokens = $null; $ParseErrors = $null
  [void][Management.Automation.Language.Parser]::ParseFile((Join-Path $Package 'patch.ps1'), [ref]$Tokens, [ref]$ParseErrors)
  if ($ParseErrors.Count) { throw 'Downloaded launcher failed PowerShell syntax validation.' }

  # Resolve both sibling destinations before moving anything. Never delete the previous installation.
  $Stage = [IO.Path]::GetFullPath($InstallDir + '.staging-' + $Id)
  $Backup = [IO.Path]::GetFullPath($InstallDir + '.backup-' + $Id)
  if ((Split-Path -Parent $Stage) -ne $Parent -or (Split-Path -Parent $Backup) -ne $Parent) { throw 'Unsafe installation paths.' }
  Copy-Item -LiteralPath $Package -Destination $Stage -Recurse
  $PreviousMoved = $false
  try {
    if (Test-Path -LiteralPath $InstallDir) {
      Move-Item -LiteralPath $InstallDir -Destination $Backup
      $PreviousMoved = $true
      Write-Host "Previous installation preserved at: $Backup"
    }
    Move-Item -LiteralPath $Stage -Destination $InstallDir
  } catch {
    if ($PreviousMoved -and -not (Test-Path -LiteralPath $InstallDir)) {
      Move-Item -LiteralPath $Backup -Destination $InstallDir
    }
    throw
  }
  Write-Host "Installed tool at: $InstallDir"
  $Shell = if ($PSVersionTable.PSEdition -eq 'Core') { Join-Path $PSHOME 'pwsh.exe' } else { Join-Path $PSHOME 'powershell.exe' }
  & $Shell -NoProfile -File (Join-Path $InstallDir 'patch.ps1') -Action apply
  $Code = $LASTEXITCODE
  if ($Code -ne 0) {
    Write-Host "[Failed] Tool installed, but patch application failed (exit $Code). Close Aside normally and retry patch.ps1 -Action apply. Previous installation and staging files were retained." -ForegroundColor Red
    exit $Code
  }
  Write-Host '[Complete] Installation and patch application succeeded. Reopen Aside manually.'
  exit 0
} catch {
  Write-Host "[Failed] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
