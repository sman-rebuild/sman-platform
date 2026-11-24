const pp=require('puppeteer-core');const FS='http://127.0.0.1:8181',PROJ='demo-sman-rebuild',H='http://127.0.0.1:5050';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const conv=v=>typeof v==='string'?{stringValue:v}:typeof v==='object'?{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,conv(x)]))}}:{integerValue:String(v)};
const put=async(p,f)=>{await fetch(`${FS}/v1/projects/${PROJ}/databases/(default)/documents/${p}`,{method:'PATCH',headers:{'content-type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({fields:Object.fromEntries(Object.entries(f).map(([k,v])=>[k,conv(v)]))})})};
(async()=>{
await put('catalog/prices',{super:110,special:130,superspecial:140,eggs:50,jumbo:120,zones:{'ههيا':15,'الزقازيق':25}});
await put('catalog/stock',{super:50,special:50,superspecial:3,eggs:50,jumbo:50,lastOrderId:'seed'});
const b=await pp.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:430,height:900,deviceScaleFactor:1});
await p.goto(H+'/store/index.html',{waitUntil:'networkidle2'});await sleep(1500);
await p.addStyleTag({content:'.firebase-emulator-warning{display:none!important}'});
await p.screenshot({path:'/downloads/rebuild-store-top.png'});
await p.evaluate(()=>document.getElementById('products').scrollIntoView());await sleep(400);await p.screenshot({path:'/downloads/rebuild-store-products.png'});
await p.evaluate(()=>{document.querySelector('[data-add=jumbo]').click();document.querySelector('[data-add=eggs]').click();});await sleep(500);
await p.screenshot({path:'/downloads/rebuild-store-bar.png'});
await p.evaluate(()=>document.getElementById('cart-open').click());await sleep(500);await p.screenshot({path:'/downloads/rebuild-store-cart.png'});
await b.close();})();
