const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const root=path.resolve(process.argv[2]),m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 const out=path.join(root,'contact-sheets');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1760,height:2300}});
 const items=m.cases.filter(c=>c.png),thumbs=[];
 try{
  for(const [i,c] of items.entries()){
   const url='data:image/png;base64,'+fs.readFileSync(path.join(root,c.png)).toString('base64');
   const thumb=await page.evaluate(async url=>{
    const img=new Image();img.src=url;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=210;canvas.height=235;
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,210,235);
    const s=Math.min(210/img.width,235/img.height);ctx.drawImage(img,(210-img.width*s)/2,0,img.width*s,img.height*s);
    return canvas.toDataURL('image/jpeg',.8);
   },url);
   thumbs.push({id:c.id,thumb,number:i+1});
  }
  const escape=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const html=cards=>'<meta charset="utf-8"><style>body{font:10px system-ui;background:#eee;margin:8px}.grid{display:grid;grid-template-columns:repeat(8,210px);gap:7px}.card{background:white;height:277px;overflow:hidden}img{display:block;width:210px;height:235px}a{color:#173761;text-decoration:none}.name{padding:3px;overflow-wrap:anywhere}</style><div class="grid">'+cards.map(c=>'<a class="card" href="../index.html?case='+encodeURIComponent(c.id)+'"><img src="'+c.thumb+'"><div class="name">'+c.number+' — '+escape(c.id)+'</div></a>').join('')+'</div>';
  const sheets=[];
  for(let i=0;i<thumbs.length;i+=64){
   const name='sheet-'+String(i/64+1).padStart(2,'0'),content=html(thumbs.slice(i,i+64));
   fs.writeFileSync(path.join(out,name+'.html'),content);await page.setContent(content);
   await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
   sheets.push({name,first:i+1,last:Math.min(i+64,thumbs.length)});
  }
  fs.writeFileSync(path.join(out,'index.html'),'<h1>Corpus overview</h1>'+sheets.map(s=>'<p><a href="'+s.name+'.html">'+s.name+' — cases '+s.first+'–'+s.last+'</a></p>').join(''));
  fs.writeFileSync(path.join(out,'index.json'),JSON.stringify({sheets,cases:thumbs.map(({id,number})=>({id,number}))},null,2));
  console.log(JSON.stringify({scenes:thumbs.length,sheets:sheets.length}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
