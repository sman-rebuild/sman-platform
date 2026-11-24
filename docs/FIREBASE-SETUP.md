# Connecting a free Firebase (Spark) project

Takes about 10 minutes. No card is needed on the Spark plan. Do not enable Blaze.

1. Sign in at console.firebase.google.com with the chosen Google account.
2. Add project, name it (for example `sman-rebuild`). Turn Google Analytics off.
3. Build > Authentication > Get started. Enable the Email/Password provider.
4. Build > Firestore Database > Create database. Choose production mode and a region near Cairo (for example `europe-west1`).
5. Project settings > Your apps > add a Web app. Copy the `firebaseConfig` values.
6. Paste them into `apps/shared/config.js` (replace the `firebase:` object). The red "not connected" banner disappears once `apiKey` is no longer `demo-key`.
7. Firestore > Rules: paste the contents of `firestore.rules` and publish.
8. Authentication > Users > Add user (admin email + strong password). Copy its UID. In Firestore (console, which bypasses rules) create document `staff/<UID>` with fields `role: "admin"`, `active: true`, `name: "..."`. This one document is the only manual bootstrap; couriers are then added from the CRM.
9. Rebuild both APKs (`mobile/*`, `scripts/prepare-www.mjs`, then Gradle assembleDebug).
10. Free limits (Spark): 1 GiB stored, 20K writes/day, 10 GiB/month egress. Over quota, writes stop; nothing is billed.

Never share the account password in chat. A vault link is used for secrets.
