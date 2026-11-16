(() => {
"use strict";
const file=document.getElementById("file"),video=document.getElementById("source"),canvas=document.getElementById("preview"),ctx=canvas.getContext("2d"),status=document.getElementById("status"),output=document.getElementById("output"),play=document.getElementById("play"),exportButton=document.getElementById("export");
const keys=["x","y","w","h"],controls=Object.fromEntries(keys.map(k=>[k,document.getElementById(k)]));
let sourceURL=null,downloadURL=null,animation=0,recorder=null,stream=null,audioContext=null,audioDestination=null,audioSource=null,busy=false;
const off=document.createElement("canvas"),offctx=off.getContext("2d");
function msg(t){status.textContent=t;}
function clearOutput(){if(downloadURL){URL.revokeObjectURL(downloadURL);downloadURL=null;}output.hidden=true;output.replaceChildren();}
function values(){const v=Object.fromEntries(keys.map(k=>[k,Number(controls[k].value)]));v.w=Math.min(v.w,100-v.x);v.h=Math.min(v.h,100-v.y);return v;}
function draw(){
 if(!video.videoWidth||!ctx)return;
 const vw=canvas.width,vh=canvas.height;
 ctx.clearRect(0,0,vw,vh);ctx.drawImage(video,0,0,vw,vh);
 const v=values(),x=Math.round(v.x*vw/100),y=Math.round(v.y*vh/100),w=Math.max(1,Math.round(v.w*vw/100)),h=Math.max(1,Math.round(v.h*vh/100));
 if(document.getElementById("mode").value==="cover"){ctx.fillStyle="#071827";ctx.fillRect(x,y,w,h);}
 else if(offctx){off.width=w;off.height=h;offctx.filter="blur(16px)";offctx.drawImage(canvas,x,y,w,h,0,0,w,h);offctx.filter="none";ctx.drawImage(off,x,y,w,h);}
 if(!busy){ctx.save();ctx.strokeStyle="#00ddf5";ctx.lineWidth=Math.max(2,Math.round(vw/350));ctx.setLineDash([9,5]);ctx.strokeRect(x,y,w,h);ctx.restore();}
}
function tick(){draw();if(!video.paused&&!video.ended)animation=requestAnimationFrame(tick);}
function cancel(){cancelAnimationFrame(animation);if(!video.paused)video.pause();}
for(const k of keys)controls[k].addEventListener("input",()=>{document.getElementById(k+"-out").textContent=controls[k].value+"%";if(video.paused)draw();});
document.getElementById("mode").addEventListener("change",()=>{if(video.paused)draw();});
file.addEventListener("change",()=>{
 if(busy){msg("Export is in progress.");return;}
 cancel();clearOutput();play.disabled=true;exportButton.disabled=true;
 if(sourceURL){URL.revokeObjectURL(sourceURL);sourceURL=null;}
 const f=file.files?.[0];
 if(!f){msg("Choose a local video file.");return;}
 if(!f.type.startsWith("video/")||f.size>200*1024*1024){msg("Choose a supported video file under 200 MB.");return;}
 sourceURL=URL.createObjectURL(f);video.src=sourceURL;video.load();msg("Loading local video…");
});
video.addEventListener("loadedmetadata",()=>{
 if(!Number.isFinite(video.duration)||video.duration<=0){msg("This video does not provide a usable duration.");return;}
 if(video.duration>180){msg("This browser editor supports videos of up to 3 minutes.");return;}
 canvas.width=video.videoWidth;canvas.height=video.videoHeight;
 if(canvas.width*canvas.height>9000000){const scale=Math.sqrt(9000000/(canvas.width*canvas.height));canvas.width=Math.floor(canvas.width*scale);canvas.height=Math.floor(canvas.height*scale);}
 play.disabled=false;exportButton.disabled=!(typeof canvas.captureStream==="function"&&typeof MediaRecorder!=="undefined"&&!!ctx);
 msg("Loaded "+video.videoWidth+" × "+video.videoHeight+" · "+video.duration.toFixed(1)+" seconds. Adjust the region and preview.");draw();
});
video.addEventListener("seeked",()=>{if(video.paused)draw();});
video.addEventListener("error",()=>msg("Cannot decode this video in your browser. Try another video format."));
play.addEventListener("click",async()=>{if(busy)return;if(!video.paused){cancel();return;}try{await video.play();tick();}catch(e){msg("Preview playback failed: "+e.message);}});
function recorderType(){return ["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/mp4","video/webm"].find(s=>MediaRecorder.isTypeSupported(s))||"";}
exportButton.addEventListener("click",async()=>{
 if(busy)return;
 if(!file.files?.[0]){msg("Choose a video first.");return;}
 if(!canvas.captureStream||!window.MediaRecorder||!ctx){msg("Video export is not supported in this browser. Try desktop Chrome or Edge.");return;}
 const mime=recorderType();if(!mime){msg("This browser has no compatible video recorder format.");return;}
 busy=true;play.disabled=true;exportButton.disabled=true;cancel();clearOutput();
 const originalW=video.videoWidth,originalH=video.videoHeight,max=document.getElementById("quality").value;
 const limit=max==="source"?originalW:Math.min(originalW,Number(max)),scale=Math.min(1,limit/originalW);
 canvas.width=Math.max(2,Math.round(originalW*scale/2)*2);canvas.height=Math.max(2,Math.round(originalH*scale/2)*2);
 if(canvas.width*canvas.height>9000000){const s=Math.sqrt(9000000/(canvas.width*canvas.height));canvas.width=Math.max(2,Math.floor(canvas.width*s/2)*2);canvas.height=Math.max(2,Math.floor(canvas.height*s/2)*2);}
 let chunks=[],failed=false;
 try{
  video.pause();video.currentTime=0;
  if(video.readyState<2)await new Promise((resolve,reject)=>{const done=()=>{video.removeEventListener("loadeddata",done);video.removeEventListener("error",fail);resolve();},fail=()=>{video.removeEventListener("loadeddata",done);video.removeEventListener("error",fail);reject(Error("Video could not load."));};video.addEventListener("loadeddata",done,{once:true});video.addEventListener("error",fail,{once:true});});
  if(video.seeking)await new Promise(resolve=>video.addEventListener("seeked",resolve,{once:true}));
  draw();stream=canvas.captureStream(30);
  let audioNote="Video-only export";
  try{
   const AC=window.AudioContext||window.webkitAudioContext;
   if(AC){audioContext=audioContext||new AC();audioSource=audioSource||audioContext.createMediaElementSource(video);audioDestination=audioContext.createMediaStreamDestination();audioSource.connect(audioDestination);await audioContext.resume();audioDestination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));audioNote="Audio capture enabled when present";}
  }catch(e){audioNote="Audio unavailable in this browser";}
  recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond: Math.round(Math.min(12000000,Math.max(2500000,canvas.width*canvas.height*4)))});
  const finished=new Promise((resolve,reject)=>{
   recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
   recorder.onerror=e=>{failed=true;reject(Error("The browser video recorder failed."));};
   recorder.onstop=()=>resolve();
  });
  recorder.start(500);msg("Exporting in real time at "+canvas.width+" × "+canvas.height+". "+audioNote+". Keep this tab open.");
  const stop=()=>{if(recorder?.state==="recording")recorder.stop();};
  const ended=new Promise(resolve=>video.addEventListener("ended",resolve,{once:true}));
  await video.play();tick();
  await ended;draw();stop();await finished;
  if(!failed){const blob=new Blob(chunks,{type:recorder.mimeType||mime});if(!blob.size)throw Error("Recording was empty.");downloadURL=URL.createObjectURL(blob);const a=document.createElement("a");a.href=downloadURL;a.download="outshark-edited."+(blob.type.includes("mp4")?"mp4":"webm");a.textContent="Download edited video";a.className="primary-button";output.replaceChildren(a);output.hidden=false;msg("Export ready · "+(blob.size/1024/1024).toFixed(2)+" MB. Check the downloaded video and audio before using.");}
 }catch(e){msg("Export failed: "+e.message+". Try a shorter video or another browser.");if(recorder?.state==="recording")recorder.stop();}
 finally{cancel();stream?.getTracks().forEach(t=>t.stop());stream=null;busy=false;recorder=null;play.disabled=false;exportButton.disabled=false;}
});
window.addEventListener("pagehide",()=>{cancel();stream?.getTracks().forEach(t=>t.stop());if(sourceURL)URL.revokeObjectURL(sourceURL);if(downloadURL)URL.revokeObjectURL(downloadURL);audioContext?.close();});
document.getElementById("year").textContent=new Date().getFullYear();
})();