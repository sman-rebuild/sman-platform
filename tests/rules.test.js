const { initializeApp } = require('firebase/app');
const A = require('firebase/auth'), F = require('firebase/firestore');
const PROJ='demo-sman-rebuild', FS='http://127.0.0.1:8181', AU='http://127.0.0.1:9199';
let pass=0, fail=0;
const ok=(n,c)=>{ c?pass++:fail++; console.log((c?'PASS ':'FAIL ')+n); };
async function mkUser(email){ const r=await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=x`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:'secret123',returnSecureToken:true})}); return (await r.json()).localId; }
const conv=v=>typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:typeof v==='object'?{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,conv(x)]))}}:{integerValue:String(v)};
async function adminWrite(path,fields){ // owner bypass
  
  const body={fields:Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,conv(v)]))};
  const r=await fetch(`${FS}/v1/projects/${PROJ}/databases/(default)/documents/${path}`,{method:'PATCH',headers:{'content-type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); }
async function client(name,email){ const app=initializeApp({apiKey:'x',projectId:PROJ},name); const db=F.getFirestore(app); F.connectFirestoreEmulator(db,'127.0.0.1',8181);
  if(email){ const au=A.getAuth(app); A.connectAuthEmulator(au,AU,{disableWarnings:true}); await A.signInWithEmailAndPassword(au,email,'secret123'); } return db; }
const can=async p=>{ try{ await p; return true; }catch(e){ return false; } };
(async()=>{
  const admin=await mkUser('admin@t.local'), c1=await mkUser('c1@t.local'), c2=await mkUser('c2@t.local'), rnd=await mkUser('rnd@t.local');
  await adminWrite(`staff/${admin}`,{role:'admin',active:true});
  await adminWrite(`staff/${c1}`,{role:'courier',active:true});
  await adminWrite(`staff/${c2}`,{role:'courier',active:true});
  await adminWrite('catalog/prices',{super:100,special:120,superspecial:150,eggs:60,jumbo:90,zones:{cairo:25,giza:40}});
  await adminWrite('catalog/stock',{super:10,special:10,superspecial:10,eggs:2,jumbo:10,lastOrderId:'seed'});
  await adminWrite('orders/o1',{name:'a',phone:'01000000001',status:'dispatched',courierUid:c1,total:100,trackingToken:'T'.repeat(24)});
  await adminWrite('orders/o2',{name:'b',phone:'01000000002',status:'dispatched',courierUid:c2,total:100,trackingToken:'U'.repeat(24)});
  await adminWrite('tracking/'+'T'.repeat(24),{orderId:'o1',status:'dispatched',updatedAtMs:1});
  await adminWrite('batches/b1',{name:'دفعة 1',isOpen:true,isVisible:true,isArchived:false,ceilingPairs:6,bookedPairs:0,lastOrderId:'seed'});
  await adminWrite('batches/bclosed',{name:'مغلقة',isOpen:false,isVisible:true,isArchived:false,ceilingPairs:6,bookedPairs:0,lastOrderId:'seed'});
  const anon=await client('anon'), dA=await client('adm','admin@t.local'), d1=await client('c1','c1@t.local'), d2=await client('c2','c2@t.local'), dR=await client('rnd','rnd@t.local');
  const O=(db,id)=>F.doc(db,'orders',id), upd=(db,id,d)=>F.updateDoc(O(db,id),d);
  const ST=db=>F.doc(db,'catalog','stock'), TR=(db,t)=>F.doc(db,'tracking',t);
  let n=0;
  // place an order as a customer: order + tracking + stock decrement in one atomic batch
  async function place(db,over={},stockOver={},items={super:2,eggs:1},batchOver={},batchId='b1',noBatch=false){
    const id='n'+(++n), tok=('K'+n).padEnd(24,'x');
    const sub=(items.super||0)*100+(items.special||0)*120+(items.superspecial||0)*150+(items.eggs||0)*60+(items.jumbo||0)*90, fee=25;
    const pr=(items.super||0)+(items.special||0)+(items.superspecial||0)+(items.jumbo||0); const o={name:'عميل',phone:'01012345678',address:'شارع',items,...(pr>0&&!noBatch?{batchId}:{}),subtotal:sub,deliveryFee:fee,total:sub+fee,status:'new',createdAtMs:1,zone:'cairo',trackingToken:tok,...over};
    const cur={super:10,special:10,superspecial:10,eggs:2,jumbo:10};
    const st={...cur}; for(const k in items) st[k]=cur[k]-items[k];
    const b=F.writeBatch(db); b.set(O(db,id),o); b.set(TR(db,tok),{orderId:id,status:'new',updatedAtMs:1}); b.update(ST(db),{...st,lastOrderId:id,...stockOver}); if(pr>0&&!noBatch) b.update(F.doc(db,'batches',batchId),{bookedPairs:pr,lastOrderId:id,...batchOver});
    const r=await can(b.commit());
    if(r){ await adminWrite('catalog/stock',{...cur,lastOrderId:'seed'}); await adminWrite('batches/b1',{name:'دفعة 1',isOpen:true,isVisible:true,isArchived:false,ceilingPairs:6,bookedPairs:0,lastOrderId:'seed'}); } // reset stock for next case
    return r; }
  // --- customer: valid and adversarial
  ok('batch: booking beyond ceiling rejected (7 pairs, ceiling 6)', !await place(anon,{},{},{super:7},{}));
  ok('batch: order into closed batch rejected', !await place(anon,{},{},{super:1},{},'bclosed'));
  ok('batch: booking fewer pairs than ordered rejected', !await place(anon,{},{},{super:2},{bookedPairs:1}));
  ok('batch: booking more pairs than ordered rejected', !await place(anon,{},{},{super:2},{bookedPairs:5}));
  ok('batch: quail order without batch booking rejected', !await place(anon,{},{},{super:1},{},'b1',true));
  ok('batch: eggs-only order needs no batch', await place(anon,{},{},{eggs:1}));
  ok('batch: customer cannot reopen/raise ceiling', !await can(F.updateDoc(F.doc(anon,'batches','b1'),{ceilingPairs:999,lastOrderId:'x'})));
  ok('batch: customer cannot create a batch', !await can(F.setDoc(F.doc(anon,'batches','evil'),{name:'x',isOpen:true})));
  ok('batch: customers can read batches', await can(F.getDoc(F.doc(anon,'batches','b1'))));
  ok('customer can place a valid order (order+tracking+stock atomic)', await place(anon));
  ok('price tampering: lower subtotal/total rejected', !await place(anon,{subtotal:10,total:35}));
  ok('price tampering: total lowered but subtotal right rejected', !await place(anon,{total:1}));
  ok('price tampering: delivery fee zeroed rejected', !await place(anon,{deliveryFee:0,total:260-25}));
  ok('unknown zone rejected', !await place(anon,{zone:'mars'}));
  ok('negative quantity rejected', !await place(anon,{items:{super:-1,eggs:5},subtotal:-100+300,total:-100+300+25},{},{super:-1,eggs:5}));
  ok('unknown product key rejected', !await place(anon,{items:{gold:1},subtotal:0,total:25},{},{}));
  ok('empty order rejected', !await place(anon,{items:{},subtotal:0,total:25},{},{}));
  ok('overselling rejected (3 eggs, only 2 in stock)', !await place(anon,{},{},{eggs:3}));
  ok('order without stock decrement rejected', !await place(anon,{},{super:10,eggs:2}));
  ok('stock decrement larger than order rejected', !await place(anon,{},{super:5}));
  ok('order created pre-dispatched rejected', !await place(anon,{status:'dispatched'}));
  ok('order with courierUid injected rejected', !await place(anon,{courierUid:c1}));
  ok('short tracking token rejected', !await place(anon,{trackingToken:'short'}));
  ok('customer cannot raise stock directly', !await can(F.updateDoc(ST(anon),{super:999,lastOrderId:'zzz'})));
  ok('customer cannot change prices', !await can(F.updateDoc(F.doc(anon,'catalog','prices'),{super:1})));
  ok('customer cannot read any order directly', !await can(F.getDoc(O(anon,'o1'))));
  ok('customer cannot list orders', !await can(F.getDocs(F.collection(anon,'orders'))));
  ok('customer can read tracking by token', await can(F.getDoc(TR(anon,'T'.repeat(24)))));
  const tr=(await F.getDoc(TR(anon,'T'.repeat(24)))).data(); ok('tracking record has no name/phone/address', !('name' in tr)&&!('phone' in tr)&&!('address' in tr));
  ok('customer cannot list tracking', !await can(F.getDocs(F.collection(anon,'tracking'))));
  ok('customer cannot edit tracking status', !await can(F.updateDoc(TR(anon,'T'.repeat(24)),{status:'completed'})));
  ok('customer cannot update an order', !await can(upd(anon,'o1',{status:'completed'})));
  ok('customer cannot read staff', !await can(F.getDoc(F.doc(anon,'staff',c1))));
  // --- courier
  await adminWrite('orders/o3',{name:'a',phone:'01000000003',status:'dispatched',courierUid:c1,total:100,trackingToken:'V'.repeat(24),courierName:'x',createdAtMs:1795528456738,subtotal:75,deliveryFee:25,zone:'cairo',items:{super:2}});
  await place(anon); // creates n(last) via SDK
  ok('admin dispatches SDK-created order', await can(F.updateDoc(O(dA,'n'+n),{status:'dispatched',courierUid:c1,courierName:'x'})));
  ok('courier updates SDK-created, admin-dispatched order', await can(upd(d1,'n'+n,{status:'no_answer'})));
  ok('courier completes (full-shape order, server timestamp)', await can(upd(d1,'o3',{status:'completed',completedAt:F.serverTimestamp(),completedAtMs:Date.now()})));
  ok('courier lists only own orders', await can(F.getDocs(F.query(F.collection(d1,'orders'),F.where('courierUid','==',c1)))));
  ok('courier cannot list all orders', !await can(F.getDocs(F.collection(d1,'orders'))));
  ok('courier cannot list other courier orders', !await can(F.getDocs(F.query(F.collection(d1,'orders'),F.where('courierUid','==',c2)))));
  ok('courier cannot complete other courier order', !await can(upd(d1,'o2',{status:'completed'})));
  ok('courier cannot change total', !await can(upd(d1,'o1',{total:1})));
  ok('courier cannot reassign order', !await can(upd(d1,'o1',{courierUid:c2})));
  ok('courier cannot jump dispatched -> new', !await can(upd(d1,'o1',{status:'new'})));
  ok('courier cannot report handoff before completion', !await can(upd(d1,'o1',{handoffReported:true})));
  ok('courier cannot self-certify receipt (isSupplied)', !await can(upd(d1,'o1',{isSupplied:true})));
  ok('courier cannot self-certify reconciliation', !await can(upd(d1,'o1',{isReconciled:true})));
  // courier changes order status; tracking must mirror in the same batch
  const mirror=async(db,id,tok,status,extra={})=>{const b=F.writeBatch(db);b.update(O(db,id),{status,...extra});b.update(TR(db,tok),{status,updatedAtMs:2});return can(b.commit());};
  const T1='T'.repeat(24);
  ok('courier cannot set tracking status different from order status', !await can((async()=>{const b=F.writeBatch(d1);b.update(O(d1,'o1'),{status:'no_answer'});b.update(TR(d1,T1),{status:'completed',updatedAtMs:2});await b.commit();})()));
  ok('courier marks no_answer and tracking mirrors', await mirror(d1,'o1',T1,'no_answer'));
  ok('courier completes from no_answer and tracking mirrors', await mirror(d1,'o1',T1,'completed',{completedAtMs:1}));
  ok('courier cannot touch other courier tracking', !await can(F.updateDoc(TR(d2,T1),{status:'completed',updatedAtMs:3})));
  ok('courier REPORTS cash handoff on completed order', await can(upd(d1,'o1',{handoffReported:true,handoffReportedAt:'t'})));
  ok('courier still cannot set isSupplied after reporting', !await can(upd(d1,'o1',{isSupplied:true})));
  ok('courier cannot un-report handoff', !await can(upd(d1,'o1',{handoffReported:false})));
  ok('courier cannot delete', !await can(F.deleteDoc(O(d1,'o1'))));
  ok('courier cannot write own role', !await can(F.setDoc(F.doc(d1,'staff',c1),{role:'admin',active:true})));
  ok('signed-in user without staff doc cannot list orders', !await can(F.getDocs(F.collection(dR,'orders'))));
  // --- courier problem report
  await adminWrite('orders/p1',{name:'a',phone:'01000000009',status:'dispatched',courierUid:c1,total:100,trackingToken:'W'.repeat(24)});
  ok('courier reports a problem (status unchanged)', await can(upd(d1,'p1',{problemNote:'العميل لا يرد',problemAtMs:1})));
  ok('courier problem note cannot be empty', !await can(upd(d1,'p1',{problemNote:'',problemAtMs:2})));
  ok('courier problem note cannot be huge', !await can(upd(d1,'p1',{problemNote:'x'.repeat(300),problemAtMs:2})));
  ok('courier problem report cannot also change status', !await can(upd(d1,'p1',{problemNote:'x',problemAtMs:2,status:'completed'})));
  ok('other courier cannot report a problem on it', !await can(upd(d2,'p1',{problemNote:'x',problemAtMs:2})));
  // --- admin
  await adminWrite('orders/k1',{name:'a',phone:'01000000008',status:'dispatched',courierUid:c1,total:100,subtotal:75,deliveryFee:25,createdAtMs:1,trackingToken:'Y'.repeat(24),items:{super:1}});
  ok('admin cannot change an order total', !await can(upd(dA,'k1',{total:1})));
  ok('admin cannot change items', !await can(F.updateDoc(O(dA,'k1'),{items:{super:9}})));
  ok('admin cancels a dispatched order', await can(upd(dA,'k1',{status:'canceled',canceledAtMs:1})));
  ok('canceled is terminal (admin cannot revive)', !await can(upd(dA,'k1',{status:'dispatched'})));
  ok('courier cannot update a canceled order', !await can(upd(d1,'k1',{status:'completed'})));
  await adminWrite('orders/k2',{name:'a',phone:'01000000007',status:'completed',courierUid:c1,total:100,subtotal:75,deliveryFee:25,createdAtMs:1,trackingToken:'Z'.repeat(24),items:{super:1}});
  ok('admin cannot cancel a completed order', !await can(upd(dA,'k2',{status:'canceled'})));
  ok('admin lists all orders', await can(F.getDocs(F.collection(dA,'orders'))));
  ok('admin confirms receipt (isSupplied + isReconciled)', await can(upd(dA,'o1',{isSupplied:true,isReconciled:true})));
  ok('admin dispatches order to courier', await can(upd(dA,'o2',{courierUid:c2,status:'dispatched'})));
  // promo codes
  await adminWrite('promos/SAVE10',{percent:10,active:true}); await adminWrite('promos/OFF',{percent:10,active:false}); await adminWrite('promos/HALF',{percent:50,active:true});
  ok('valid promo: order with correct 10% discount is accepted', await place(anon,{promoCode:'SAVE10',discount:26,total:259}));
  ok('promo: wrong discount amount refused', !await place(anon,{promoCode:'SAVE10',discount:50,total:235}));
  ok('promo: total not matching discount refused', !await place(anon,{promoCode:'SAVE10',discount:26,total:285}));
  ok('promo: inactive code refused', !await place(anon,{promoCode:'OFF',discount:26,total:259}));
  ok('promo: unknown code refused', !await place(anon,{promoCode:'NOPE',discount:26,total:259}));
  ok('promo: discount without a code refused', !await place(anon,{discount:26,total:259}));
  ok('promo: code with zero/negative discount refused', !await place(anon,{promoCode:'SAVE10',discount:0,total:285}) && !await place(anon,{promoCode:'SAVE10',discount:-5,total:290}));
  ok('promo: order must use the code percent (10% code cannot give 50%)', !await place(anon,{promoCode:'SAVE10',discount:130,total:155}));
  ok('promo: 50% code with exact discount accepted', await place(anon,{promoCode:'HALF',discount:130,total:155}));
  ok('anyone can get a single promo doc', await can(F.getDoc(F.doc(anon,'promos','SAVE10'))));
  ok('customers cannot list promos', !await can(F.getDocs(F.collection(anon,'promos'))));
  ok('courier cannot list promos', !await can(F.getDocs(F.collection(d1,'promos'))));
  ok('customer cannot create a promo', !await can(F.setDoc(F.doc(anon,'promos','MINE'),{percent:90,active:true})));
  ok('admin can create a promo', await can(F.setDoc(F.doc(dA,'promos','NEW20'),{percent:20,active:true})));
  ok('admin cannot create promo over 90%, under 1%, bad id or extra fields', !await can(F.setDoc(F.doc(dA,'promos','BIG'),{percent:95,active:true})) && !await can(F.setDoc(F.doc(dA,'promos','ZERO'),{percent:0,active:true})) && !await can(F.setDoc(F.doc(dA,'promos','bad code'),{percent:10,active:true})) && !await can(F.setDoc(F.doc(dA,'promos','XTRA'),{percent:10,active:true,uses:1})));
  ok('customer cannot change a promo percent', !await can(F.updateDoc(F.doc(anon,'promos','SAVE10'),{percent:90})));
  const NT=(db)=>F.doc(db,'orderNotes','o1');
  ok('admin can write an internal note', await can(F.setDoc(NT(dA),{text:'ملاحظة',updatedAtMs:1})));
  ok('admin can read the internal note', await can(F.getDoc(NT(dA))));
  ok('assigned courier cannot read the internal note', !await can(F.getDoc(NT(d1))));
  ok('courier cannot write an internal note', !await can(F.setDoc(NT(d1),{text:'x',updatedAtMs:1})));
  ok('anonymous cannot read the internal note', !await can(F.getDoc(NT(anon))));
  ok('note with extra fields or over 300 chars is refused', !await can(F.setDoc(NT(dA),{text:'x',updatedAtMs:1,extra:1})) && !await can(F.setDoc(NT(dA),{text:'x'.repeat(301),updatedAtMs:1})));
  ok('nobody deletes orders (audit)', !await can(F.deleteDoc(O(dA,'o2'))));
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
