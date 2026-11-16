(() => {
"use strict";
const input=document.getElementById("url"),status=document.getElementById("status"),details=document.getElementById("details"),button=document.getElementById("check");
const socialHosts=[["youtube.com","YouTube"],["youtu.be","YouTube"],["instagram.com","Instagram"],["facebook.com","Facebook"],["fb.watch","Facebook"],["tiktok.com","TikTok"]];
const allowedExt=/\.(mp4|webm|mov|m4v|ogv|ogg)(?:$|[?#])/i;
function domainIs(host,domain){return host===domain||host.endsWith("."+domain);}
function link(href,label){const a=document.createElement("a");a.href=href;a.textContent=label;a.rel="noopener noreferrer";a.target="_blank";return a;}
function message(text){const p=document.createElement("p");p.textContent=text;details.append(p);}
function reset(){details.replaceChildren();details.hidden=false;status.textContent="";}
async function saveDirect(url){
 button.disabled=true;status.textContent="Checking if this host allows direct browser download…";
 let objectURL=null;
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  let response;
  try{response=await fetch(url,{mode:"cors",redirect:"follow",signal:controller.signal});}finally{clearTimeout(timeout);}
  if(!response.ok)throw Error("The server returned HTTP "+response.status+".");
  const type=(response.headers.get("content-type")||"").toLowerCase();
  const finalURL=response.url||url;
  if(!type.startsWith("video/")&&!allowedExt.test(new URL(finalURL).pathname))throw Error("The link did not return a recognized video file.");
  const declared=Number(response.headers.get("content-length")||0);
  if(declared>200*1024*1024)throw Error("File exceeds the 200 MB browser download limit.");
  const blob=await response.blob();
  if(blob.size>200*1024*1024)throw Error("File exceeds the 200 MB browser download limit.");
  if(!blob.size)throw Error("The video file is empty.");
  objectURL=URL.createObjectURL(blob);
  const raw=new URL(finalURL).pathname.split("/").pop()||"video.mp4";
  const name=decodeURIComponent(raw).replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,90)||"video.mp4";
  const a=document.createElement("a");a.href=objectURL;a.download=name;a.textContent="Download "+name;a.className="primary-button";
  details.append(a);status.textContent="Video ready · "+(blob.size/1024/1024).toFixed(2)+" MB. Available resolution is whatever the original file contains.";
  const assigned=objectURL;setTimeout(()=>URL.revokeObjectURL(assigned),120000);
 }catch(err){if(objectURL)URL.revokeObjectURL(objectURL);status.textContent="Direct download unavailable: "+err.message+" Use the host's official download option instead.";}
 finally{button.disabled=false;}
}
button.addEventListener("click",async()=>{
 reset();const raw=input.value.trim();let u;
 try{u=new URL(raw);if(!["http:","https:"].includes(u.protocol)||!u.hostname)throw Error();if(u.username||u.password)throw Error();}
 catch{status.textContent="Enter a complete http:// or https:// URL without embedded credentials.";details.hidden=true;return;}
 const social=socialHosts.find(([host])=>domainIs(u.hostname.toLowerCase(),host));
 if(social){status.textContent=social[1]+" page link detected.";
 message(social[1]+" links are not direct media files. Outshark cannot fetch or guarantee full-HD downloads from this service.");
 if(social[1]==="YouTube"){details.append(link("https://studio.youtube.com/","Open YouTube Studio to download your uploads"));}
 else details.append(link(u.href,"Open the original post for the platform's available download options"));
 return;}
 if(!allowedExt.test(u.pathname)){status.textContent="This appears to be a web page, not a direct video file.";message("You can open the original page and use its permitted download or export feature.");details.append(link(u.href,"Open original page"));return;}
 message("Checking a direct video file URL. The source must allow cross-origin downloads.");
 details.append(link(u.href,"Open video in original host"));
 await saveDirect(u.href);
});
document.getElementById("year").textContent=new Date().getFullYear();
})();