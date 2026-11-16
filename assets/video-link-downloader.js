(() => {
"use strict";
const input=document.getElementById("url"),status=document.getElementById("status"),details=document.getElementById("details"),button=document.getElementById("check"),cancel=document.getElementById("cancel");
const widget=document.getElementById("progress-widget"),bar=document.getElementById("download-progress"),percent=document.getElementById("download-percent"),bytes=document.getElementById("progress-bytes");
const socialHosts=[["youtube.com","YouTube"],["youtu.be","YouTube"],["instagram.com","Instagram"],["facebook.com","Facebook"],["fb.watch","Facebook"],["tiktok.com","TikTok"]];
const allowedExt=/\.(mp4|webm|mov|m4v|ogv|ogg)$/i, maxBytes=200*1024*1024;
let controller=null,objectURL=null;
function domainIs(host,domain){return host===domain||host.endsWith("."+domain);}
function link(href,label){const a=document.createElement("a");a.href=href;a.textContent=label;a.rel="noopener noreferrer";a.target="_blank";return a;}
function message(t){const p=document.createElement("p");p.textContent=t;details.append(p);}
function clearURL(){if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}}
function reset(){details.replaceChildren();details.hidden=false;status.textContent="";widget.hidden=true;bar.removeAttribute("value");percent.textContent="";bytes.textContent="";clearURL();}
function progress(loaded,total){widget.hidden=false;if(total>0){bar.value=Math.min(100,Math.floor(loaded/total*100));percent.textContent=bar.value+"%";bytes.textContent=(loaded/1048576).toFixed(1)+" / "+(total/1048576).toFixed(1)+" MB";}else{bar.removeAttribute("value");percent.textContent="Size unknown";bytes.textContent=(loaded/1048576).toFixed(1)+" MB received";}}
async function saveDirect(u){
 button.disabled=true;cancel.disabled=false;controller=new AbortController();status.textContent="Connecting to source…";progress(0,0);
 const timer=setTimeout(()=>controller?.abort("timeout"),60000);let reader=null;
 try{
  const response=await fetch(u.href,{mode:"cors",redirect:"follow",signal:controller.signal});
  if(!response.ok)throw Error("The source returned HTTP "+response.status+".");
  const type=(response.headers.get("content-type")||"").toLowerCase();
  const final=new URL(response.url||u.href);
  if(!type.startsWith("video/")&&!allowedExt.test(final.pathname))throw Error("Source did not return a recognized video.");
  const total=Number(response.headers.get("content-length")||0);if(total>maxBytes)throw Error("Video exceeds the 200 MB limit.");
  if(!response.body?.getReader)throw Error("This browser cannot stream the download. Use the source site's download option.");
  reader=response.body.getReader();let received=0,chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;received+=value.byteLength;if(received>maxBytes)throw Error("File exceeds the 200 MB limit.");chunks.push(value);progress(received,total);}
  if(!received)throw Error("Source returned an empty file.");
  const blob=new Blob(chunks,{type:type.startsWith("video/")?type:"application/octet-stream"});
  objectURL=URL.createObjectURL(blob);
  const raw=final.pathname.split("/").pop()||"outshark-video.mp4";let name;
  try{name=decodeURIComponent(raw).replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,90);}catch{name="outshark-video.mp4";}
  const a=document.createElement("a");a.href=objectURL;a.download=name||"outshark-video.mp4";a.className="primary-button";a.textContent="Save "+a.download;details.append(a);
  progress(received,received);status.textContent="100% — download prepared. Source quality preserved; no upscaling or re-encoding.";
 }catch(e){if(e.name==="AbortError"||controller?.signal.aborted){status.textContent="Download canceled or timed out.";}else status.textContent="Direct download unavailable: "+e.message;widget.hidden=true;}
 finally{clearTimeout(timer);try{await reader?.cancel();}catch{}controller=null;button.disabled=false;cancel.disabled=true;}
}
cancel.addEventListener("click",()=>controller?.abort());
button.addEventListener("click",async()=>{
 if(controller)return;reset();let u;
 try{u=new URL(input.value.trim());if(!["http:","https:"].includes(u.protocol)||!u.hostname||u.username||u.password)throw Error();}catch{status.textContent="Enter a complete HTTP or HTTPS URL without credentials.";details.hidden=true;return;}
 const social=socialHosts.find(([host])=>domainIs(u.hostname.toLowerCase(),host));
 if(social){status.textContent=social[1]+" page link detected.";message("This is a social-platform page, not a direct video file. No video quality or file progress can be detected without an authorized download URL.");
 details.append(social[1]==="YouTube"?link("https://studio.youtube.com/","Download your own uploads in YouTube Studio"):link(u.href,"Open post for available official download options"));return;}
 if(!allowedExt.test(u.pathname)){status.textContent="This appears to be a webpage, not a direct video file.";message("Choose a permitted direct video file URL to download.");details.append(link(u.href,"Open the original page"));return;}
 message("Direct video detected. Downloading only where source permissions allow it.");details.append(link(u.href,"Open original video"));
 await saveDirect(u);
});
window.addEventListener("pagehide",()=>{controller?.abort();clearURL();});
document.getElementById("year").textContent=String(new Date().getFullYear());
})();