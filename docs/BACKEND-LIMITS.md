# Backend constraints (no billing, no Cloud Functions)

Status: local emulator only. Nothing here is production ready.

- Pricing, stock and state changes are enforced in Firestore rules because trusted server code (Cloud Functions) needs a paid plan.
- Product keys are fixed in the rules (super, special, superspecial, eggs, jumbo). Adding a product means editing rules.
- Stock lives in one document (catalog/stock). Firestore documents sustain about one write per second, so bursts of simultaneous orders can fail and need a retry.
- Anonymous customers can still spam valid orders. Rate limiting or App Check is not set up.
- Tracking uses a secret token as the document id and a sanitized record (status only).
- Cash: the courier only reports a handoff (handoffReported). The admin confirms receipt (isSupplied / isReconciled). The old driver app let the courier set isSupplied itself.
- Courier passwords must be 6+ characters (Firebase Auth), so the old 4-digit PIN cannot be reused as is. Admin must create courier accounts (the admin screen does not exist yet).
- Free quotas (Spark): 1 GiB stored, 20K writes/day, 10 GiB/month egress (firebase.google.com/pricing). One order costs about 3 writes (order, tracking, stock) plus status updates.
