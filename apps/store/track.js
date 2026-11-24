const LABEL = { new: 'تم استلام طلبك', dispatched: 'في الطريق إليك', no_answer: 'حاول المندوب الوصول إليك', completed: 'تم التسليم' };
const token = new URLSearchParams(location.search).get('t') || '';
if (token.length < 20) document.getElementById('st').textContent = 'رابط غير صالح';
else db.collection('tracking').doc(token).onSnapshot(s => { document.getElementById('st').textContent = s.exists ? (LABEL[s.data().status] || s.data().status) : 'لم يتم العثور على الطلب'; }, () => { document.getElementById('st').textContent = 'تعذر التحميل'; });
