<# Aside Korean patch launcher. Does not elevate, change permissions, or close applications. #>
[CmdletBinding()]
param(
  [ValidateSet('apply', 'restore', 'status')]
  [string]$Action = 'apply'
)
$ErrorActionPreference = 'Stop'
try {
  $Node = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $Node) { throw 'Node.js 18 or newer is required. Install it from https://nodejs.org and retry.' }
  $Major = & $Node.Source -p 'process.versions.node.split(".")[0]'
  if ($LASTEXITCODE -ne 0 -or [int]$Major -lt 18) { throw 'Node.js 18 or newer is required.' }
  $Patcher = Join-Path $PSScriptRoot 'src\patcher.js'
  if (-not (Test-Path -LiteralPath $Patcher -PathType Leaf)) { throw "Patcher not found: $Patcher" }
  & $Node.Source $Patcher $Action
  $Code = $LASTEXITCODE
  if ($Code -ne 0) {
    Write-Host "[Failed] Patcher exited with code $Code. No automatic restart was attempted." -ForegroundColor Red
    exit $Code
  }
  if ($Action -ne 'status') { Write-Host 'You can now reopen Aside. If access was denied, use an authorized account with access to the displayed assets folder.' }
  exit 0
} catch {
  Write-Host "[Failed] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
