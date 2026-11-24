const $ = id => document.getElementById(id);
const P = window.PRODUCTS, KEYS = Object.keys(P);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let prices = null, stock = null, filter = 'all', batches = [], promo = null;
const pairsOf = items => ['super', 'special', 'superspecial', 'jumbo'].reduce((a, k) => a + (items[k] || 0), 0);
const room = b => Math.max(0, Number(b.ceilingPairs) - Number(b.bookedPairs || 0));
const fmtD = ms => ms ? new Date(ms).toLocaleDateString('ar-EG') : '';
let cart = {}; try { cart = JSON.parse(localStorage.getItem('sman_cart') || '{}'); } catch (e) {}
const save = () => localStorage.setItem('sman_cart', JSON.stringify(cart));
const qty = k => cart[k] || 0;
function toast(t) { $('toast-text').textContent = t; const e = $('toast'); e.classList.remove('opacity-0', '-translate-y-4'); clearTimeout(toast._t); toast._t = setTimeout(() => e.classList.add('opacity-0', '-translate-y-4'), 1800); }
function maxFor(k) { return Math.max(0, Math.min(20, stock ? stock[k] : 0)); }
function setQty(k, n) {
  n = Math.max(0, Math.min(maxFor(k), n));
  if (n === 0) delete cart[k]; else cart[k] = n;
  // total quantity across products is limited to 50 by the order rules
  save(); renderGrid(); renderCart();
}
function totals() {
  if (!prices) return { sub: 0, fee: 0, tot: 0, count: 0 };
  const sub = KEYS.reduce((s, k) => s + qty(k) * prices[k], 0), z = $('zone').value, fee = (prices.zones && prices.zones[z]) || 0;
  const count = KEYS.reduce((s, k) => s + qty(k), 0), disc = promo ? Math.floor(sub * promo.percent / 100) : 0;
  return { sub, fee, disc, tot: count ? sub - disc + fee : 0, count };
}
function renderGrid() {
  const g = $('grid'); g.replaceChildren();
  document.querySelectorAll('.filter-btn').forEach(b => { const on = b.dataset.filter === filter; b.className = 'filter-btn whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-black transition-all ' + (on ? 'bg-brand-navy text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200'); });
  KEYS.filter(k => filter === 'all' || P[k].cat === filter).forEach(k => {
    const p = P[k], out = !stock || stock[k] <= 0, n = qty(k), low = !out && stock[k] <= 5;
    const c = document.createElement('article'); c.className = 'product-app-card rounded-3xl overflow-hidden flex flex-col' + (n ? ' in-cart' : '');
    c.innerHTML = `<div class="relative aspect-[4/3] bg-slate-50"><img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" class="w-full h-full object-cover ${out ? 'opacity-40 grayscale' : ''}">
      <span class="absolute top-2 right-2 bg-[#0b261c]/90 text-amber-300 text-[10px] font-black px-2 py-1 rounded-full">${esc(p.tag)}</span>
      ${out ? '<span class="absolute inset-0 flex items-center justify-center"><span class="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full">نفد</span></span>' : ''}</div>
      <div class="p-3 flex flex-col gap-1.5 flex-1"><h3 class="font-black text-sm text-brand-navy leading-snug">${esc(p.name)}</h3>
      <p class="text-[11px] font-bold text-slate-500">${esc(p.weight)}</p><p class="text-[11px] font-semibold text-slate-500 leading-snug flex-1">${esc(p.blurb)}</p>
      ${low ? `<p class="text-[10px] font-black text-amber-700">متبقي ${Number(stock[k])} فقط</p>` : ''}
      <div class="flex items-center justify-between pt-1"><span class="font-black text-base text-brand-navy">${prices ? Number(prices[k]) : ''} <small class="text-[10px]">ج</small></span>
      ${out ? '' : n ? `<div class="flex items-center gap-1.5 bg-emerald-50 rounded-xl border border-emerald-200 px-1"><button data-dec="${k}" aria-label="تقليل" class="w-7 h-7 font-black text-emerald-800">−</button><span class="w-5 text-center font-black text-sm">${n}</span><button data-inc="${k}" aria-label="زيادة" class="w-7 h-7 font-black text-emerald-800">+</button></div>`
        : `<button data-add="${k}" class="bg-brand-navy text-white text-xs font-black px-3 py-2 rounded-xl shadow-sm flex items-center gap-1"><i class="fa-solid fa-plus text-amber-400"></i> أضف</button>`}</div></div>`;
    g.append(c);
  });
}
function renderBatch() {
  const need = pairsOf(cart), w = $('batch-wrap'), sel = $('batch'), keep = sel.value; sel.replaceChildren();
  w.classList.toggle('hidden', !need);
  batches.forEach(b => { const o = document.createElement('option'); o.value = b.id; const r = room(b); o.textContent = b.name + (b.deliveryStart ? ' | ' + fmtD(b.deliveryStart) + (b.deliveryEnd ? ' - ' + fmtD(b.deliveryEnd) : '') : '') + ' | متبقي ' + r; o.disabled = r < need; sel.append(o); });
  if ([...sel.options].some(o => o.value === keep && !o.disabled)) sel.value = keep; else { const f = [...sel.options].find(o => !o.disabled); if (f) sel.value = f.value; }
  $('batch-note').textContent = !need ? '' : !batches.length ? 'لا توجد دفعات متاحة حالياً للأطباق' : ![...sel.options].some(o => !o.disabled) ? 'لا توجد دفعة بها مكان كاف لهذا العدد' : '';
}
function renderCart() {
  renderBatch();
  const t = totals(); $('cart-count').textContent = t.count; $('bar-total').textContent = t.sub;
  $('cart-bar').classList.toggle('translate-y-full', !t.count);
  $('disc-row').classList.toggle('hidden', !t.disc); $('disc').textContent = t.disc; $('sub').textContent = t.sub; $('fee').textContent = t.fee; $('tot').textContent = t.tot;
  const l = $('lines'); l.replaceChildren();
  KEYS.filter(k => qty(k)).forEach(k => { const r = document.createElement('div'); r.className = 'bg-white rounded-2xl p-2.5 border border-slate-200 flex items-center gap-3';
    r.innerHTML = `<img src="${esc(P[k].img)}" alt="" class="w-12 h-12 rounded-xl object-cover"><div class="flex-1 min-w-0"><div class="font-black text-sm truncate">${esc(P[k].name)}</div><div class="text-[11px] font-bold text-slate-500">${Number(prices[k])} ج × ${qty(k)}</div></div>
      <div class="flex items-center gap-1 bg-slate-50 rounded-xl border px-1"><button data-dec="${k}" aria-label="تقليل" class="w-7 h-7 font-black">−</button><span class="w-5 text-center font-black text-sm">${qty(k)}</span><button data-inc="${k}" aria-label="زيادة" class="w-7 h-7 font-black">+</button></div>`;
    l.append(r); });
  if (!t.count) closeSheet();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-add],[data-inc],[data-dec],[data-filter]'); if (!b) return;
  if (b.dataset.filter) { filter = b.dataset.filter; return renderGrid(); }
  const k = b.dataset.add || b.dataset.inc || b.dataset.dec;
  if (b.dataset.add) { setQty(k, 1); toast('تمت الإضافة للسلة'); } else if (b.dataset.inc) setQty(k, qty(k) + 1); else setQty(k, qty(k) - 1);
});
const openSheet = () => { $('overlay').classList.remove('hidden'); $('sheet').classList.remove('hidden'); };
function closeSheet() { $('overlay').classList.add('hidden'); $('sheet').classList.add('hidden'); }
$('promo-apply').onclick = async () => {
  const code = $('promo').value.trim().toUpperCase(), m = $('promo-msg'); promo = null;
  if (!/^[A-Z0-9]{3,20}$/.test(code)) { m.textContent = 'كود غير صحيح'; m.className = 'text-[11px] font-black text-red-700'; return renderCart(); }
  try { const d = await db.collection('promos').doc(code).get(), v = d.exists ? d.data() : null;
    if (v && v.active === true) { promo = { code, percent: v.percent }; m.textContent = 'تم تطبيق خصم ' + v.percent + '%'; m.className = 'text-[11px] font-black text-emerald-700'; }
    else { m.textContent = 'الكود غير صالح'; m.className = 'text-[11px] font-black text-red-700'; }
  } catch (e) { m.textContent = 'تعذر التحقق من الكود'; m.className = 'text-[11px] font-black text-red-700'; }
  renderCart();
};
$('cart-open').onclick = openSheet; $('overlay').onclick = closeSheet; $('sheet-close').onclick = closeSheet; $('zone').onchange = renderCart;
$('track-open').onclick = () => { const t = localStorage.getItem('sman_last_track'); if (t) location.href = 'track.html?t=' + encodeURIComponent(t); else toast('لا يوجد طلب سابق على هذا الجهاز'); };

(async () => {
  try {
    [prices, stock] = (await Promise.all([db.collection('catalog').doc('prices').get(), db.collection('catalog').doc('stock').get()])).map(d => d.data());
    if (!prices || !stock) throw new Error('missing');
    batches = (await db.collection('batches').where('isOpen', '==', true).where('isVisible', '==', true).get()).docs.map(d => ({ id: d.id, ...d.data() })).filter(b => !b.isArchived).sort((a, b) => (a.deliveryStart || 0) - (b.deliveryStart || 0));
  } catch (e) { console.error('load failed', e.code || e.message); $('load-err').classList.remove('hidden'); return; }
  Object.keys(prices.zones || {}).forEach(z => { const o = document.createElement('option'); o.value = o.textContent = z; $('zone').append(o); });
  $('size-table').innerHTML = KEYS.filter(k => P[k].cat !== 'eggs').map(k => `<div class="flex justify-between py-2 font-bold"><span>${esc(P[k].name)}</span><span class="text-slate-500">${esc(P[k].weight)}</span></div>`).join('');
  $('zone-list').innerHTML = Object.entries(prices.zones || {}).map(([z, f]) => `<span class="bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl px-3 py-1.5 text-xs font-black">${esc(z)} - ${Number(f)} ج</span>`).join('');
  KEYS.forEach(k => { if (cart[k] > maxFor(k)) { cart[k] = maxFor(k); if (!cart[k]) delete cart[k]; } });
  renderGrid(); renderCart();
})();

function newToken() { const a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); }
$('order').onclick = async () => {
  $('err').textContent = '';
  const items = {}; KEYS.forEach(k => { if (qty(k) > 0) items[k] = qty(k); });
  if (!Object.keys(items).length) return $('err').textContent = 'اختر منتجاً';
  if (Object.values(items).reduce((a, b) => a + b, 0) > 50) return $('err').textContent = 'الحد الأقصى 50 قطعة في الطلب الواحد';
  if (!$('name').value.trim() || $('phone').value.replace(/\D/g, '').length < 8 || !$('address').value.trim()) return $('err').textContent = 'أكمل الاسم والموبايل والعنوان';
  const need = pairsOf(items), bid = $('batch').value;
  if (need && (!bid || $('batch').selectedOptions[0].disabled)) return $('err').textContent = 'اختر دفعة بها مكان كاف';
  $('order').disabled = true;
  const sref = db.collection('catalog').doc('stock'), oref = db.collection('orders').doc(), tok = newToken();
  try {
    await db.runTransaction(async tx => {
      const cur = (await tx.get(sref)).data(), p = (await tx.get(db.collection('catalog').doc('prices'))).data();
      for (const k in items) if (cur[k] < items[k]) throw new Error('OOS:' + P[k].name);
      const z = $('zone').value, sub = Object.keys(items).reduce((s, k) => s + items[k] * p[k], 0), fee = p.zones[z];
      let disc = 0, pcode = null;
      if (promo) { const pd = await tx.get(db.collection('promos').doc(promo.code)); if (!pd.exists || pd.data().active !== true) throw new Error('PROMO'); pcode = promo.code; disc = Math.floor(sub * pd.data().percent / 100); }
      const order = { name: $('name').value.trim(), phone: $('phone').value.trim(), address: $('address').value.trim(), items, subtotal: sub, deliveryFee: fee, total: sub - disc + fee, status: 'new', createdAtMs: Date.now(), zone: z, trackingToken: tok };
      if (pcode && disc > 0) { order.promoCode = pcode; order.discount = disc; }
      if ($('notes').value.trim()) order.notes = $('notes').value.trim();
      let bref = null;
      if (need) { bref = db.collection('batches').doc(bid); const b = (await tx.get(bref)).data(); if (!b || !b.isOpen || !b.isVisible || b.isArchived || Number(b.bookedPairs || 0) + need > Number(b.ceilingPairs)) throw new Error('FULL'); order.batchId = bid; order._b = Number(b.bookedPairs || 0) + need; }
      const bookedNew = order._b; delete order._b;
      const next = {}; KEYS.forEach(k => next[k] = cur[k] - (items[k] || 0));
      tx.set(oref, order); tx.set(db.collection('tracking').doc(tok), { orderId: oref.id, status: 'new', updatedAtMs: Date.now() }); tx.update(sref, { ...next, lastOrderId: oref.id });
      if (bref) tx.update(bref, { bookedPairs: bookedNew, lastOrderId: oref.id });
    });
    localStorage.setItem('sman_last_track', tok); cart = {}; save();
    location.href = 'track.html?t=' + tok;
  } catch (e) { $('err').textContent = String(e.message).startsWith('OOS:') ? 'نفد: ' + e.message.slice(4) : e.message === 'PROMO' ? 'كود الخصم لم يعد صالحاً، احذفه وحاول مرة أخرى' : e.message === 'FULL' ? 'الدفعة المختارة امتلأت، اختر دفعة أخرى' : 'تعذر إرسال الطلب، حاول مرة أخرى'; $('order').disabled = false; }
};
