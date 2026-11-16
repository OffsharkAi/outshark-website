(() => {
"use strict";
const panel=document.querySelector(".tool-panel");if(!panel||document.getElementById("progress-widget"))return;
const filename=location.pathname.split("/").pop();
const config={
"image-compressor.html":{triggers:["compress"],success:()=>!!document.querySelector("#result a[download]"),failure:()=>!!document.getElementById("result")&&!document.getElementById("result").hidden&&!document.querySelector("#result a[download]")&&!document.getElementById("compress")?.disabled&&/choose|failed|not support|size|decode|unavailable/i.test(document.getElementById("result").textContent)},
"image-resizer.html":{triggers:["action"],success:()=>!!document.querySelector("#output a[download]"),failure:()=>/choose|failed|too large|invalid|exceed/i.test(document.getElementById("feedback")?.textContent||"")},
"image-converter.html":{triggers:["action"],success:()=>!!document.querySelector("#output a[download]"),failure:()=>/choose|failed|too large|invalid|exceed|does not support/i.test(document.getElementById("feedback")?.textContent||"")},
"image-cropper.html":{triggers:["action"],success:()=>!!document.querySelector("#output a[download]"),failure:()=>/choose|failed|too large|invalid|exceed|must fit/i.test(document.getElementById("feedback")?.textContent||"")},
"word-counter.html":{triggers:["text-input","clear"],success:()=>true},
"case-converter.html":{triggers:["run"],success:()=>/^Converted /.test(document.getElementById("status")?.textContent||"")},
"json-formatter.html":{triggers:["format","minify"],success:()=>document.getElementById("status")?.textContent==="Valid JSON.",failure:()=>/^Invalid JSON/.test(document.getElementById("status")?.textContent||"")},
"base64-encoder.html":{triggers:["encode","decode"],success:()=>/^(Encoded|Decoded)\./.test(document.getElementById("status")?.textContent||""),failure:()=>/^Invalid/.test(document.getElementById("status")?.textContent||"")},
"password-generator.html":{triggers:["generate"],success:()=>/^Password generated/.test(document.getElementById("message")?.textContent||""),failure:()=>/Select at least|requires HTTPS/.test(document.getElementById("message")?.textContent||"")},
"unit-converter.html":{triggers:["amount","category","from","to","swap"],success:()=>!!document.getElementById("answer")?.textContent&&!document.getElementById("error")?.textContent},
"percentage-calculator.html":{triggers:["run","a","b","mode"],success:()=>document.getElementById("status")?.textContent==="Calculation complete."},
"media-link-checker.html":{triggers:["check"],success:()=>document.getElementById("output")?.textContent?.includes("Valid URL format"),failure:()=>!!document.getElementById("output")&&!document.getElementById("output").hidden&&!document.getElementById("output").textContent.includes("Valid URL format")}
}[filename];
if(!config)return;
const root=document.createElement("div");root.className="progress-widget";root.setAttribute("role","group");root.setAttribute("aria-label","Tool processing status");
const label=document.createElement("label");label.textContent="Processing status ";
const value=document.createElement("output");value.textContent="Ready";label.append(value);
const bar=document.createElement("progress");bar.max=100;bar.value=0;
const detail=document.createElement("p");detail.className="progress-details";detail.textContent="For quick browser tools, only completion can be measured accurately.";
root.append(label,bar,detail);panel.append(root);
let running=false;
function refresh(){
 if(!running)return;
 if(config.success()){bar.value=100;value.textContent="100%";detail.textContent="Completed.";running=false;}
 else if(config.failure?.()){bar.value=0;value.textContent="Not completed";detail.textContent="Check the error message above.";running=false;}
}
function begin(){bar.removeAttribute("value");value.textContent="Processing…";detail.textContent="Working locally in your browser.";running=true;queueMicrotask(refresh);setTimeout(refresh,0);}
for(const id of config.triggers){const el=document.getElementById(id);if(!el)continue;el.addEventListener(el.tagName==="BUTTON"?"click":"input",begin);}
const observer=new MutationObserver(refresh);observer.observe(panel,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
window.addEventListener("pagehide",()=>observer.disconnect(),{once:true});
})();