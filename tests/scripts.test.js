'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const shell = process.env.PATCHER_TEST_POWERSHELL || (spawnSync('pwsh', ['-v']).status === 0 ? 'pwsh' : 'powershell');
const quote = s => "'" + s.replaceAll("'", "''") + "'";
function run(args) { return spawnSync(shell, ['-NoProfile', ...args], {encoding:'utf8'}); }
function workspace() { return fs.mkdtempSync(path.join(os.tmpdir(), 'aside-script-test-')); }
function fixture(dir, code) {
 fs.mkdirSync(path.join(dir,'src'),{recursive:true}); fs.mkdirSync(path.join(dir,'locales'),{recursive:true});
 fs.writeFileSync(path.join(dir,'src','patcher.js'), 'process.exit(' + code + ');');
 fs.writeFileSync(path.join(dir,'locales','ko-KR.json'), '{"Settings":"설정"}');
 fs.copyFileSync(path.join(root,'patch.ps1'),path.join(dir,'patch.ps1'));
}
test('PowerShell scripts parse and contain no security changes, automatic termination or destructive cleanup',()=>{
 for(const file of ['patch.ps1','install.ps1']) {
  const src=fs.readFileSync(path.join(root,file),'utf8');
  assert.doesNotMatch(src,/icacls|ExecutionPolicy|Stop-Process|taskkill|Remove-Item|Verb\s+RunAs/i);
  const result=run(['-Command', '$t=$null;$e=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('+quote(path.join(root,file))+',[ref]$t,[ref]$e);if($e.Count){$e;exit 1}']);
  assert.equal(result.status,0,result.stdout+result.stderr);
 }
});
test('launcher returns status success and forwards patch failure',()=>{
 const dir=workspace(); fixture(dir,0);
 assert.equal(run(['-File',path.join(dir,'patch.ps1'),'-Action','status']).status,0);
 fs.writeFileSync(path.join(dir,'src','patcher.js'),'process.exit(7);');
 const result=run(['-File',path.join(dir,'patch.ps1'),'-Action','apply']);
 assert.equal(result.status,7,result.stdout+result.stderr);
 assert.doesNotMatch(result.stdout,/Complete/);
});
for(const code of [0,7]) test('installer preserves previous data and propagates application exit '+code,()=>{
 const dir=workspace(),pkg=path.join(dir,'aside-ko-patcher-main'),dest=path.join(dir,'installed'),zip=path.join(dir,'package.zip');
 fixture(pkg,code);fs.mkdirSync(dest);fs.writeFileSync(path.join(dest,'sentinel.txt'),'keep me');
 let result=run(['-Command','$ProgressPreference="SilentlyContinue"; Compress-Archive -LiteralPath '+quote(pkg)+' -DestinationPath '+quote(zip)]);
 assert.equal(result.status,0,result.stdout+result.stderr);
 result=run(['-File',path.join(root,'install.ps1'),'-InstallDir',dest,'-PackageArchive',zip]);
 assert.equal(result.status,code,result.stdout+result.stderr);
 const backups=fs.readdirSync(dir).filter(f=>f.startsWith('installed.backup-'));
 assert.equal(backups.length,1);
 assert.equal(fs.readFileSync(path.join(dir,backups[0],'sentinel.txt'),'utf8'),'keep me');
 assert.ok(fs.existsSync(path.join(dest,'src','patcher.js')));
 if(code) assert.doesNotMatch(result.stdout,/\[Complete\]/);
 else assert.match(result.stdout,/\[Complete\]/);
});
test('invalid package fails before existing installation is moved',()=>{
 const dir=workspace(),pkg=path.join(dir,'aside-ko-patcher-main'),dest=path.join(dir,'installed'),zip=path.join(dir,'package.zip');
 fs.mkdirSync(pkg);fs.writeFileSync(path.join(pkg,'wrong.txt'),'invalid');
 fs.mkdirSync(dest);fs.writeFileSync(path.join(dest,'sentinel.txt'),'keep me');
 assert.equal(run(['-Command','$ProgressPreference="SilentlyContinue"; Compress-Archive -LiteralPath '+quote(pkg)+' -DestinationPath '+quote(zip)]).status,0);
 const result=run(['-File',path.join(root,'install.ps1'),'-InstallDir',dest,'-PackageArchive',zip]);
 assert.equal(result.status,1,result.stdout+result.stderr);
 assert.equal(fs.readFileSync(path.join(dest,'sentinel.txt'),'utf8'),'keep me');
 assert.equal(fs.readdirSync(dir).filter(f=>f.startsWith('installed.backup-')).length,0);
});
