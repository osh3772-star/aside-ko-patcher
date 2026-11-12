# Aside 한국어 패처 1.2.0

Aside의 JavaScript UI에 한국어 번역을 적용하는 비공식 도구입니다. 네이티브 브라우저 바이너리는 수정하지 않습니다. 최신 805개 번역 사전을 포함합니다. **완전한 한국어화를 보장하지 않습니다.** 일부 동적 항목과 설명은 영어로 남을 수 있습니다.

## 수정 사항
- 최신 사용자별 UI: `%LOCALAPPDATA%\\Aside\\User Data\\AsideAgentManager\\<version>\\assets`를 먼저 찾습니다.
- 사용할 수 있는 최신 숫자 버전을 선택하고, 없으면 `C:\\Program Files\\Aside\\Application\\<version>\\AsideAgentManager\\assets`를 찾습니다.
- 선택한 UI 버전, 실제 경로, 검증 상태를 출력합니다. 브라우저 버전과 UI component 버전은 다릅니다.
- 패치 전 JS 구문 검증, 백업 해시 검증, 저장 후 내용 검증을 수행합니다. 매칭이 없으면 실패로 처리합니다.
- 관리자 자동 승격, ACL 변경, 실행 정책 우회, 강제 종료/자동 재실행을 하지 않습니다.
- 기존 도구 설치와 캐시는 고유 이름의 백업으로 보존합니다. 보존 파일은 자동 삭제하지 않아 디스크 공간이 늘어날 수 있습니다.

## 설치와 실행
Node.js 18 이상과 PowerShell이 필요합니다. 먼저 Aside를 정상 종료하고 백그라운드 프로세스도 종료하세요. 실행 정책이 스크립트를 차단하면 보안 정책을 우회하지 말고 조직의 승인된 실행 방법을 사용하세요.

GitHub의 main ZIP을 내려받아 압축 해제한 뒤 PowerShell 7에서 실행합니다:

```powershell
pwsh -NoProfile -File .\\install.ps1
```

설치기는 최신 main을 다운로드해 `$HOME\\.aside-ko-patcher`에 설치합니다. 기존 설치는 형제 backup 폴더에 보존합니다. 다운로드/검증 실패 시 기존 설치를 바꾸지 않습니다. 도구 설치 뒤 패치가 실패하면 실패 종료 코드를 반환합니다.

이미 받은 패키지에서 직접 실행하거나 설치된 폴더에서:
```powershell
pwsh -NoProfile -File .\\patch.ps1 -Action status
pwsh -NoProfile -File .\\patch.ps1 -Action apply
pwsh -NoProfile -File .\\patch.ps1 -Action restore
```
Node 직접 실행도 지원합니다: `node src/patcher.js status`.
적용/복원 성공 후 Aside를 직접 다시 여세요. 실행 중이면 변경하지 않고 오류로 종료합니다. 업데이트로 새 UI 폴더가 생기면 패치를 다시 실행하세요.

## 백업 및 한계
원본 JS는 선택한 assets 옆의 `assets.bak`에 버전/파일명/SHA-256 manifest와 보존됩니다. restore는 현재 선택한 UI의 일치하고 검증된 백업만 복원합니다. 이전 버전의 manifest 없는 백업은 덮어쓰지 않고 중단합니다. 이 경우 기존 패처로 원본을 복원하거나 Aside를 재설치/업데이트한 뒤 새 패처를 사용하세요. 오래된 패처는 강제 종료/권한 변경 동작이 있으므로 실행 전에 검토하세요.
상태의 해시 검증은 저장된 JS 파일을 확인하며 화면의 모든 문구 번역을 보장하지 않습니다. Program Files 쓰기 권한이 없으면 중단하며 권한을 자동 변경하지 않습니다.

테스트/사용자 지정 설치: `ASIDE_USER_DATA_DIR`는 User Data 루트, `ASIDE_APP_DIR`는 Application 루트를 지정합니다.
오프라인 설치: `install.ps1 -PackageArchive <main.zip> -InstallDir <destination>` (부모 폴더가 존재해야 함).

## 검증
`node --test tests/*.test.js` (PowerShell 스크립트 테스트에는 pwsh 필요).
2026-11-10 실제 UI component 1.26.1110.455에서 원본 번역 엔진의 91개 JS / 1,245개 치환 및 구문 검증과 설정 일반 화면의 한국어 표시를 확인했습니다. 일부 사이드바/설명 영어 잔존.
Windows PowerShell 5.1은 구문 검증만 수행했으며, 실행 정책 때문에 실행 회귀 테스트는 수행하지 않았습니다. 실행 회귀 테스트는 PowerShell 7에서 수행했습니다.

MIT License. Aside는 Aside HQ의 제품이며 이 프로젝트는 비공식입니다.
