#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const DICT_PATH = path.join(__dirname, '..', 'locales', 'ko-KR.json');
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


function compareVersions(a,b) {
 const x=a.split('.').map(Number), y=b.split('.').map(Number);
 for(let i=0;i<Math.max(x.length,y.length);i++) if((x[i]||0)!==(y[i]||0)) return (y[i]||0)-(x[i]||0);
 return 0;
}
function discover(env=process.env) {
 const user=env.ASIDE_USER_DATA_DIR || (env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA,'Aside','User Data') : null);
 const roots=[{root:user && path.join(user,'AsideAgentManager'),suffix:['assets'],source:'per-user component'},
 {root:env.ASIDE_APP_DIR || 'C:\\Program Files\\Aside\\Application',suffix:['AsideAgentManager','assets'],source:'Program Files fallback'}];
 for(const candidate of roots) {
  if(!candidate.root || !fs.existsSync(candidate.root)) continue;
  const versions=fs.readdirSync(candidate.root,{withFileTypes:true}).filter(d=>d.isDirectory() && /^\d+(\.\d+)+$/.test(d.name)).map(d=>d.name).sort(compareVersions);
  for(const version of versions) {
   const assetsDir=path.join(candidate.root,version,...candidate.suffix);
   if(fs.existsSync(assetsDir) && fs.statSync(assetsDir).isDirectory() && jsFiles(assetsDir).length) return {version,source:candidate.source,assetsDir,backupDir:path.join(path.dirname(assetsDir),'assets.bak'),userDataDir:user};
  }
 }
 throw Error('No usable Aside UI assets found. Check LOCALAPPDATA / ASIDE_USER_DATA_DIR / ASIDE_APP_DIR.');
}
function jsFiles(dir) { return fs.readdirSync(dir,{withFileTypes:true}).filter(d=>d.isFile() && d.name.endsWith('.js')).map(d=>d.name).sort(); }
function hash(data) {return crypto.createHash('sha256').update(data).digest('hex');}
function snapshot(dir) { return Object.fromEntries(jsFiles(dir).map(f=>[f,hash(fs.readFileSync(path.join(dir,f)))])); }
function equal(a,b) {return JSON.stringify(a)===JSON.stringify(b);}
function translate(content,dict) {
 let fileReplacements=0;
    for (const [eng, kor] of Object.entries(dict)) {
      const patterns = [
        [`title:${JSON.stringify(eng)}`, `title:${JSON.stringify(kor)}`],
        [`description:${JSON.stringify(eng)}`, `description:${JSON.stringify(kor)}`],
        [`placeholder:${JSON.stringify(eng)}`, `placeholder:${JSON.stringify(kor)}`],
        [`label:${JSON.stringify(eng)}`, `label:${JSON.stringify(kor)}`],
        [`children:${JSON.stringify(eng)}`, `children:${JSON.stringify(kor)}`],
        [`"aria-label":${JSON.stringify(eng)}`, `"aria-label":${JSON.stringify(kor)}`]
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
        const repl = JSON.stringify(kor);
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


 return {content,count:fileReplacements};
}
function ensureClosed() {
 if(process.platform!=='win32') return;
 const output=execFileSync('tasklist.exe',['/FI','IMAGENAME eq Aside.exe','/FO','CSV','/NH'],{encoding:'utf8',windowsHide:true});
 if(/"Aside\.exe"/i.test(output)) throw Error('Close Aside completely (including background processes), then run again. No processes were stopped.');
}
function validateBackup(aside,files) {
 const manifestFile=path.join(aside.backupDir,'manifest.json');
 if(!fs.existsSync(manifestFile)) throw Error('Existing assets.bak has no verified manifest. Preserved unchanged; use its original patcher to restore or reinstall/update Aside first.');
 const m=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 if(m.version!==aside.version || m.assetsDir!==aside.assetsDir || !equal(Object.keys(m.files).sort(),files)) throw Error('Backup does not match this UI version/file list; nothing changed.');
 if(!equal(snapshot(aside.backupDir),m.files)) throw Error('Backup checksum mismatch; nothing changed.');
 return m;
}
function backup(aside,files) {
 if(fs.existsSync(aside.backupDir)) return validateBackup(aside,files);
 const stage=aside.backupDir+'.staging-'+crypto.randomUUID();
 fs.mkdirSync(stage);
 for(const f of files) fs.copyFileSync(path.join(aside.assetsDir,f),path.join(stage,f),fs.constants.COPYFILE_EXCL);
 const m={version:aside.version,assetsDir:aside.assetsDir,files:snapshot(stage)};
 if(!equal(m.files,snapshot(aside.assetsDir))) throw Error('Assets changed during backup. Close Aside and retry; staging backup preserved.');
 fs.writeFileSync(path.join(stage,'manifest.json'),JSON.stringify(m,null,2));
 fs.renameSync(stage,aside.backupDir);
 return m;
}
function preserveCaches(aside) {
 if(!aside.userDataDir) return;
 for(const parts of [['Default','Code Cache','js'],['Default','Service Worker','ScriptCache']]) {
  const dir=path.join(aside.userDataDir,...parts);
  if(fs.existsSync(dir)) {
   const saved=dir+'.aside-ko-backup-'+crypto.randomUUID();
   fs.renameSync(dir,saved);
   console.log('Cache preserved: '+saved);
  }
 }
}
function run(action='apply',env=process.env,checkClosed=ensureClosed) {
 if(!['apply','restore','status'].includes(action)) throw Error('Usage: patcher.js apply|restore|status');
 const aside=discover(env);
 console.log('UI source: '+aside.source+'\nUI version: '+aside.version+'\nAssets: '+aside.assetsDir+'\nBackup: '+aside.backupDir);
 const files=jsFiles(aside.assetsDir);
 if(action==='status') {
  const statePath=path.join(path.dirname(aside.assetsDir),'aside-ko-state.json');
  let status='not verified';
  if(fs.existsSync(statePath)) {
   const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
   status=state.version===aside.version && equal(state.files,snapshot(aside.assetsDir)) ? state.action+' (checksums verified)' : 'changed since last operation';
  }
  console.log('JS files: '+files.length+'\nStatus: '+status+'\nBackup exists: '+fs.existsSync(aside.backupDir));
  return {aside,status};
 }
 checkClosed();
 let plan=[];
 if(action==='apply') {
  const dict=JSON.parse(fs.readFileSync(DICT_PATH,'utf8'));
  for(const f of files) {
   const original=fs.readFileSync(path.join(aside.assetsDir,f),'utf8');
   const result=translate(original,dict);
   if(result.content!==original) plan.push({f,original,...result});
  }
  if(!plan.length) {
   const statePath=path.join(path.dirname(aside.assetsDir),'aside-ko-state.json');
   if(fs.existsSync(statePath)) {const state=JSON.parse(fs.readFileSync(statePath,'utf8')); if(state.action==='apply' && state.version===aside.version && equal(state.files,snapshot(aside.assetsDir))) {console.log('Already patched; checksums verified.');return {modified:0};}}
   throw Error('No matching translations found; patch success cannot be verified.');
  }
  for(const p of plan) execFileSync(process.execPath,['--input-type=module','--check'],{input:p.content,encoding:'utf8',windowsHide:true});
  backup(aside,files);
 } else {
  validateBackup(aside,files);
  plan=files.map(f=>({f,original:fs.readFileSync(path.join(aside.assetsDir,f),'utf8'),content:fs.readFileSync(path.join(aside.backupDir,f),'utf8'),count:0}));
 }
 // Preserve rollback copies in memory, and never replace the verified original backup.
 const written=[];
 try {
  for(const p of plan) {
   const file=path.join(aside.assetsDir,p.f);
   written.push(p);
   fs.writeFileSync(file,p.content,'utf8');
   if(fs.readFileSync(file,'utf8')!==p.content) throw Error('Write verification failed: '+p.f);
  }
  preserveCaches(aside);
  const state={version:aside.version,action,files:snapshot(aside.assetsDir)};
  fs.writeFileSync(path.join(path.dirname(aside.assetsDir),'aside-ko-state.json'),JSON.stringify(state,null,2));
 } catch(e) {
  let rollbackFailed=false;
  for(const p of written) {try{fs.writeFileSync(path.join(aside.assetsDir,p.f),p.original,'utf8');}catch(_){rollbackFailed=true;}}
  throw Error(e.message+(rollbackFailed?' Rollback incomplete; restore from verified assets.bak.':' Original pre-operation files restored.'));
 }
 console.log(action+': '+plan.length+' files, '+plan.reduce((n,p)=>n+p.count,0)+' replacements. Verified. Restart Aside manually.');
 return {modified:plan.length};
}
module.exports={discover,translate,run,compareVersions};
if(require.main===module) {
 try {if(Number(process.versions.node.split('.')[0])<18) throw Error('Node.js 18+ required.');run(process.argv[2]||'apply');}
 catch(e) {console.error('[Error] '+e.message);process.exitCode=1;}
}
