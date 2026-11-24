// Replace with the real project's web config when a backend is chosen.
// Local default: emulator, demo project, no real keys.
window.SMAN = {
  firebase: { apiKey: 'demo-key', authDomain: 'demo-sman-rebuild.firebaseapp.com', projectId: 'demo-sman-rebuild', appId: '1:0:web:0' },
  emulator: { host: location.hostname, firestore: 8181, auth: 9199 }, // set to null for a real project
  courierEmailDomain: 'courier.sman.invalid'
};
firebase.initializeApp(SMAN.firebase);
window.db = firebase.firestore(); window.auth = firebase.auth();
if (SMAN.emulator) { db.useEmulator(SMAN.emulator.host, SMAN.emulator.firestore); auth.useEmulator('http://' + SMAN.emulator.host + ':' + SMAN.emulator.auth); }
