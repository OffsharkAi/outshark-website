import { chromium } from 'playwright';
const origin='https://www.outshark.in';
const routes=['/','/tools/image-compressor.html','/tools/image-resizer.html','/tools/image-converter.html','/tools/image-cropper.html','/tools/word-counter.html','/tools/case-converter.html','/tools/base64-encoder.html','/tools/json-formatter.html','/tools/video-link-downloader.html','/tools/video-watermark-editor.html','/tools/media-link-checker.html','/tools/password-generator.html','/tools/unit-converter.html','/tools/percentage-calculator.html'];
const browser=await chromium.launch({headless:true});
const errors=[];
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  for(const route of routes){
    const jsErrors=[];
    const onError=e=>jsErrors.push(String(e.message||e));
    page.on('pageerror',onError);
    try{
      const response=await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:20000});
      if(!response?.ok())throw Error('Page HTTP '+(response?.status()||'unknown'));
      await page.waitForTimeout(600);
      const headline=await page.locator('h1').first().textContent();
      if(!headline?.trim())throw Error('Missing visible heading');
      if(jsErrors.length)throw Error('JavaScript exception: '+jsErrors.join('; '));
      console.log('PASS',route,headline.trim().replace(/\\s+/g,' ').slice(0,90));
    }catch(e){const error=route+': '+String(e.message||e);console.error('FAIL',error);errors.push(error);}
    finally{page.off('pageerror',onError);}
  }
}finally{await browser.close();}
console.log('Browser smoke checks:',routes.length-errors.length,'passed,',errors.length,'failed');
if(errors.length)process.exitCode=1;
