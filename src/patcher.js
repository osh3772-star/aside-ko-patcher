#!/usr/bin/env node
/**
 * Aside AI Browser Korean Localization Patcher (src/patcher.js)
 * 
 * Automatically discovers any current and future Aside version in Program Files,
 * applies comprehensive Korean translations across WebUI, Settings, Agent Manager,
 * clears V8 bytecode / script caches, and provides backup/restore capability.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const DICT_PATH = path.join(REPO_ROOT, 'locales', 'ko-KR.json');

const APP_DIR = process.env.ASIDE_APP_DIR || 'C:\\Program Files\\Aside\\Application';
const USER_DATA_DIR = path.join(process.env.LOCALAPPDATA || '', 'Aside', 'User Data');

const SEGMENTS_MAP = {
  'segments:["Settings","Security & Privacy"]': 'segments:["설정","보안 및 개인정보"]',
  'segments:["Settings","Account"]': 'segments:["설정","계정"]',
  'segments:["Settings","Plan & Usage"]': 'segments:["설정","요금제 및 사용량"]',
  'segments:["Settings","Agents"]': 'segments:["설정","에이전트 관리"]',
  'segments:["Settings","Projects"]': 'segments:["설정","프로젝트"]',
  'segments:["Settings","Models"]': 'segments:["설정","AI 모델 설정"]',
  'segments:["Settings","Plugins & MCPs"]': 'segments:["설정","플러그인 및 MCP"]',
  'segments:["Settings","Context Awareness"]': 'segments:["설정","컨텍스트 인식"]',
  'segments:["Settings","Passwords"]': 'segments:["설정","비밀번호 관리"]',
  'segments:["Settings","Routines"]': 'segments:["설정","루틴 (자동화)"]',
  'segments:["Settings","Channels"]': 'segments:["설정","채널 연동"]',
  'segments:["Settings","Developers"]': 'segments:["설정","개발자 도구"]',
  'segments:["Settings","Archived chats"]': 'segments:["설정","보관된 대화"]',
  'segments:["Settings","Appearance"]': 'segments:["설정","화면 및 디자인"]',
  'segments:["Settings","General"]': 'segments:["설정","일반"]'
};

function findLatestAsideVersion() {
  if (!fs.existsSync(APP_DIR)) {
    return null;
  }
  const entries = fs.readdirSync(APP_DIR);
  const versionDirs = entries
    .filter(name => /^\d+(\.\d+)+$/.test(name) && fs.statSync(path.join(APP_DIR, name)).isDirectory())
    .sort((a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] || 0) - (pb[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });

  if (versionDirs.length === 0) return null;
  const latestVer = versionDirs[versionDirs.length - 1];
  const assetsDir = path.join(APP_DIR, latestVer, 'AsideAgentManager', 'assets');
  return {
    version: latestVer,
    versionDir: path.join(APP_DIR, latestVer),
    assetsDir: fs.existsSync(assetsDir) ? assetsDir : null
  };
}

function clearCaches() {
  console.log('[+] Chromium V8 코드 캐시 및 스크립트 캐시 초기화 중...');
  const cacheDirs = [
    path.join(USER_DATA_DIR, 'Default', 'Code Cache', 'js'),
    path.join(USER_DATA_DIR, 'Default', 'Service Worker', 'ScriptCache')
  ];

  for (const cDir of cacheDirs) {
    if (fs.existsSync(cDir)) {
      try {
        const files = fs.readdirSync(cDir);
        files.forEach(f => {
          try { fs.unlinkSync(path.join(cDir, f)); } catch (_) {}
        });
      } catch (_) {}
    }
  }
  console.log('    -> 캐시 초기화 완료.');
}

function killAsideProcesses() {
  try {
    execSync('taskkill /F /IM Aside.exe /T', { stdio: 'ignore' });
  } catch (_) {}
}

async function applyPatch() {
  console.log('============================================================');
  console.log('  Aside AI 브라우저 한글화 패치 적용 (Korean Localization)');
  console.log('============================================================');

  const aside = findLatestAsideVersion();
  if (!aside || !aside.assetsDir) {
    console.error(`[오류] Aside 설치 디렉터리 또는 Assets를 찾을 수 없습니다: ${APP_DIR}`);
    process.exit(1);
  }

  console.log(`[1/4] Aside 최신 버전 감지: v${aside.version}`);
  console.log(`      경로: ${aside.assetsDir}`);

  if (!fs.existsSync(DICT_PATH)) {
    console.error(`[오류] 한글화 사전 파일이 존재하지 않습니다: ${DICT_PATH}`);
    process.exit(1);
  }

  const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf8'));
  const dictKeys = Object.keys(dict);
  console.log(`[2/4] 한국어 사전 로드 완료: ${dictKeys.length}개 번역 키`);

  const files = fs.readdirSync(aside.assetsDir).filter(f => f.endsWith('.js'));
  const backupDir = path.join(aside.versionDir, 'AsideAgentManager', 'assets.bak');

  if (!fs.existsSync(backupDir)) {
    console.log(`[3/4] 원본 백업 디렉터리 생성 중: ${backupDir}`);
    fs.mkdirSync(backupDir, { recursive: true });
    for (const f of files) {
      fs.copyFileSync(path.join(aside.assetsDir, f), path.join(backupDir, f));
    }
    console.log(`      -> ${files.length}개 원본 파일 백업 완료.`);
  } else {
    console.log(`[3/4] 기존 원본 백업 확인됨: ${backupDir}`);
  }

  console.log('[4/4] WebUI 번들 파일 한글화 패치 진행 중...');
  let modifiedFiles = 0;
  let totalReplacements = 0;

  for (const f of files) {
    const filePath = path.join(aside.assetsDir, f);
    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes('title') && !content.includes('description') &&
        !content.includes('placeholder') && !content.includes('children') &&
        !content.includes('label')) {
      continue;
    }

    const original = content;
    let fileReplacements = 0;

    for (const [eng, kor] of Object.entries(dict)) {
      const patterns = [
        [`title:"${eng}"`, `title:"${kor}"`],
        [`description:"${eng}"`, `description:"${kor}"`],
        [`placeholder:"${eng}"`, `placeholder:"${kor}"`],
        [`label:"${eng}"`, `label:"${kor}"`],
        [`children:"${eng}"`, `children:"${kor}"`],
        [`"aria-label":"${eng}"`, `"aria-label":"${kor}"`]
      ];

      for (const [target, repl] of patterns) {
        if (content.includes(target)) {
          const count = content.split(target).length - 1;
          content = content.replaceAll(target, repl);
          fileReplacements += count;
        }
      }

      if (eng.length >= 16 && !eng.includes('"') && !eng.includes('\\')) {
        const target = `"${eng}"`;
        const repl = `"${kor}"`;
        if (content.includes(target)) {
          const count = content.split(target).length - 1;
          content = content.replaceAll(target, repl);
          fileReplacements += count;
        }
      }
    }

    for (const [sTarget, sRepl] of Object.entries(SEGMENTS_MAP)) {
      if (content.includes(sTarget)) {
        content = content.replaceAll(sTarget, sRepl);
        fileReplacements++;
      }
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedFiles++;
      totalReplacements += fileReplacements;
    }
  }

  console.log(`      -> 총 ${modifiedFiles}개 파일 수정 (${totalReplacements}개 번역 문구 적용 완료)`);

  clearCaches();

  console.log('\n[완료] Aside AI 브라우저 한글화 패치가 성공적으로 적용되었습니다!');
  console.log('브라우저를 다시 실행하시면 한글 UI로 시작됩니다.');
}

function restoreOriginal() {
  console.log('============================================================');
  console.log('  Aside AI 브라우저 원본 복원 (Restore Original English)');
  console.log('============================================================');

  const aside = findLatestAsideVersion();
  if (!aside || !aside.assetsDir) {
    console.error(`[오류] Aside 디렉터리를 찾을 수 없습니다: ${APP_DIR}`);
    process.exit(1);
  }

  const backupDir = path.join(aside.versionDir, 'AsideAgentManager', 'assets.bak');
  if (!fs.existsSync(backupDir)) {
    console.log('[안내] 원본 백업 폴더(assets.bak)가 존재하지 않습니다.');
    return;
  }

  killAsideProcesses();

  const backupFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('.js'));
  for (const f of backupFiles) {
    fs.copyFileSync(path.join(backupDir, f), path.join(aside.assetsDir, f));
  }

  clearCaches();
  console.log(`\n[복원 완료] ${backupFiles.length}개 파일을 원본(영문) 상태로 복원했습니다.`);
}

function showStatus() {
  console.log('============================================================');
  console.log('  Aside AI 브라우저 한글화 상태 (Status)');
  console.log('============================================================');

  const aside = findLatestAsideVersion();
  if (!aside) {
    console.log('  - Aside 설치 여부: 미설치 또는 경로 없음');
    return;
  }

  console.log(`  - Aside 설치 버전 : v${aside.version}`);
  console.log(`  - Assets 경로     : ${aside.assetsDir || '없음'}`);

  const backupDir = path.join(aside.versionDir, 'AsideAgentManager', 'assets.bak');
  console.log(`  - 원본 백업 존재  : ${fs.existsSync(backupDir) ? '있음 (assets.bak)' : '없음'}`);

  if (fs.existsSync(DICT_PATH)) {
    const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf8'));
    console.log(`  - 등록된 번역 수  : ${Object.keys(dict).length}개 항목`);
  }
}

const action = process.argv[2] || 'apply';

switch (action) {
  case 'apply':
    applyPatch().catch(e => {
      console.error('[패치 오류]', e.message);
      process.exit(1);
    });
    break;
  case 'restore':
    restoreOriginal();
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log(`알 수 없는 명령: ${action} (사용 가능한 명령: apply, restore, status)`);
    process.exit(1);
}
