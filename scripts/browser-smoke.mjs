import { chromium, firefox, webkit } from 'playwright';
const origin='https://www.outshark.in';
const paths=[
  '/','/tools/image-compressor.html','/tools/image-resizer.html',
  '/tools/image-converter.html','/tools/image-cropper.html',
  '/tools/word-counter.html','/tools/case-converter.html',
  '/tools/base64-encoder.html','/tools/json-formatter.html',
  '/tools/video-link-downloader.html','/tools/video-watermark-editor.html',
  '/tools/media-link-checker.html','/tools/password-generator.html',
  '/tools/unit-converter.html','/tools/percentage-calculator.html'
];
const fail=[];
function assert(ok,msg){if(!ok)throw Error(msg);}
async function image(page){
  const b64=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=20;c.height=16;
    c.getContext('2d').fillRect(0,0,20,16);
    return c.toDataURL('image/png').split(',')[1];
  });
  const buffer=Buffer.from(b64,'base64');
  await page.locator('#image-file, #file').first().setInputFiles({name:'outshark-test.png',mimeType:'image/png',buffer});
}
async function testTool(page,route){
  if(route==='/tools/image-compressor.html'){
    await image(page);
    await page.evaluate(()=>{
      const old=HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob=function(cb,type,q){
        return old.call(this,cb,type==='image/webp'?'image/png':type,q);
      };
    });
    await page.locator('#compress').click();
    await page.locator('#result a[download$=".png"]').waitFor({timeout:12000});
    assert((await page.locator('#result').innerText()).includes('WebP encoding is unavailable'),'WebP fallback missing');
    await page.locator('#output-format').selectOption('image/jpeg');
    await page.locator('#compress').click();
    await page.locator('#result a[download$=".jpg"]').waitFor({timeout:12000});
  }else if(route==='/tools/image-resizer.html'){
    await image(page);
    await page.locator('#width').fill('12');
    await page.locator('#action').click();
    await page.locator('#output a[download$=".png"]').waitFor({timeout:12000});
  }else if(route==='/tools/image-converter.html'){
    await image(page);
    await page.locator('#format').selectOption('image/webp');
    await page.evaluate(()=>{
      const old=HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob=function(cb,type,q){return old.call(this,cb,type==='image/webp'?'image/png':type,q);};
    });
    await page.locator('#action').click();
    await page.locator('#output a[download$=".png"]').waitFor({timeout:12000});
    assert((await page.locator('#feedback').innerText()).includes('WebP unavailable'),'Converter fallback missing');
  }else if(route==='/tools/image-cropper.html'){
    await image(page);
    await page.locator('#feedback').getByText('Image size:',{exact:false}).waitFor({timeout:10000});
    await page.locator('#width').fill('10');
    await page.locator('#height').fill('10');
    await page.locator('#action').click();
    await page.locator('#output a[download$=".png"]').waitFor({timeout:12000});
  }else if(route==='/tools/word-counter.html'){
    await page.locator('#text-input').fill('Hello Outshark world.');
    assert((await page.locator('#words').innerText())==='3','Word count incorrect');
    await page.locator('#clear').click();
    assert((await page.locator('#words').innerText())==='0','Clear failed');
  }else if(route==='/tools/case-converter.html'){
    await page.locator('#input').fill('hello world');
    await page.locator('#run').click();
    assert((await page.locator('#result').inputValue())==='HELLO WORLD','Case conversion incorrect');
  }else if(route==='/tools/base64-encoder.html'){
    await page.locator('#input').fill('नमस्ते');
    await page.locator('#encode').click();
    const b64=await page.locator('#result').inputValue();
    assert(b64.length>4,'Base64 encode failed');
    await page.locator('#input').fill(b64);
    await page.locator('#decode').click();
    assert((await page.locator('#result').inputValue())==='नमस्ते','Unicode Base64 roundtrip failed');
  }else if(route==='/tools/json-formatter.html'){
    await page.locator('#input').fill('{"a":1}');
    await page.locator('#format').click();
    assert((await page.locator('#result').inputValue()).includes('\n'),'Pretty print failed');
  }else if(route==='/tools/video-link-downloader.html'){
    await page.locator('#url').fill('https://www.youtube.com/watch?v=test');
    await page.locator('#check').click();
    assert((await page.locator('#status').innerText()).includes('page link detected'),'Social URL guidance failed');
  }else if(route==='/tools/video-watermark-editor.html'){
    assert(await page.locator('#file').count()===1,'Video picker absent');
    assert(await page.locator('#export').isDisabled(),'Export must be disabled without a file');
  }else if(route==='/tools/media-link-checker.html'){
    await page.locator('#media-url').fill('https://example.com/video.mp4');
    await page.locator('#check').click();
    assert((await page.locator('#output').innerText()).includes('example.com'),'URL check failed');
  }else if(route==='/tools/password-generator.html'){
    await page.locator('#generate').click();
    assert((await page.locator('#output').inputValue()).length===20,'Password generation incorrect');
  }else if(route==='/tools/unit-converter.html'){
    assert((await page.locator('#answer').innerText()).length>0,'Unit conversion blank');
    await page.locator('#category').selectOption('temperature');
    assert((await page.locator('#answer').innerText()).length>0,'Temperature conversion blank');
  }else if(route==='/tools/percentage-calculator.html'){
    assert((await page.locator('#answer').innerText())==='10','Percentage result incorrect');
  }else if(route==='/'){
    assert(await page.locator('.tool-card').count()===14,'Tool catalogue does not contain 14 tools');
  }
}
for(const [name,engine] of Object.entries({chromium,firefox,webkit})){
  let browser;
  try{
    browser=await engine.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:name!=='firefox',hasTouch:name!=='firefox'});
    const page=await context.newPage();
    for(const route of paths){
      const errors=[];
      const onError=e=>errors.push(e.message);
      page.on('pageerror',onError);
      try{
        const response=await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:25000});
        assert(response?.ok(),'Page HTTP '+response?.status());
        await page.locator('h1').first().waitFor({timeout:10000});
        await testTool(page,route);
        assert(errors.length===0,'JavaScript exception: '+errors.join('; '));
        console.log('PASS',name,route);
      }catch(e){
        const msg=name+' '+route+': '+String(e?.message||e);
        console.error('FAIL',msg);fail.push(msg);
      }finally{page.off('pageerror',onError);}
    }
    await context.close();
  }catch(e){const msg=name+' engine: '+String(e?.message||e);console.error('FAIL',msg);fail.push(msg);}
  finally{await browser?.close();}
}
console.log('Cross-browser tool checks:',paths.length*3-fail.length,'passed,',fail.length,'failed');
if(fail.length)process.exitCode=1;
