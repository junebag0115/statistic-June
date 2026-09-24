'use strict';
const CACHE='statistic-june-v9659-1';
const SHELL=['./','index.html','style.css','app.js','index.js','index.audio.worklet.js','manifest.webmanifest','icon-192.png','icon-512.png','data-map.json'];
const base=new URL('./',self.location.href);
const url=p=>new URL(p,base).href;
let manifestPromise;
async function cache(){return caches.open(CACHE);}
async function manifest(){if(!manifestPromise)manifestPromise=(async()=>{const c=await cache();const r=await c.match(url('data-map.json'));return (r||await fetch(url('data-map.json'))).json()})();return manifestPromise;}
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await cache();for(const p of SHELL){const r=await fetch(url(p),{cache:'reload'});if(!r.ok)throw Error('Shell download failed');await c.put(url(p),r);}await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function complete(){const c=await cache();if(!await c.match(url('__ready__')))return false;const m=await manifest();for(const f of Object.values(m))for(const p of f.parts)if(!await c.match(url(p.path)))return false;return true;}
let preparing=null;
async function prepare(port){const c=await cache(),m=await manifest(),parts=Object.values(m).flatMap(x=>x.parts),total=parts.reduce((a,p)=>a+p.size,0);let done=0;
for(const p of parts){if(!await c.match(url(p.path))){const r=await fetch(url(p.path),{cache:'no-store'});if(!r.ok)throw Error('다운로드 실패: '+r.status);const bytes=await r.arrayBuffer();if(bytes.byteLength!==p.size)throw Error('파일 크기가 일치하지 않습니다. 다시 준비해 주세요.');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==p.sha256)throw Error('파일 검증 실패. 다시 준비해 주세요.');await c.put(url(p.path),new Response(bytes));}done+=p.size;port.postMessage({kind:'progress',done,total});}
await c.put(url('__ready__'),new Response(CACHE));port.postMessage({kind:'ready'});}
self.addEventListener('message',event=>{const port=event.ports[0];if(!port)return;event.waitUntil((async()=>{try{if(event.data.type==='STATUS')port.postMessage({kind:'status',ready:await complete()});else if(event.data.type==='PREPARE'){if(preparing){port.postMessage({kind:'error',message:'다른 화면에서 준비 중입니다. 완료 후 새로 열어 주세요.'});return;}preparing=prepare(port);try{await preparing;}finally{preparing=null;}}}catch(e){port.postMessage({kind:'error',message:e.message||String(e)});}})());});
async function serveVirtual(file){const c=await cache();let index=0;const stream=new ReadableStream({async pull(controller){try{if(index>=file.parts.length){controller.close();return;}const p=file.parts[index++],r=await c.match(url(p.path));if(!r)throw Error('Offline data missing');controller.enqueue(new Uint8Array(await r.arrayBuffer()));}catch(e){controller.error(e);}}});return new Response(stream,{headers:{'Content-Type':file.type,'Content-Length':String(file.size),'Cache-Control':'no-store'}});}
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(u.origin!==base.origin||event.request.method!=='GET'||!u.pathname.startsWith(base.pathname))return;event.respondWith((async()=>{const key=u.pathname.slice(base.pathname.length),m=await manifest();if(m[key])return serveVirtual(m[key]);const c=await cache();const hit=await c.match(event.request,{ignoreSearch:true});if(hit)return hit;if(event.request.mode==='navigate')return await c.match(url('index.html'));return fetch(event.request);})());});
