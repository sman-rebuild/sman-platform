# Verification log (sman-original test copy, synthetic data only)
Tested 24 Nov 2026 against https://sman-rebuild.github.io/sman-platform/ with Firestore project sman-original.
PASS = ran end to end in a real browser. NOT TESTED = not yet run. This is not a claim of full parity.

| Area | Result |
|---|---|
| Store loads, products, batch pick-up from CRM | PASS |
| Store order (2 items, delivery fee, success modal) | PASS |
| Tracking by phone (new, then "delivered" status) | PASS |
| CRM login (Firebase email/password) | PASS |
| CRM create batch | PASS |
| CRM live orders, status to preparing, dispatch to driver | PASS |
| CRM add driver in settings | PASS |
| Driver app: wrong PIN rejected, right PIN, sees order, marks delivered, cash wallet 225 / commission 15 / net 210 | PASS |
| Kitchen public, reviews page, store extras: load with no page errors | PASS (load only) |
| Kitchen admin, recipes, feedback, review publishing, promo/wallet/FAQ, customers, dashboard totals after delivery, cash remit, waybill, live-connect, kitchen-crm | NOT TESTED |
| WhatsApp bot, Google Sheet sync, ImgBB upload, physical printer | NOT AVAILABLE (paid / external keys / hardware) |
| Android APK of the CRM | NOT BUILT |
