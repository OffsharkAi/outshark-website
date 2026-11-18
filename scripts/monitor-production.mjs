// Outshark production HTTP smoke tests. No API probes or automatic restarts.
import fs from 'node:fs';
const origin = 'https://www.outshark.in';
const pages = ['/', '/tools/image-compressor.html', '/tools/image-resizer.html', '/tools/image-converter.html', '/tools/image-cropper.html', '/tools/word-counter.html', '/tools/case-converter.html', '/tools/base64-encoder.html', '/tools/json-formatter.html', '/tools/video-link-downloader.html', '/tools/video-watermark-editor.html', '/tools/media-link-checker.html', '/tools/password-generator.html', '/tools/unit-converter.html', '/tools/percentage-calculator.html'];
const failures=[];
for(const p of pages){
  let last='unreachable';
  for(let attempt=1;attempt<=2;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetch(origin+p,{signal:controller.signal,redirect:'follow',headers:{'User-Agent':'Outshark-Uptime-Check/1.1'}});
      const body=await response.text();
      if(!response.ok) throw Error('HTTP '+response.status);
      if(new URL(response.url).hostname!=='www.outshark.in')throw Error('unexpected redirect to '+response.url);
      if(!/<title>[^<]+<\/title>/i.test(body) || !/<h1[ >]/i.test(body))throw Error('missing expected HTML structure');
      last='OK';break;
    } catch(e) {last=String(e?.message||e);} finally {clearTimeout(timer);}
  }
  console.log(last==='OK'?'PASS':'FAIL',p,last);
  if(last!=='OK')failures.push(p+': '+last);
}
if(process.env.GITHUB_STEP_SUMMARY){
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### Outshark public website HTTP checks\n'+(failures.length?'**FAIL** '+failures.length+' of '+pages.length+' pages\n':'**PASS** '+pages.length+' of '+pages.length+' pages\n')+'\nNote: HTTP checks do not verify interactive browser features, Oracle backend or ReClip downloads.\n');
}
if(failures.length){console.error('FAILED:',failures.join('; '));process.exitCode=1;}
