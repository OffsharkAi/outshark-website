// Public website check only. ReClip API deliberately remains blocked.
import process from 'node:process';
const url = 'https://www.outshark.in/';
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 12000);
const started = Date.now();
try {
  const res = await fetch(url, { signal: controller.signal, redirect: 'follow', headers: { 'User-Agent': 'Outshark-Uptime-Check/1.0' } });
  const body = await res.text();
  if (!res.ok) throw new Error('HTTP '+res.status);
  if (!body.toLowerCase().includes('<html')) throw new Error('Unexpected non-HTML response');
  if (new URL(res.url).hostname !== 'www.outshark.in') throw new Error('Redirected away from canonical hostname');
  const ms = Date.now()-started;
  console.log('OK',url,'HTTP',res.status,ms+'ms');
  if (process.env.GITHUB_STEP_SUMMARY) {
    const fs = await import('node:fs');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Outshark public uptime check\n- Website: OK ('+res.status+')\n- Response: '+ms+' ms\n- ReClip API: excluded (launch lock remains active)\n');
  }
} catch (e) {
  console.error('Website unhealthy:',String(e.message||e));
  process.exitCode=1;
} finally {clearTimeout(timer);}
