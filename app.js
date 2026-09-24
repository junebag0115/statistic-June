'use strict';
const state=document.getElementById('state');
const detail=document.getElementById('detail');
const progress=document.getElementById('progress');
const prepare=document.getElementById('prepare');
const launch=document.getElementById('launch');
const panel=document.getElementById('panel');
const app=document.getElementById('app');
const canvas=document.getElementById('canvas');
let worker;
let engine;
let starting=false;
function fail(error){starting=false;state.textContent='연결을 확인해 주세요';detail.textContent=error.message||String(error);prepare.hidden=false;prepare.disabled=false;prepare.textContent='다시 시도';}
function message(type,handler){const channel=new MessageChannel();channel.port1.onmessage=event=>handler(event.data);worker.postMessage({type},[channel.port2]);}
async function launchGame(){if(starting)return;starting=true;prepare.hidden=true;launch.hidden=true;state.textContent='자료를 불러오는 중입니다';detail.textContent='잠시만 기다려 주세요.';try{const map=await(await fetch('data-map.json')).json();const missing=Engine.getMissingFeatures({threads:false});if(missing.length)throw Error('이 브라우저에서 필요한 기능을 지원하지 않습니다: '+missing.join(', '));engine=new Engine({canvas,executable:'index',canvasResizePolicy:0,focusCanvas:true,ensureCrossOriginIsolationHeaders:false,fileSizes:{'index.pck':map['index.pck'].size,'index.wasm':map['index.wasm'].size}});window.workspaceEngine=engine;await engine.startGame({onProgress:(loaded,total)=>{if(total>0){progress.value=loaded/total*100;detail.textContent=`자료를 불러오는 중 · ${Math.round(loaded/total*100)}%`;}}});panel.hidden=true;app.hidden=false;canvas.focus();window.workspaceStarted=true;}catch(error){app.hidden=true;panel.hidden=false;fail(error);}}
async function prepareOffline(){if(starting)return;starting=true;prepare.hidden=true;launch.hidden=true;state.textContent='첫 실행 자료를 준비하고 있습니다';detail.textContent='처음 한 번 약 230MB를 내려받습니다. 이 화면을 유지해 주세요.';try{if(navigator.storage?.persist)await navigator.storage.persist();message('PREPARE',data=>{if(data.kind==='progress'){progress.value=data.done/data.total*100;detail.textContent=`${(data.done/1048576).toFixed(0)} / ${(data.total/1048576).toFixed(0)} MB`;}else if(data.kind==='ready'){starting=false;launchGame();}else if(data.kind==='error'){fail(data.message);}});}catch(error){fail(error);}}
prepare.onclick=prepareOffline;launch.onclick=launchGame;document.getElementById('close').onclick=()=>location.reload();canvas.addEventListener('pointerdown',()=>canvas.focus());window.addEventListener('keydown',event=>{if(!app.hidden&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(event.code)&&!event.metaKey&&!event.ctrlKey)event.preventDefault();},{capture:true});
(async()=>{try{if(location.protocol==='file:')throw Error('웹 주소로 접속해 주세요.');if(!isSecureContext||!('serviceWorker' in navigator))throw Error('Safari 또는 Chrome의 HTTPS 주소에서 열어 주세요.');await navigator.serviceWorker.register('sw.js',{scope:'./'});await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));worker=navigator.serviceWorker.controller;message('STATUS',data=>{if(data.kind==='status'&&data.ready)launchGame();else if(data.kind==='error')fail(data.message);else prepareOffline();});}catch(error){fail(error);}})();
