#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {chromium}=require('playwright');
const {ConverterService}=require('../dist');
async function main(){
 const out=path.resolve(process.argv[2]||'tmp/support_distributed_plans/browser-check');
 fs.mkdirSync(out,{recursive:true});
 const input=fs.readFileSync('tests/distributed/gather_four_tasks.sql','utf8');
 const cli=cp.spawnSync(process.execPath,['dist/cli.js','--all-workers'],{input,encoding:'utf8'});
 assert.equal(cli.status,0,cli.stderr);
 assert.equal(JSON.parse(cli.stdout).elements.filter(e=>e.customData?.role==='worker').length,5);
 const bad=cp.spawnSync(process.execPath,['dist/cli.js','--section','0'],{input,encoding:'utf8'});
 assert.equal(bad.status,1);assert.equal(bad.stdout,'');
 const scene=new ConverterService().convert(input);
 const entry='import React from "react";import {createRoot} from "react-dom/client";import {Excalidraw} from "@excalidraw/excalidraw";createRoot(document.getElementById("root")).render(React.createElement(Excalidraw,{initialData:window.scene,excalidrawAPI:api=>window.api=api}));';
 const built=await require('esbuild').build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,format:'iife',
  define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
 const css=fs.readFileSync('node_modules/@excalidraw/excalidraw/dist/prod/index.css','utf8');
 const server=http.createServer((req,res)=>{
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(built.outputFiles[0].text);}
  else if(req.url==='/app.css'){res.setHeader('Content-Type','text/css');res.end(css);}
  else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><link rel="stylesheet" href="/app.css"><style>html,body,#root{margin:0;width:100%;height:100%}</style><div id="root"></div><script>window.scene='+JSON.stringify(scene).replace(/</g,'\\u003c')+'</script><script src="/app.js"></script>');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>window.api?.getSceneElements().length>0);
  const panel=scene.elements.find(e=>e.customData?.role==='worker'&&e.customData.stage==='1');
  await page.evaluate(id=>{
   const es=window.api.getSceneElements(),p=es.find(e=>e.id===id),group=p.groupIds[0];
   window.api.scrollToContent([p],{fitToViewport:true,viewportZoomFactor:0.65});
   window.api.updateScene({appState:{selectedElementIds:Object.fromEntries(es.filter(e=>e.groupIds.includes(group)).map(e=>[e.id,true])),selectedGroupIds:{[group]:true}}});
  },panel.id);
  await page.waitForTimeout(300);
  async function drag(id){
   const before=await page.evaluate(()=>window.api.getSceneElements());
   const point=await page.evaluate(id=>{
    const e=window.api.getSceneElements().find(e=>e.id===id),s=window.api.getAppState();
    return {x:(e.x+2+s.scrollX)*s.zoom.value+s.offsetLeft,y:(e.y+e.height/2+s.scrollY)*s.zoom.value+s.offsetTop};
   },id);
   await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+45,point.y+25,{steps:12});await page.mouse.up();
   const after=await page.evaluate(()=>window.api.getSceneElements());
   const a=after.find(e=>e.id===id),b=before.find(e=>e.id===id);
   assert(Math.abs(a.x-b.x)>1,'drag did not move '+id);
   return {before,after,dx:a.x-b.x,dy:a.y-b.y};
  }
  const moved=await drag(panel.id);
  for(const original of scene.elements.filter(e=>e.groupIds.includes(panel.groupIds[0])&&e.type!=='arrow')){
   const a=moved.after.find(e=>e.id===original.id),b=moved.before.find(e=>e.id===original.id);
   assert(Math.abs((a.x-b.x)-moved.dx)<0.1,'worker member did not move');
  }
  const bound=moved.after.filter(e=>e.type==='arrow'&&e.startBinding?.elementId===panel.id);
  assert(bound.length>0);
  for(const e of bound)assert(e.endBinding&&moved.after.some(x=>x.id===e.endBinding.elementId));
  await page.screenshot({path:path.join(out,'worker-drag.png')});
  const operator=scene.elements.find(e=>e.type==='text'&&e.text==='MeadowScanExec');
  const opId=operator.containerId;
  await page.evaluate(({id,group})=>{
   const op=window.api.getSceneElements().find(e=>e.id===id);
   window.api.updateScene({appState:{editingGroupId:group,selectedElementIds:{[id]:true},selectedGroupIds:{}}});
   window.api.scrollToContent([op],{fitToViewport:true,viewportZoomFactor:0.5});
  },{id:opId,group:panel.groupIds[0]});
  await page.waitForTimeout(200);
  const opMoved=await drag(opId);
  const panelBefore=opMoved.before.find(e=>e.id===panel.id),panelAfter=opMoved.after.find(e=>e.id===panel.id);
  assert.equal(panelAfter.x,panelBefore.x,'operator drag moved entire worker');
  assert.equal(panelAfter.y,panelBefore.y,'operator drag moved entire worker');
  for(const arrow of moved.after.filter(e=>e.type==='arrow'&&e.startBinding?.elementId===panel.id)){
   const p=moved.after.find(e=>e.id===panel.id),point=arrow.points[0];
   const x=arrow.x+point[0],y=arrow.y+point[1];
   const distance=Math.hypot(Math.max(p.x-x,0,x-p.x-p.width),Math.max(p.y-y,0,y-p.y-p.height));
   assert(distance<=5,'network arrow detached from worker outline');
  }
  await page.screenshot({path:path.join(out,'operator-drag.png')});
  const receiver=scene.elements.find(e=>e.customData?.role==='network-input'&&e.customData.stage==='head');
  const receiverPanel=scene.elements.find(e=>e.customData?.role==='worker'&&e.customData.stage==='head');
  await page.evaluate(({id,group})=>{
   const op=window.api.getSceneElements().find(e=>e.id===id);
   window.api.updateScene({appState:{editingGroupId:group,selectedElementIds:{[id]:true},selectedGroupIds:{}}});
   window.api.scrollToContent([op],{fitToViewport:true,viewportZoomFactor:0.5});
  },{id:receiver.id,group:receiverPanel.groupIds[0]});
  await page.waitForTimeout(200);
  const receiverMoved=await drag(receiver.id);
  const receiverAfter=receiverMoved.after.find(e=>e.id===receiver.id);
  const incoming=receiverMoved.after.filter(e=>e.customData?.role==='network-bundle'&&e.endBinding?.elementId===receiver.id);
  assert.equal(incoming.length,2,'network bundles did not bind to the receiver');
  for(const arrow of incoming){
   const point=arrow.points[arrow.points.length-1],x=arrow.x+point[0],y=arrow.y+point[1];
   const distance=Math.hypot(Math.max(receiverAfter.x-x,0,x-receiverAfter.x-receiverAfter.width),Math.max(receiverAfter.y-y,0,y-receiverAfter.y-receiverAfter.height));
   assert(distance<=5,'network arrow detached from receiving operator');
   const before=receiverMoved.before.find(e=>e.id===arrow.id),end=before.points[before.points.length-1];
   assert(Math.hypot(x-before.x-end[0],y-before.y-end[1])>1,'network arrow did not follow receiving operator');
  }
  const receiverPanelBefore=receiverMoved.before.find(e=>e.id===receiverPanel.id),receiverPanelAfter=receiverMoved.after.find(e=>e.id===receiverPanel.id);
  assert.equal(receiverPanelAfter.x,receiverPanelBefore.x,'receiver drag moved worker panel');
  assert.equal(receiverPanelAfter.y,receiverPanelBefore.y,'receiver drag moved worker panel');
  await page.screenshot({path:path.join(out,'network-input-drag.png')});
  assert.deepEqual(errors, [], 'Excalidraw browser errors');
  const report={cli:true,invalidSection:true,workerDrag:true,operatorDrag:true,networkInputDrag:true,workerDelta:[moved.dx,moved.dy],operatorDelta:[opMoved.dx,opMoved.dy],pageErrors:errors};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
