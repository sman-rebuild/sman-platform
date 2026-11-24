// Courier app. All data is written with textContent (no HTML injection from order fields).
const $ = id => document.getElementById(id);
let filter = 'active', orders = [], unsub = null, me = null;
const emailFor = p => String(p).replace(/\D/g, '') + '@' + SMAN.courierEmailDomain;

$('go').onclick = async () => {
  $('lerr').textContent = '';
  try { await auth.signInWithEmailAndPassword(emailFor($('phone').value), $('pass').value); }
  catch (e) { $('lerr').textContent = 'رقم الموبايل أو كلمة السر غير صحيحة'; }
};
$('out').onclick = () => auth.signOut();
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  filter = b.dataset.f; document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b)); render();
});

auth.onAuthStateChanged(async user => {
  if (unsub) { unsub(); unsub = null; }
  me = user; $('login').classList.toggle('hidden', !!user); $('app').classList.toggle('hidden', !user); $('out').classList.toggle('hidden', !user);
  if (!user) return;
  const staff = await db.collection('staff').doc(user.uid).get();
  if (!staff.exists || staff.data().role !== 'courier' || staff.data().active !== true) {
    await auth.signOut(); $('lerr').textContent = 'هذا الحساب غير مفعّل كمندوب'; return;
  }
  unsub = db.collection('orders').where('courierUid', '==', user.uid).onSnapshot(s => {
    orders = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => !(o.status === 'completed' && (o.isSupplied === true || o.isReconciled === true)) && ['dispatched', 'no_answer', 'completed'].includes(o.status));
    render();
  }, () => { $('list').textContent = 'تعذر تحميل الطلبات'; });
});

const el = (t, txt, cls) => { const e = document.createElement(t); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; };
// Order update and its customer-facing tracking record change together (rules require they match).
function act(id, patch) {
  const o = orders.find(x => x.id === id); const b = db.batch();
  b.update(db.collection('orders').doc(id), patch);
  if (o && o.trackingToken) b.update(db.collection('tracking').doc(o.trackingToken), { status: patch.status, updatedAtMs: Date.now() });
  return b.commit().catch(e => { console.error('act failed', e.code, e.message); alert('تعذر التحديث، حاول مجدداً'); });
}

function render() {
  const list = $('list'); list.replaceChildren();
  const want = filter === 'active' ? 'dispatched' : filter;
  const shown = orders.filter(o => o.status === want);
  if (!shown.length) list.append(el('div', 'لا توجد طلبات', 'card'));
  shown.forEach(o => {
    const c = el('div', null, 'card');
    c.append(el('b', o.name || ''), el('div', o.address || ''));
    const tel = el('a', o.phone || ''); tel.href = 'tel:' + String(o.phone || '').replace(/[^\d+]/g, ''); c.append(tel);
    c.append(el('div', 'الإجمالي: ' + o.total + ' ج'));
    if (o.status !== 'completed') {
      const r = el('div', null, 'row');
      const ok = el('button', 'تم التسليم'); ok.onclick = () => act(o.id, { status: 'completed', completedAt: firebase.firestore.FieldValue.serverTimestamp(), completedAtMs: Date.now() });
      r.append(ok);
      if (o.status === 'dispatched') { const na = el('button', 'لم يرد', 'warn'); na.onclick = () => act(o.id, { status: 'no_answer' }); r.append(na); }
      else { const re = el('button', 'إعادة المحاولة', 'gray'); re.onclick = () => act(o.id, { status: 'dispatched' }); r.append(re); }
      c.append(r);
      const pb = el('button', 'الإبلاغ عن مشكلة', 'gray'); pb.style.marginTop = '8px'; pb.style.width = '100%';
      pb.onclick = () => { const t = (prompt('اكتب المشكلة (حتى 200 حرف)') || '').trim().slice(0, 200); if (t) db.collection('orders').doc(o.id).update({ problemNote: t, problemAtMs: Date.now() }).then(() => alert('تم إرسال البلاغ')).catch(() => alert('تعذر إرسال البلاغ')); };
      c.append(pb);
      if (o.problemNote) c.append(el('div', 'بلاغك: ' + o.problemNote, 'err'));
    }
    list.append(c);
  });
  const done = orders.filter(o => o.status === 'completed' && !o.handoffReported);
  $('remit').classList.toggle('hidden', !done.length);
  $('cash').textContent = done.reduce((s, o) => s + (Number(o.total) || 0), 0);
}
$('remitBtn').onclick = async () => {
  const done = orders.filter(o => o.status === 'completed' && !o.handoffReported);
  if (!done.length || !confirm('تأكيد أنك سلّمت النقدية؟ سيؤكد المسؤول الاستلام.')) return;
  const b = db.batch(); done.forEach(o => b.update(db.collection('orders').doc(o.id), { handoffReported: true, handoffReportedAt: firebase.firestore.FieldValue.serverTimestamp() }));
  b.commit().catch(() => alert('تعذر التقفيل'));
};
