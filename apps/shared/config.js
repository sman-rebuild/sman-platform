// Backend settings. Replace `firebase` with the real project's web config when a backend is chosen.
// The local emulator is used only when served over plain http from localhost (tests), never inside the app.
window.SMAN = {
  firebase: { apiKey: 'demo-key', authDomain: 'demo-sman-rebuild.firebaseapp.com', projectId: 'demo-sman-rebuild', appId: '1:0:web:0' },
  emulator: (location.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(location.hostname)) ? { host: location.hostname, firestore: 8181, auth: 9199 } : null,
  courierEmailDomain: 'courier.sman.invalid'
};
SMAN.configured = !!SMAN.emulator || SMAN.firebase.apiKey !== 'demo-key';
firebase.initializeApp(SMAN.firebase);
window.db = firebase.firestore(); window.auth = firebase.auth();
if (SMAN.emulator) { db.useEmulator(SMAN.emulator.host, SMAN.emulator.firestore); auth.useEmulator('http://' + SMAN.emulator.host + ':' + SMAN.emulator.auth); }
if (!SMAN.configured) {
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.createElement('div');
    b.textContent = 'التطبيق غير مربوط بقاعدة بيانات بعد. لن يعمل تسجيل الدخول أو الطلبات حتى يتم الربط.';
    b.style.cssText = 'background:#b91c1c;color:#fff;padding:10px;text-align:center;font:700 13px Cairo,sans-serif;position:sticky;top:0;z-index:9999';
    document.body.prepend(b);
  });
}
