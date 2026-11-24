// Admin app (rebuild). Order fields are rendered with textContent only.
const $ = id => document.getElementById(id);
const el = (t, txt, cls) => { const e = document.createElement(t); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; };
const PRODUCTS = { super: 'سوبر', special: 'سبيشيال', superspecial: 'سوبر سبيشيال', eggs: 'بيض', jumbo: 'جامبو' };
let orders = [], couriers = [], unsubs = [], tab = 'orders';

$('go').onclick = async () => { $('lerr').textContent = ''; try { await auth.signInWithEmailAndPassword($('email').value, $('pass').value); } catch (e) { $('lerr').textContent = 'بيانات الدخول غير صحيحة'; } };
$('out').onclick = () => auth.signOut();
$('tabs').querySelectorAll('button').forEach(b => b.onclick = () => {
  tab = b.dataset.t; $('tabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  ['orders', 'cash', 'couriers', 'catalog'].forEach(t => $(t).classList.toggle('hidden', t !== tab)); if (tab === 'catalog') loadCatalog();
});
auth.onAuthStateChanged(async u => {
  unsubs.forEach(f => f()); unsubs = [];
  $('login').classList.toggle('hidden', !!u); $('app').classList.toggle('hidden', !u); $('out').classList.toggle('hidden', !u);
  if (!u) return;
  const s = await db.collection('staff').doc(u.uid).get();
  if (!s.exists || s.data().role !== 'admin' || s.data().active !== true) { await auth.signOut(); $('lerr').textContent = 'هذا الحساب ليس مسؤولاً'; return; }
  unsubs.push(db.collection('orders').onSnapshot(sn => { orders = sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)); renderOrders(); renderCash(); }));
  unsubs.push(db.collection('staff').where('role', '==', 'courier').onSnapshot(sn => { couriers = sn.docs.map(d => ({ uid: d.id, ...d.data() })); renderCouriers(); renderOrders(); }));
});

// order + customer tracking record always change together
function setStatus(o, patch) {
  const b = db.batch(); b.update(db.collection('orders').doc(o.id), patch);
  if (patch.status && o.trackingToken) b.update(db.collection('tracking').doc(o.trackingToken), { status: patch.status, updatedAtMs: Date.now() });
  return b.commit().catch(e => { console.error('update failed', e.code); alert('تعذر التحديث'); });
}
const STATUS = { new: 'جديد', dispatched: 'مع المندوب', no_answer: 'لم يرد', completed: 'تم التسليم' };
function renderOrders() {
  const box = $('orders'); box.replaceChildren();
  orders.filter(o => !(o.status === 'completed' && o.isSupplied)).forEach(o => {
    const c = el('div', null, 'card');
    c.append(el('b', (o.name || '') + ' - ' + (o.phone || '')), el('span', STATUS[o.status] || o.status, 'tag'), el('div', o.address || ''));
    c.append(el('div', Object.entries(o.items || {}).map(([k, v]) => (PRODUCTS[k] || k) + ' x' + v).join('، ') + ' | الإجمالي ' + o.total + ' ج'));
    if (o.status === 'new' || o.status === 'no_answer') {
      const r = el('div', null, 'row'), sel = el('select');
      couriers.filter(x => x.active).forEach(x => { const op = el('option', x.name || x.uid); op.value = x.uid; sel.append(op); });
      const go = el('button', 'تسليم لمندوب');
      go.onclick = () => { const cu = couriers.find(x => x.uid === sel.value); if (!cu) return alert('أضف مندوباً أولاً'); setStatus(o, { status: 'dispatched', courierUid: cu.uid, courierName: cu.name || '' }); };
      r.append(sel, go); c.append(r);
    }
    box.append(c);
  });
  if (!box.children.length) box.append(el('div', 'لا توجد طلبات', 'card'));
}
function renderCash() {
  const box = $('cash'); box.replaceChildren();
  const due = orders.filter(o => o.status === 'completed' && !o.isSupplied);
  const by = {}; due.forEach(o => (by[o.courierName || o.courierUid] = by[o.courierName || o.courierUid] || []).push(o));
  Object.entries(by).forEach(([name, list]) => {
    const c = el('div', null, 'card'); const rep = list.filter(o => o.handoffReported);
    c.append(el('b', name), el('div', 'عدد الطلبات: ' + list.length + ' | المبلغ: ' + list.reduce((s, o) => s + (+o.total || 0), 0) + ' ج | أبلغ المندوب بتسليم ' + rep.length));
    const btn = el('button', 'تأكيد استلام النقدية للطلبات المُبلَّغ عنها'); btn.disabled = !rep.length;
    btn.onclick = () => { const b = db.batch(); rep.forEach(o => b.update(db.collection('orders').doc(o.id), { isSupplied: true, isReconciled: true, reconciledAt: firebase.firestore.FieldValue.serverTimestamp() })); b.commit().catch(() => alert('تعذر التأكيد')); };
    c.append(btn); box.append(c);
  });
  if (!box.children.length) box.append(el('div', 'لا توجد نقدية معلقة', 'card'));
}
function renderCouriers() {
  const box = $('clist'); box.replaceChildren();
  couriers.forEach(x => { const c = el('div', null, 'card row'); c.append(el('b', x.name || ''), el('span', x.phone || ''), el('span', x.active ? 'مفعّل' : 'موقوف', 'tag'));
    const t = el('button', x.active ? 'إيقاف' : 'تفعيل', 'gray'); t.onclick = () => db.collection('staff').doc(x.uid).update({ active: !x.active }); c.append(t); box.append(c); });
}
// Create courier login with a second Firebase app instance so the admin stays signed in.
$('cadd').onclick = async () => {
  $('cerr').textContent = ''; const phone = $('cphone').value.replace(/\D/g, ''), name = $('cname').value.trim(), pw = $('cpass').value;
  if (!name || phone.length < 8 || pw.length < 6) { $('cerr').textContent = 'أدخل الاسم والموبايل وكلمة سر 6 أحرف على الأقل'; return; }
  try {
    const app2 = firebase.apps.find(a => a.name === 'prov') || firebase.initializeApp(SMAN.firebase, 'prov'); const a2 = app2.auth();
    if (SMAN.emulator) { try { a2.useEmulator('http://' + SMAN.emulator.host + ':' + SMAN.emulator.auth); } catch (e) {} }
    const cred = await a2.createUserWithEmailAndPassword(phone + '@' + SMAN.courierEmailDomain, pw); await a2.signOut();
    await db.collection('staff').doc(cred.user.uid).set({ role: 'courier', active: true, name, phone });
    $('cname').value = $('cphone').value = $('cpass').value = '';
  } catch (e) { $('cerr').textContent = 'تعذر إنشاء الحساب (' + (e.code || 'error') + ')'; }
};
async function loadCatalog() {
  const [p, s] = await Promise.all([db.collection('catalog').doc('prices').get(), db.collection('catalog').doc('stock').get()]);
  const pd = p.data() || {}, sd = s.data() || {};
  [['pbox', pd, 'p'], ['sbox', sd, 's']].forEach(([id, d, pre]) => { const b = $(id); b.replaceChildren();
    Object.keys(PRODUCTS).forEach(k => { const r = el('div', null, 'row'); r.append(el('span', PRODUCTS[k])); const i = el('input'); i.type = 'number'; i.id = pre + '-' + k; i.value = d[k] ?? 0; r.append(i); b.append(r); }); });
  window._zones = pd.zones || { القاهرة: 25 };
}
$('csave').onclick = async () => {
  const pr = {}, st = {}; Object.keys(PRODUCTS).forEach(k => { pr[k] = parseInt($('p-' + k).value, 10) || 0; st[k] = parseInt($('s-' + k).value, 10) || 0; });
  const b = db.batch(); b.set(db.collection('catalog').doc('prices'), { ...pr, zones: window._zones }); b.set(db.collection('catalog').doc('stock'), { ...st, lastOrderId: 'admin' }, { merge: true });
  b.commit().then(() => alert('تم الحفظ')).catch(() => alert('تعذر الحفظ'));
};
