const pp = require('puppeteer-core');
const PROJ='demo-sman-rebuild', FS='http://127.0.0.1:8181', AU='http://127.0.0.1:9199', H='http://127.0.0.1:5050';
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); let pass=0,fail=0; const ok=(n,c)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n)};
const conv=v=>typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:typeof v==='object'?{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,conv(x)]))}}:{integerValue:String(v)};
const put=async(p,f)=>{const r=await fetch(`${FS}/v1/projects/${PROJ}/databases/(default)/documents/${p}`,{method:'PATCH',headers:{'content-type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({fields:Object.fromEntries(Object.entries(f).map(([k,v])=>[k,conv(v)]))})});if(!r.ok)throw new Error(await r.text())};
const raw=async p=>(await (await fetch(`${FS}/v1/projects/${PROJ}/databases/(default)/documents/${p}`,{headers:{Authorization:'Bearer owner'}})).json());
const list=async p=>((await raw(p)).documents||[]);
const num=f=>+f.integerValue;
(async()=>{
 const uid=(await (await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=x`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'admin@t.local',password:'adminpass1',returnSecureToken:true})})).json()).localId;
 await put(`staff/${uid}`,{role:'admin',active:true});
 await put('catalog/prices',{super:110,special:130,superspecial:140,eggs:50,jumbo:120,zones:{'ههيا':15,'الزقازيق':25}});
 await put('catalog/stock',{super:10,special:10,superspecial:10,eggs:2,jumbo:10,lastOrderId:'seed'});
 const b=await pp.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1']});
 const ext=[]; const mk=async(w,h)=>{const ctx=await b.createBrowserContext();const p=await ctx.newPage();await p.setViewport({width:w,height:h});
  p.on('request',r=>{const u=r.url();if(!/^(data|blob|about):/.test(u)&&new URL(u).hostname!=='127.0.0.1')ext.push(u)});
  p.on('console',m=>{if(/act failed|update failed/.test(m.text()))console.log('CONS',m.text())});p.on('pageerror',e=>console.log('PAGEERR',e.message.slice(0,150)));p.on('dialog',async d=>{if(d.type()==='prompt'){await d.accept('العميل لا يرد على التليفون');return;}console.log('DIALOG',d.message());await d.accept()});return p};
 // 1. store
 const s=await mk(390,800); await s.goto(H+'/store/index.html',{waitUntil:'networkidle2'}); await sleep(1500);
 await s.click('[data-add=super]'); await s.click('[data-inc=super]'); await s.click('[data-add=eggs]'); await s.evaluate(()=>document.getElementById('cart-open').click()); await sleep(400); await s.type('#name','عميل تجريبي'); await s.type('#phone','01011112222'); await s.type('#address','شارع تجريبي'); await sleep(300);
 ok('store computes total 2x110+50+15=285', (await s.$eval('#tot',e=>e.textContent))==='285');
 await s.screenshot({path:'/downloads/rebuild-store.png'});
 await s.screenshot({path:'/downloads/rebuild-store-cart.png'}); await s.evaluate(()=>window.scrollTo(0,0)); await s.screenshot({path:'/downloads/rebuild-store-top.png'}); await s.evaluate(()=>document.getElementById('order').click()); await sleep(3000);
 ok('store redirects to tracking page', s.url().includes('/store/track.html?t='));
 const trackUrl=s.url(); await sleep(500);
 ok('tracking shows received', (await s.$eval('#st',e=>e.textContent)).includes('تم استلام'));
 const ords=await list('orders'); ok('order stored with server-validated total 285', ords.length===1 && num(ords[0].fields.total)===285);
 const st=(await raw('catalog/stock')).fields; ok('stock decremented (super 8, eggs 1)', num(st.super)===8&&num(st.eggs)===1);
 // out of stock
 const s2=await mk(390,800); await s2.goto(H+'/store/index.html',{waitUntil:'networkidle2'}); await sleep(1200);
 await s2.click('[data-add=eggs]'); await s2.click('[data-inc=eggs]'); await s2.click('[data-inc=eggs]'); await sleep(300);
 ok('UI caps quantity at remaining stock (1 egg left)', (await s2.evaluate(()=>cart.eggs))===1);
 // 2. CRM: login, create courier, dispatch
 const c=await mk(900,900); await c.goto(H+'/crm/index.html',{waitUntil:'networkidle2'});
 await c.type('#email','admin@t.local'); await c.type('#pass','adminpass1'); await c.click('#go'); await sleep(2500);
 await c.evaluate(()=>document.querySelector('[data-t=couriers]').click());
 await c.type('#cname','أحمد المندوب'); await c.type('#cphone','01077778888'); await c.type('#cpass','courier99'); await c.click('#cadd'); await sleep(2500);
 ok('admin created courier staff profile', (await list('staff')).some(d=>d.fields.role.stringValue==='courier'));
 await c.evaluate(()=>document.querySelector('[data-t=orders]').click()); await sleep(800);
 ok('CRM shows the store order', (await c.$eval('#orders',e=>e.innerText)).includes('عميل تجريبي'));
 await c.evaluate(()=>{[...document.querySelectorAll('#orders button')].find(b=>b.textContent==='تسليم لمندوب').click()}); await sleep(2500);
 ok('order dispatched to courier', (await list('orders'))[0].fields.status.stringValue==='dispatched');
 ok('tracking shows dispatched', await s.evaluate(()=>1)&&(await (async()=>{const t=trackUrl.split('t=')[1];return (await raw('tracking/'+t)).fields.status.stringValue})())==='dispatched');
 await c.screenshot({path:'/downloads/rebuild-crm.png'});
 // 3. courier
 const d=await mk(390,800); await d.goto(H+'/courier/index.html',{waitUntil:'networkidle2'});
 await d.type('#phone','01077778888'); await d.type('#pass','courier99'); await d.click('#go'); await sleep(3000);
 ok('courier sees the dispatched order', (await d.$eval('#list',e=>e.innerText)).includes('عميل تجريبي'));
 await d.evaluate(()=>{[...document.querySelectorAll('#list button')].find(b=>b.textContent==='تم التسليم').click()}); await sleep(3000);

 ok('delivered: order completed', (await list('orders'))[0].fields.status.stringValue==='completed');
 await s.reload({waitUntil:'networkidle2'}); await sleep(1500); ok('customer tracking page shows delivered', (await s.$eval('#st',e=>e.textContent)).includes('تم التسليم'));
 await d.click('#remitBtn'); await sleep(2500);
 let o=(await list('orders'))[0].fields; ok('courier reported handoff, not confirmed', o.handoffReported?.booleanValue===true && !o.isSupplied);
 // 4. admin confirms cash
 await c.evaluate(()=>document.querySelector('[data-t=cash]').click()); await sleep(800);
 await c.evaluate(()=>{[...document.querySelectorAll('#cash button')].find(b=>b.textContent.includes('تأكيد')).click()}); await sleep(2500);
 o=(await list('orders'))[0].fields; ok('admin confirmed cash received (isSupplied + isReconciled)', o.isSupplied?.booleanValue===true&&o.isReconciled?.booleanValue===true);
 // 5. second order: courier problem report, admin cancel restores stock, customer history
 await put('catalog/stock',{super:8,special:10,superspecial:10,eggs:5,jumbo:10,lastOrderId:'seed2'});
 const s3=await mk(390,800); await s3.goto(H+'/store/index.html',{waitUntil:'networkidle2'}); await sleep(1200);
 await s3.evaluate(()=>{document.querySelector('[data-add=super]').click()}); await sleep(300); await s3.evaluate(()=>{document.querySelector('[data-inc=super]').click()}); await sleep(300);
 await s3.evaluate(()=>document.getElementById('cart-open').click()); await sleep(300);
 await s3.type('#name','عميل تجريبي'); await s3.type('#phone','01011112222'); await s3.type('#address','عنوان آخر'); await s3.evaluate(()=>document.getElementById('order').click()); await sleep(3000);
 const tok2=s3.url().split('t=')[1]; ok('second order placed', (await list('orders')).length===2);
 let st2=(await raw('catalog/stock')).fields; ok('stock after 2nd order: super 6', num(st2.super)===6);
 await c.evaluate(()=>document.querySelector('[data-t=orders]').click()); await sleep(1000);
 await c.evaluate(()=>{[...document.querySelectorAll('#orders button')].find(b=>b.textContent==='تسليم لمندوب').click()}); await sleep(2500);
 await d.reload({waitUntil:'networkidle2'}); await sleep(2500);
 await d.evaluate(()=>{[...document.querySelectorAll('#list button')].find(b=>b.textContent==='الإبلاغ عن مشكلة').click()}); await sleep(2500);
 ok('courier problem report stored', (await list('orders')).some(o=>o.fields.problemNote&&o.fields.problemNote.stringValue.includes('لا يرد')));
 await sleep(500); ok('admin sees the courier problem', (await c.$eval('#orders',e=>e.innerText)).includes('لا يرد'));
 await c.screenshot({path:'/downloads/rebuild-crm-problem.png'});
 await c.evaluate(()=>{[...document.querySelectorAll('#orders button')].find(b=>b.textContent.includes('إلغاء الطلب')).click()}); await sleep(3000);
 st2=(await raw('catalog/stock')).fields; ok('cancel restores stock (super back to 8)', num(st2.super)===8);
 ok('canceled order status + tracking', (await list('orders')).some(o=>o.fields.status.stringValue==='canceled') && (await raw('tracking/'+tok2)).fields.status.stringValue==='canceled');
 await c.evaluate(()=>document.querySelector('[data-t=customers]').click()); await sleep(800);
 const ct=await c.$eval('#cuslist',e=>e.innerText); ok('customer history groups both orders by phone', ct.includes('الطلبات: 2'));
 await c.screenshot({path:'/downloads/rebuild-crm-customers.png'});
 ok('zero external requests across store, CRM, courier', ext.length===0||(console.log(ext),false));
 await b.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
