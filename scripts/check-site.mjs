import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const list = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
  const p=path.join(dir,ent.name);return ent.isDirectory()?list(p):[p];
});
const files=list(root).filter(p=>!p.includes('/.git/')&&!p.includes('/node_modules/'));
const html=files.filter(p=>p.endsWith('.html'));
let assertions=0;
const check=(condition,message)=>{assert.ok(condition,message);assertions++;};
for(const file of files.filter(p=>p.endsWith('.js')&&!p.endsWith('check-site.mjs'))){
  new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
  assertions++;
}
for(const file of html){
  const source=fs.readFileSync(file,'utf8');
  check(/<title>[^<]+<\/title>/i.test(source),'Missing title: '+file);
  check(/<h1[ >]/i.test(source),'Missing H1: '+file);
  const inline=[...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  for(const match of inline) if(!/type=["']application\/ld\+json["']/i.test(match[1])&&match[2].trim()){
    new vm.Script(match[2],{filename:file+' inline JS'});assertions++;
  }
  for(const [,attribute,href] of source.matchAll(/\b(href|src)=["']([^"']+)["']/gi)){
    if(!href||href.startsWith('#')||/^(https?:|mailto:|data:|tel:|javascript:)/i.test(href))continue;
    const target=href.split(/[?#]/)[0];
    if(!target)continue;
    const full=path.resolve(path.dirname(file),decodeURIComponent(target));
    check(full.startsWith(root+path.sep)&&fs.existsSync(full),'Broken local '+attribute+' '+href+' in '+file);
  }
}
const context={window:{}};vm.runInNewContext(fs.readFileSync('assets/tools.js','utf8'),context);
const tools=context.window.OUTSHARK_TOOLS;
check(Array.isArray(tools)&&tools.length===12,'Expected 12 tool entries');
check(tools.every(t=>t.status==="working"),"Unfinished tools must not be listed");
const names=new Set();
for(const tool of tools){
  check(!names.has(tool.id),'Duplicate tool id '+tool.id);names.add(tool.id);
  if(tool.status==='working')check(fs.existsSync(path.resolve(root,tool.href)),'Working tool missing '+tool.href);
}
const cname=fs.readFileSync('CNAME','utf8').trim();
check(cname==='www.outshark.in','CNAME does not match preferred domain');
const sitemap=fs.readFileSync('sitemap.xml','utf8');
check(!sitemap.includes('https://outshark.in/'),'Sitemap includes noncanonical apex URLs');
for(const tool of tools.filter(t=>t.status==='working'))check(sitemap.includes('https://www.outshark.in/'+tool.href),'Working tool absent from sitemap: '+tool.href);
console.log('Outshark checks passed: '+assertions+' assertions, '+html.length+' HTML pages, '+tools.filter(t=>t.status==='working').length+' listed working tools.');
