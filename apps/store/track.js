const LABEL = { canceled: 'تم إلغاء الطلب', new: 'تم استلام طلبك', dispatched: 'في الطريق إليك', no_answer: 'حاول المندوب الوصول إليك', completed: 'تم التسليم' };
const ICON = { new: 'fa-receipt', dispatched: 'fa-motorcycle', no_answer: 'fa-phone-slash', completed: 'fa-circle-check' };
const STEPS = [['new', 'استلمنا الطلب'], ['dispatched', 'في الطريق'], ['completed', 'تم التسليم']];
const token = new URLSearchParams(location.search).get('t') || '', st = document.getElementById('st');
function show(s) {
  st.textContent = LABEL[s] || s; document.getElementById('icon').innerHTML = '<i class="fa-solid ' + (ICON[s] || 'fa-receipt') + '"></i>';
  const idx = s === 'completed' ? 2 : s === 'new' ? 0 : 1, ol = document.getElementById('steps'); ol.replaceChildren();
  STEPS.forEach(([, t], i) => { const li = document.createElement('li'); li.textContent = t; li.className = i <= idx ? 'text-emerald-700' : ''; ol.append(li); });
}
if (token.length < 20) st.textContent = 'رابط غير صالح';
else db.collection('tracking').doc(token).onSnapshot(s => { if (s.exists) show(s.data().status); else st.textContent = 'لم يتم العثور على الطلب'; }, () => { st.textContent = 'تعذر التحميل'; });
