'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {discover,run,translate}=require('../src/patcher');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'aside-fixture-'));
 const env={ASIDE_USER_DATA_DIR:path.join(root,'user'),ASIDE_APP_DIR:path.join(root,'app')};
 const add=(version,user=true,text='const a={title:"Default search engine"};')=>{
 const dir=user?path.join(env.ASIDE_USER_DATA_DIR,'AsideAgentManager',version,'assets'):path.join(env.ASIDE_APP_DIR,version,'AsideAgentManager','assets');
 fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'main.js'),text);return dir;};
 return {env,add};
}
test('numeric newest user component preferred; incomplete newer skipped; fallback',()=>{
 const f=fixture();f.add('9.9',false);f.add('1.9');const latest=f.add('1.10');
 fs.mkdirSync(path.join(f.env.ASIDE_USER_DATA_DIR,'AsideAgentManager','2.0','assets'),{recursive:true});
 assert.equal(discover(f.env).assetsDir,latest);
 assert.equal(discover({...f.env,ASIDE_USER_DATA_DIR:'missing'}).source,'Program Files fallback');
});
test('apply, idempotence, read-only status, exact restore, immutable backup and cache preservation',()=>{
 const f=fixture(),dir=f.add('1.0'),file=path.join(dir,'main.js'),original=fs.readFileSync(file,'utf8');
 const cache=path.join(f.env.ASIDE_USER_DATA_DIR,'Default','Code Cache','js');fs.mkdirSync(cache,{recursive:true});fs.writeFileSync(path.join(cache,'cached'),'keep');
 assert.equal(run('apply',f.env,()=>{}).modified,1);
 const backup=path.join(path.dirname(dir),'assets.bak'),manifest=fs.readFileSync(path.join(backup,'manifest.json'),'utf8');
 assert.match(fs.readFileSync(file,'utf8'),/기본 검색 엔진/);
 assert.equal(run('apply',f.env,()=>{}).modified,0);
 const before=fs.statSync(file).mtimeMs;assert.match(run('status',f.env).status,/checksums verified/);assert.equal(fs.statSync(file).mtimeMs,before);
 run('restore',f.env,()=>{});assert.equal(fs.readFileSync(file,'utf8'),original);assert.equal(fs.readFileSync(path.join(backup,'manifest.json'),'utf8'),manifest);
 assert.ok(fs.readdirSync(path.dirname(cache)).some(n=>n.startsWith('js.aside-ko-backup-')));
});
test('unmatched content is failure without backup or asset mutation',()=>{
 const f=fixture(),dir=f.add('1.0',true,'const a=1;');
 assert.throws(()=>run('apply',f.env,()=>{}),/No matching/);
 assert.equal(fs.existsSync(path.join(path.dirname(dir),'assets.bak')),false);
});
test('corrupt backup refuses restore; legacy backups never overwritten',()=>{
 const f=fixture(),dir=f.add('1.0');run('apply',f.env,()=>{});
 fs.writeFileSync(path.join(path.dirname(dir),'assets.bak','main.js'),'corrupt');
 assert.throws(()=>run('restore',f.env,()=>{}),/checksum/);
 const g=fixture(),d=g.add('1.0');fs.mkdirSync(path.join(path.dirname(d),'assets.bak'));
 assert.throws(()=>run('apply',g.env,()=>{}),/no verified manifest/);
});
test('running app check stops writes; quoted translation remains valid JS',()=>{
 const f=fixture(),dir=f.add('1.0');assert.throws(()=>run('apply',f.env,()=>{throw Error('running');}),/running/);
 assert.equal(fs.existsSync(path.join(path.dirname(dir),'assets.bak')),false);
 const output=translate('const x={label:"Hello"};',{'Hello':'say "hi"'}).content;assert.doesNotThrow(()=>new Function(output));
});
test('unknown action and absent assets fail',()=>{assert.throws(()=>run('bad'),/Usage/);const f=fixture();assert.throws(()=>discover(f.env),/No usable/);});
