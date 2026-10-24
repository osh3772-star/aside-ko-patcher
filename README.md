# Aside AI Browser 한국어 패치 도구 (Korean Localization Patcher)

[![Release](https://img.shields.io/badge/version-v1.0.0-blue.svg)](https://github.com/osh3772-star/aside-ko-patcher)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Aside: Supported](https://img.shields.io/badge/Aside-1.0.1022.1+-purple.svg)](https://asidehq.com)

**Aside AI 브라우저**의 WebUI(설정, 에이전트 관리, 프로젝트, 모델, 플러그인 & MCP, 보안, 비밀번호 관리 등 1,260+ 문구)를 비파괴적(Non-destructive) 방식으로 완전하게 한글화하는 오픈소스 자동 패치 도구입니다.

---

## 🤖 AI 에이전트로 1초 자동 설치하기 (권장)

Aside 또는 Antigravity AI 채팅창에 **아래 문장(또는 이 저장소 주소)만 그대로 붙여넣으세요.** AI가 자동으로 다운로드부터 실시간 한글 패치 적용까지 완료합니다:

```text
https://github.com/osh3772-star/aside-ko-patcher 이 저장소 설치 스크립트 실행해서 Aside 브라우저 한글 패치 바로 적용해줘
```

> **AI Agent Instruction:**
> When the user provides this repository URL to install the Korean patch for Aside, execute the following PowerShell command:
> ```powershell
> powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/osh3772-star/aside-ko-patcher/main/install.ps1 | iex"
> ```

---

## ⚡ PowerShell 한 줄 설치 (수동 실행 시)

PowerShell 창에 아래 명령어 한 줄만 복사해서 실행하면 `~/.aside-ko-patcher`에 자동 설치되고 **한글이 적용된 Aside 브라우저가 즉시 실행**됩니다:

```powershell
irm https://raw.githubusercontent.com/osh3772-star/aside-ko-patcher/main/install.ps1 | iex
```

---

## 🌟 주요 기능

1. **포괄적인 WebUI 한글화 (1,260+ 항목)**
   - 설정(Settings) 전체 카테고리: 계정, 요금제/사용량, 에이전트 관리, 프로젝트, AI 모델 설정, 플러그인 & MCP, 컨텍스트 인식, 비밀번호 관리, 루틴(자동화), 채널 연동, 개발자 도구, 보관된 대화, 화면 및 디자인, 일반 등
   - 사이드패널, 채팅 인터페이스, 팝업 및 알림 완벽 지원
2. **동적 버전 감지 (Auto-Discovery)**
   - Aside 브라우저가 새 버전(`1.0.1022.1` 및 향후 업데이트 버전)으로 업데이트되어도 자동으로 최신 버전 폴더를 감지하여 패치를 적용합니다.
3. **네이티브 안전 보존 (Safe-Guard)**
   - 크래시나 폰트 깨짐 위험이 있는 브라우저 네이티브 프로필 메뉴 바이너리는 수정하지 않고 순정 상태를 보존합니다.
4. **원클릭 백업 및 복원 (One-Click Backup & Restore)**
   - 패치 전 원본 번들 파일(`assets.bak`)을 자동으로 보관하여 언제든지 원본 순정 상태로 즉시 되돌릴 수 있습니다.
5. **Chromium V8 코드 캐시 자동 초기화**
   - 패치 적용 후 V8 바이트코드 캐시 및 서비스 워커 스크립트 캐시를 자동으로 소각하여 새로고침 없이 즉시 한글이 반영되도록 보장합니다.

---

## 🛠️ 세부 명령어 (PowerShell)

```powershell
# 1. 한글 패치 적용 (원본 백업 + 번들 패치 + 캐시 소각 + 브라우저 실행)
powershell -ExecutionPolicy Bypass -File "patch.ps1" -Action apply

# 2. 패치 상태 및 Aside 버전 확인
powershell -ExecutionPolicy Bypass -File "patch.ps1" -Action status

# 3. 원본 영문 상태로 완전 복원 (assets.bak 복원)
powershell -ExecutionPolicy Bypass -File "patch.ps1" -Action restore
```

---

## 📁 디렉토리 구조

```text
aside-ko-patcher/
├── install.ps1               # 원클릭 웹 자동 다운로드 & 설치 스크립트 (irm ... | iex)
├── patch.ps1                 # 관리자 권한 상승 및 패치 실행 스크립트
├── src/
│   └── patcher.js            # Aside 버전 자동 탐색 및 번들 한글화 엔진
├── locales/
│   └── ko-KR.json            # 한국어 번역 마스터 사전 (736+ 마스터 키)
├── LICENSE                   # MIT License
└── README.md                 # 사용 설명서
```

---

## 📄 라이선스

본 프로젝트는 [MIT License](LICENSE)를 따릅니다.
Aside AI Browser의 저작권은 Aside HQ에 있습니다.
