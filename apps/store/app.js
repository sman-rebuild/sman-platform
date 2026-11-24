const $ = id => document.getElementById(id);
const PRODUCTS = { super: 'سوبر', special: 'سبيشيال', superspecial: 'سوبر سبيشيال', eggs: 'بيض', jumbo: 'جامبو' };
let prices = null, stock = null;
const qty = k => Math.max(0, parseInt($('q-' + k).value, 10) || 0);
function totals() {
  if (!prices) return { sub: 0, fee: 0, tot: 0 };
  const sub = Object.keys(PRODUCTS).reduce((s, k) => s + qty(k) * prices[k], 0), fee = prices.zones[$('zone').value] ?? 0;
  return { sub, fee, tot: sub + fee };
}
function show() { const t = totals(); $('sub').textContent = t.sub; $('fee').textContent = t.fee; $('tot').textContent = t.tot; }
function token() { const a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); }
(async () => {
  [prices, stock] = (await Promise.all([db.collection('catalog').doc('prices').get(), db.collection('catalog').doc('stock').get()])).map(d => d.data());
  const box = $('products');
  Object.keys(PRODUCTS).forEach(k => { const r = document.createElement('div'); r.className = 'row';
    const s = document.createElement('span'); s.textContent = PRODUCTS[k] + ' - ' + prices[k] + ' ج' + (stock[k] <= 0 ? ' (نفد)' : ''); const i = document.createElement('input'); i.type = 'number'; i.min = 0; i.value = 0; i.id = 'q-' + k; i.disabled = stock[k] <= 0; i.oninput = show; r.append(s, i); box.append(r); });
  Object.keys(prices.zones).forEach(z => { const o = document.createElement('option'); o.value = o.textContent = z; $('zone').append(o); }); $('zone').onchange = show; show();
})();
$('order').onclick = async () => {
  $('err').textContent = '';
  const items = {}; Object.keys(PRODUCTS).forEach(k => { if (qty(k) > 0) items[k] = qty(k); });
  if (!Object.keys(items).length) return $('err').textContent = 'اختر منتجاً';
  if (!$('name').value.trim() || $('phone').value.replace(/\D/g, '').length < 8 || !$('address').value.trim()) return $('err').textContent = 'أكمل الاسم والموبايل والعنوان';
  $('order').disabled = true;
  const sref = db.collection('catalog').doc('stock'), oref = db.collection('orders').doc(), tok = token();
  try {
    await db.runTransaction(async tx => {
      const cur = (await tx.get(sref)).data(), p = (await tx.get(db.collection('catalog').doc('prices'))).data();
      for (const k in items) if (cur[k] < items[k]) throw new Error('OOS:' + PRODUCTS[k]);
      const sub = Object.keys(items).reduce((s, k) => s + items[k] * p[k], 0), fee = p.zones[$('zone').value];
      const order = { name: $('name').value.trim(), phone: $('phone').value.trim(), address: $('address').value.trim(), items, subtotal: sub, deliveryFee: fee, total: sub + fee, status: 'new', createdAtMs: Date.now(), zone: $('zone').value, trackingToken: tok };
      if ($('notes').value.trim()) order.notes = $('notes').value.trim();
      const next = {}; Object.keys(PRODUCTS).forEach(k => next[k] = cur[k] - (items[k] || 0));
      tx.set(oref, order); tx.set(db.collection('tracking').doc(tok), { orderId: oref.id, status: 'new', updatedAtMs: Date.now() }); tx.update(sref, { ...next, lastOrderId: oref.id });
    });
    location.href = 'track.html?t=' + tok;
  } catch (e) { $('err').textContent = String(e.message).startsWith('OOS:') ? 'نفد: ' + e.message.slice(4) : 'تعذر إرسال الطلب، حاول مرة أخرى'; $('order').disabled = false; }
};
