<#
.SYNOPSIS
  Aside AI Browser 한글화 패치 PowerShell 실행기
.PARAMETER Action
  apply    - 한글 패치 적용 (기본값)
  restore  - 순정 영문 상태로 복원
  status   - 현재 상태 및 버전 확인
#>
[CmdletBinding()]
param(
  [ValidateSet('apply', 'restore', 'status')]
  [string]$Action = 'apply'
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 관리자 권한 확인 및 자동 상승
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin -and $Action -ne 'status') {
  Write-Host "[권한 상승] Aside 파일 수정을 위해 관리자 권한으로 재실행합니다..." -ForegroundColor Cyan
  Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -NoProfile -File `"$PSCommandPath`" -Action $Action" -Verb RunAs
  exit 0
}

# Node.js 확인
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCmd) {
  Write-Host "[오류] Node.js가 설치되어 있지 않습니다. https://nodejs.org 에서 설치해주세요." -ForegroundColor Red
  exit 1
}

# Aside 디렉터리 권한 부여
$AsideAppDir = "C:\Program Files\Aside\Application"
if (Test-Path $AsideAppDir) {
  try {
    icacls $AsideAppDir /grant "Users:(OI)(CI)F" /T /C /Q | Out-Null
  } catch {}
}

# Aside 실행 중이면 종료 안내
if ($Action -in @('apply', 'restore')) {
  $AsideProcs = Get-Process -Name "Aside" -ErrorAction SilentlyContinue
  if ($AsideProcs) {
    Write-Host "[1/3] 실행 중인 Aside 브라우저를 종료합니다..." -ForegroundColor Yellow
    Stop-Process -Name "Aside" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }
}

# 패처 실행
$PatcherJs = Join-Path $ScriptDir "src\patcher.js"
& node $PatcherJs $Action

# 적용 완료 후 브라우저 재실행
if ($Action -eq 'apply') {
  $AsideExe = "C:\Program Files\Aside\Application\Aside.exe"
  if (Test-Path $AsideExe) {
    Write-Host "[재실행] 한글 모드로 Aside 브라우저를 실행합니다..." -ForegroundColor Green
    Start-Process $AsideExe -ArgumentList "--lang=ko"
  }
}
