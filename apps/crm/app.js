// Admin app (rebuild). Order fields are rendered with textContent only.
const $ = id => document.getElementById(id);
const el = (t, txt, cls) => { const e = document.createElement(t); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; };
const PRODUCTS = { super: 'سوبر', special: 'سبيشيال', superspecial: 'سوبر سبيشيال', eggs: 'بيض', jumbo: 'جامبو' };
let orders = [], couriers = [], batches = [], notes = {}, unsubs = [], tab = 'orders';

$('go').onclick = async () => { $('lerr').textContent = ''; try { await auth.signInWithEmailAndPassword($('email').value, $('pass').value); } catch (e) { $('lerr').textContent = 'بيانات الدخول غير صحيحة'; } };
$('out').onclick = () => auth.signOut();
$('tabs').querySelectorAll('button').forEach(b => b.onclick = () => {
  tab = b.dataset.t; $('tabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  ['orders', 'cash', 'customers', 'batches', 'couriers', 'catalog'].forEach(t => $(t).classList.toggle('hidden', t !== tab)); if (tab === 'catalog') loadCatalog();
});
auth.onAuthStateChanged(async u => {
  unsubs.forEach(f => f()); unsubs = [];
  $('login').classList.toggle('hidden', !!u); $('app').classList.toggle('hidden', !u); $('out').classList.toggle('hidden', !u);
  if (!u) return;
  const s = await db.collection('staff').doc(u.uid).get();
  if (!s.exists || s.data().role !== 'admin' || s.data().active !== true) { await auth.signOut(); $('lerr').textContent = 'هذا الحساب ليس مسؤولاً'; return; }
  unsubs.push(db.collection('orders').onSnapshot(sn => { orders = sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)); renderOrders(); renderCash(); renderCustomers(); }));
  unsubs.push(db.collection('orderNotes').onSnapshot(sn => { notes = {}; sn.docs.forEach(d => (notes[d.id] = d.data().text || '')); renderOrders(); }));
  unsubs.push(db.collection('batches').onSnapshot(sn => { batches = sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.deliveryStart || 0) - (a.deliveryStart || 0)); renderBatches(); }));
  unsubs.push(db.collection('staff').where('role', '==', 'courier').onSnapshot(sn => { couriers = sn.docs.map(d => ({ uid: d.id, ...d.data() })); renderCouriers(); renderOrders(); }));
});

// order + customer tracking record always change together
function setStatus(o, patch) {
  const b = db.batch(); b.update(db.collection('orders').doc(o.id), patch);
  if (patch.status && o.trackingToken) b.update(db.collection('tracking').doc(o.trackingToken), { status: patch.status, updatedAtMs: Date.now() });
  return b.commit().catch(e => { console.error('update failed', e.code); alert('تعذر التحديث'); });
}
const STATUS = { new: 'جديد', dispatched: 'مع المندوب', no_answer: 'لم يرد', completed: 'تم التسليم', canceled: 'ملغي' };
function renderOrders() {
  const box = $('orders'); box.replaceChildren();
  const q = ($('osearch').value || '').trim().toLowerCase(), sf = $('ostatus').value;
  orders.filter(o => (sf === 'all' ? true : sf === 'completed' ? o.status === 'completed' : sf === 'canceled' ? o.status === 'canceled' : !(o.status === 'completed' && o.isSupplied) && o.status !== 'canceled'))
    .filter(o => !q || [o.name, o.phone, o.address, notes[o.id]].some(v => String(v || '').toLowerCase().includes(q))).forEach(o => {
    const c = el('div', null, 'card');
    c.append(el('b', (o.name || '') + ' - ' + (o.phone || '')), el('span', STATUS[o.status] || o.status, 'tag'), el('div', o.address || ''));
    c.append(el('div', Object.entries(o.items || {}).map(([k, v]) => (PRODUCTS[k] || k) + ' x' + v).join('، ') + ' | الإجمالي ' + o.total + ' ج'));
    if (o.problemNote) { const pr = el('div', null, 'row'); const pt = el('b', 'مشكلة من المندوب: ' + o.problemNote); pt.style.color = '#b45309'; pr.append(pt); c.append(pr); }
    if (o.notes) c.append(el('div', 'ملاحظات العميل: ' + o.notes));
    if (notes[o.id]) c.append(el('div', 'ملاحظة داخلية: ' + notes[o.id]));
    if (o.status !== 'canceled') { const nb = el('button', 'ملاحظة داخلية', 'gray'); nb.onclick = () => { const t = prompt('الملاحظة الداخلية (للإدارة فقط)', notes[o.id] || ''); if (t !== null) db.collection('orderNotes').doc(o.id).set({ text: t.slice(0, 300), updatedAtMs: Date.now() }).catch(() => alert('تعذر الحفظ')); }; c.append(nb); }
    if (['new', 'dispatched', 'no_answer'].includes(o.status)) { const cb = el('button', 'إلغاء الطلب وإرجاع المخزون', 'gray'); cb.onclick = () => cancelOrder(o); c.append(cb); }
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
// Cancel: order + tracking + stock restore in one atomic batch (stock is only ever restored once: canceled is terminal in the rules).
async function cancelOrder(o) {
  if (!confirm('إلغاء هذا الطلب وإرجاع الكميات للمخزون؟')) return;
  const b = db.batch(), inc = firebase.firestore.FieldValue.increment;
  b.update(db.collection('orders').doc(o.id), { status: 'canceled', canceledAtMs: Date.now() });
  if (o.trackingToken) b.update(db.collection('tracking').doc(o.trackingToken), { status: 'canceled', updatedAtMs: Date.now() });
  const st = {}; Object.entries(o.items || {}).forEach(([k, v]) => { if (PRODUCTS[k]) st[k] = inc(Number(v)); });
  b.update(db.collection('catalog').doc('stock'), { ...st, lastOrderId: 'cancel:' + o.id });
  const pr = ['super', 'special', 'superspecial', 'jumbo'].reduce((a, k) => a + Number((o.items || {})[k] || 0), 0);
  if (o.batchId && pr > 0) b.update(db.collection('batches').doc(o.batchId), { bookedPairs: inc(-pr) });
  b.commit().catch(e => { console.error('cancel failed', e.code); alert('تعذر الإلغاء'); });
}
function renderCustomers() {
  const box = $('cuslist'); if (!box) return; box.replaceChildren();
  const by = {};
  orders.forEach(o => { const k = String(o.phone || '').replace(/\D/g, ''); if (!k) return; const c = by[k] = by[k] || { phone: o.phone, name: o.name, orders: [] }; c.orders.push(o); });
  const q = ($('csearch').value || '').trim();
  Object.values(by).filter(c => !q || c.name.includes(q) || c.phone.includes(q)).sort((a, b) => b.orders.length - a.orders.length).forEach(c => {
    const done = c.orders.filter(o => o.status === 'completed'), spent = done.reduce((s, o) => s + (+o.total || 0), 0);
    const card = el('div', null, 'card'); card.append(el('b', c.name + ' - ' + c.phone), el('div', 'الطلبات: ' + c.orders.length + ' | المكتملة: ' + done.length + ' | إجمالي المشتريات: ' + spent + ' ج'));
    const det = el('div', null, 'hidden'); c.orders.forEach(o => det.append(el('div', new Date(o.createdAtMs || 0).toLocaleDateString('ar-EG') + ' | ' + (STATUS[o.status] || o.status) + ' | ' + o.total + ' ج | ' + (o.address || ''))));
    const t = el('button', 'السجل', 'gray'); t.onclick = () => det.classList.toggle('hidden'); card.append(t, det); box.append(card);
  });
  if (!box.children.length) box.append(el('div', 'لا يوجد عملاء', 'card'));
}
$('csearch').oninput = renderCustomers;
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
  renderZones(pd.zones || { القاهرة: 25 });
}
$('csave').onclick = async () => {
  const pr = {}, st = {}; Object.keys(PRODUCTS).forEach(k => { pr[k] = parseInt($('p-' + k).value, 10) || 0; st[k] = parseInt($('s-' + k).value, 10) || 0; });
  const zones = {}; document.querySelectorAll('#zbox .zrow').forEach(r => { const n = r.querySelector('.zn').value.trim(), f = parseInt(r.querySelector('.zf').value, 10); if (n && f >= 0) zones[n] = f; });
  if (!Object.keys(zones).length) return alert('أضف منطقة توصيل واحدة على الأقل');
  const b = db.batch(); b.set(db.collection('catalog').doc('prices'), { ...pr, zones }); b.set(db.collection('catalog').doc('stock'), { ...st, lastOrderId: 'admin' }, { merge: true });
  b.commit().then(() => alert('تم الحفظ')).catch(() => alert('تعذر الحفظ'));
};

// Batches: delivery rounds with a ceiling of pairs (plates). Orders book into them atomically from the store.
const dms = v => (v ? new Date(v + 'T12:00:00').getTime() : null);
function renderBatches() {
  const box = $('blist'); if (!box) return; box.replaceChildren();
  batches.forEach(b => {
    const c = el('div', null, 'card'), fd = ms => (ms ? new Date(ms).toLocaleDateString('ar-EG') : '-');
    c.append(el('b', b.name), el('div', 'محجوز ' + (b.bookedPairs || 0) + ' من ' + b.ceilingPairs + ' | التوصيل ' + fd(b.deliveryStart) + ' إلى ' + fd(b.deliveryEnd)));
    const tags = el('div'); tags.append(el('span', b.isOpen ? 'مفتوحة' : 'مغلقة', 'tag'), el('span', b.isVisible ? 'ظاهرة للعملاء' : 'مخفية', 'tag'), el('span', b.isArchived ? 'مؤرشفة' : 'نشطة', 'tag')); c.append(tags);
    const r = el('div', null, 'row'), mk = (txt, patch) => { const x = el('button', txt, 'gray'); x.onclick = () => db.collection('batches').doc(b.id).update(patch).catch(() => alert('تعذر التحديث')); r.append(x); };
    mk(b.isOpen ? 'إغلاق الحجز' : 'فتح الحجز', { isOpen: !b.isOpen }); mk(b.isVisible ? 'إخفاء' : 'إظهار', { isVisible: !b.isVisible }); mk(b.isArchived ? 'إلغاء الأرشفة' : 'أرشفة', { isArchived: !b.isArchived });
    c.append(r); box.append(c);
  });
  if (!box.children.length) box.append(el('div', 'لا توجد دفعات. أضف دفعة ليتمكن العملاء من حجز الأطباق.', 'card'));
}
$('badd').onclick = async () => {
  $('berr').textContent = ''; const name = $('bname').value.trim(), ceil = parseInt($('bceil').value, 10);
  if (!name || !(ceil > 0)) { $('berr').textContent = 'أدخل اسم الدفعة والحد الأقصى'; return; }
  try { await db.collection('batches').add({ name, ceilingPairs: ceil, bookedPairs: 0, isOpen: true, isVisible: true, isArchived: false, deliveryStart: dms($('bstart').value), deliveryEnd: dms($('bend').value), lastOrderId: '' }); $('bname').value = $('bceil').value = ''; }
  catch (e) { $('berr').textContent = 'تعذر الإضافة'; }
};

$('osearch').oninput = $('ostatus').onchange = renderOrders;
// CSV export of the orders currently stored (formula-injection safe: cells starting with = + - @ are prefixed)
function csvCell(v) { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }
$('ocsv').onclick = () => {
  const rows = [['التاريخ', 'الاسم', 'الموبايل', 'العنوان', 'المنطقة', 'الأصناف', 'الإجمالي', 'الحالة', 'المندوب'].map(csvCell).join(',')];
  orders.forEach(o => rows.push([new Date(o.createdAtMs || 0).toISOString(), o.name, o.phone, o.address, o.zone, Object.entries(o.items || {}).map(([k, v]) => (PRODUCTS[k] || k) + ' x' + v).join(' / '), o.total, STATUS[o.status] || o.status, o.courierName || ''].map(csvCell).join(',')));
  const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'orders.csv'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
// Delivery zones editor
function zoneRow(name, fee) {
  const r = el('div', null, 'row zrow'), n = el('input'), f = el('input'), x = el('button', 'حذف', 'gray');
  n.placeholder = 'المنطقة'; n.value = name; n.className = 'zn'; f.type = 'number'; f.min = '0'; f.value = fee; f.className = 'zf'; x.onclick = () => r.remove(); r.append(n, f, x); return r;
}
function renderZones(zones) { const b = $('zbox'); b.replaceChildren(); Object.entries(zones).forEach(([n, f]) => b.append(zoneRow(n, f))); }
$('zadd').onclick = () => $('zbox').append(zoneRow('', 0));
