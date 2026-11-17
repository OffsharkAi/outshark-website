(() => {
"use strict";
const base=String(window.OUTSHARK_RECLIP_API_BASE||"").replace(/\/$/,"");
const setup=document.getElementById("setup"),link=document.getElementById("link"),fetchButton=document.getElementById("fetch-info"),downloadButton=document.getElementById("download"),select=document.getElementById("quality"),format=document.getElementById("format"),status=document.getElementById("status"),result=document.getElementById("result");
const progressWidget=document.getElementById("progress-widget"),progressLabel=document.getElementById("processing-label");
function progress(state){progressWidget.hidden=!state;if(state)progressLabel.textContent=state;}
const year=document.getElementById("year");year.textContent=new Date().getFullYear();
let title="",jobId="",busy=false;
function info(t){status.textContent=t;}
function showResult(){result.hidden=false;result.replaceChildren();}
// Require an explicit production feature flag. A DNS record or HTTPS endpoint alone
// must never make the downloader publicly usable.
const configured=(()=>{
 if(window.OUTSHARK_RECLIP_ENABLED!==true)return false;
 try {
  const url=new URL(base);
  // Only the explicitly authorized API hostname is allowed for cross-origin requests.
  return url.protocol==="https:"&&url.username===""&&url.password===""&&
    url.hostname==="api.outshark.in"&&url.port===""&&url.pathname===""&&
    url.search===""&&url.hash===""&&location.protocol==="https:"&&
    location.hostname==="www.outshark.in";
 }catch{return false;}
})();
if(!configured){setup.textContent="ReClip backend is not configured. This preview cannot download videos until a secured same-origin HTTPS backend is deployed.";return;}
setup.textContent="Backend configured. Only request content you are authorized to download.";
fetchButton.disabled=false;
async function requestJSON(endpoint,payload){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),65000);
 try{
  const res=await fetch(base+endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),credentials:"omit",signal:controller.signal});
  const data=await res.json().catch(()=>({error:"Invalid response from video service."}));
  if(!res.ok||data.error)throw Error(String(data.error||"Backend returned HTTP "+res.status).slice(0,300));
  return data;
 }finally{clearTimeout(timer);}
}
function validURL(value){try{const u=new URL(value);return ["http:","https:"].includes(u.protocol)&&!!u.hostname&&!u.username&&!u.password;}catch{return false;}}
async function poll(id){
 for(let attempt=0;attempt<180;attempt++){
  await new Promise(r=>setTimeout(r,1500));
  const res=await fetch(base+"/api/status/"+encodeURIComponent(id),{credentials:"omit",cache:"no-store"});
  const data=await res.json().catch(()=>({error:"Invalid status response"}));
  if(!res.ok||data.error)throw Error(String(data.error||"Unable to check download status").slice(0,250));
  if(data.status==="done"){
   showResult();progress("Complete");const a=document.createElement("a");a.href=base+"/api/file/"+encodeURIComponent(id);a.className="primary-button";a.textContent="Download "+String(data.filename||"file");a.rel="noopener";result.append(a);info("Download ready. Select the link to save the file.");return;
  }
  if(data.status==="error")throw Error(String(data.error||"Download failed").slice(0,250));
  progress("Processing");info("Processing video on server… status: "+String(data.status||"pending")+". The backend does not report a reliable percentage.");
 }
 throw Error("Download still running or taking too long. Check server logs.");
}
fetchButton.addEventListener("click",async()=>{
 if(busy)return;
 if(!validURL(link.value.trim())){info("Enter a valid HTTP or HTTPS video link.");return;}
 busy=true;fetchButton.disabled=true;downloadButton.disabled=true;progress("Fetching formats");select.replaceChildren(new Option("Best available",""));result.hidden=true;info("Fetching supported video formats…");
 try{
  const data=await requestJSON("/api/info",{url:link.value.trim()});title=String(data.title||"");
  for(const f of Array.isArray(data.formats)?data.formats:[]){if(!f.id||!Number.isFinite(Number(f.height)))continue;select.add(new Option(String(f.label||f.height+"p"),String(f.id)));}
  select.disabled=false;downloadButton.disabled=false;info("Formats loaded for "+(title||"selected video")+".");
 }catch(e){info("Unable to load video details: "+e.message);}
 finally{progress(null);busy=false;fetchButton.disabled=false;}
});
downloadButton.addEventListener("click",async()=>{
 if(busy||downloadButton.disabled)return;
 busy=true;downloadButton.disabled=true;fetchButton.disabled=true;result.hidden=true;progress("Starting download");info("Starting download job…");
 try{
  const data=await requestJSON("/api/download",{url:link.value.trim(),format:format.value,format_id:select.value||null,title});
  if(!data.job_id)throw Error("Backend did not return a job ID.");
  jobId=String(data.job_id);await poll(jobId);
  }catch(e){progress(null);info("Download unsuccessful: "+e.message);}
 finally{busy=false;downloadButton.disabled=false;fetchButton.disabled=false;}
});
})();