<#
.SYNOPSIS
  Aside AI Browser 한글화 원클릭 웹 설치 스크립트
.DESCRIPTION
  GitHub 저장소에서 최신 한글 패치 도구를 다운로드하여 사용자 로컬에 설치하고 즉시 Aside에 적용합니다.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$InstallDir = Join-Path $env:USERPROFILE ".aside-ko-patcher"
$RepoUrl = "https://github.com/osh3772-star/aside-ko-patcher"
$ZipUrl = "$RepoUrl/archive/refs/heads/main.zip"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Aside AI Browser 한글화 패치 원클릭 자동 설치기" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. 관리자 권한 확인 및 자동 상승
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
  Write-Host "[권한 상승] Aside 파일 수정을 위해 관리자 권한으로 재실행합니다..." -ForegroundColor Yellow
  Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -NoProfile -Command `"irm $RepoUrl/raw/main/install.ps1 | iex`"" -Verb RunAs
  exit 0
}

# 2. Node.js 확인
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCmd) {
  Write-Host "[오류] Node.js가 필요합니다. https://nodejs.org 에서 설치 후 다시 실행해주세요." -ForegroundColor Red
  exit 1
}

# 3. 최신 코드 다운로드
Write-Host "[1/3] 최신 한글화 패키지 다운로드 중..." -ForegroundColor Green
$TempZip = Join-Path $env:TEMP "aside-ko-patcher.zip"
$TempExtract = Join-Path $env:TEMP "aside-ko-patcher-extract"

if (Test-Path $TempExtract) { Remove-Item -Path $TempExtract -Recurse -Force }
Invoke-WebRequest -Uri $ZipUrl -OutFile $TempZip -UseBasicParsing
Expand-Archive -Path $TempZip -DestinationPath $TempExtract -Force
Remove-Item -Path $TempZip -Force

# 4. 설치 폴더로 복사
Write-Host "[2/3] 도구 설치 중: $InstallDir" -ForegroundColor Green
if (Test-Path $InstallDir) { Remove-Item -Path $InstallDir -Recurse -Force }
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path "$TempExtract\aside-ko-patcher-main\*" -Destination $InstallDir -Recurse -Force
Remove-Item -Path $TempExtract -Recurse -Force

# 5. 패치 즉시 적용
Write-Host "[3/3] Aside 브라우저에 한글화 패치 즉시 적용 중..." -ForegroundColor Green
$PatchScript = Join-Path $InstallDir "patch.ps1"
& powershell.exe -ExecutionPolicy Bypass -NoProfile -File $PatchScript -Action apply

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  [완료] Aside AI 브라우저 한글화 설치 및 적용이 완료되었습니다!" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
