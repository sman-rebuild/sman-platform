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
| Kitchen admin login, create and publish recipe, public recipe page, customer feedback submit, admin approve, feedback shown publicly | PASS |
| Customer rating from tracking page, CRM ratings radar, publish to reviews wall, public wall shows it | PASS (see quirk below) |
| Driver cash remit (shift close) | PASS |
| CRM dashboard after delivery (net 210, delivered 1, pending 100) | PASS |
| CRM customers archive (customer, spend 225, zone) | PASS |
| Promo code created in CRM, applied in store cart (-10) ; store FAQ | PASS |
| CRM tabs batches, radar, reconciliation, customers, notes, debts, blacklist, inventory, settings, kitchen, archive, trash: open with no JS errors | PASS (load only) |
| Service worker registers under /crm/ | PASS (registration only) |
| Anonymous sign-in | NOT ENABLED (auth/admin-restricted-operation). Email login and all flows above work without it |
| Waybill printing, live-connect, kitchen-crm editing, the 50-recipe JSON import (file not in repo) | NOT TESTED |
| WhatsApp bot, Google Sheet sync, ImgBB upload, physical printer | NOT AVAILABLE (paid / external keys / hardware) |
| Android APK of the CRM | NOT BUILT |

Quirk: on a first-ever visit, reviews.html shows an empty wall if Firestore takes over 2 s (the original code falls back to an empty cache). Next visits show the review. This is original behavior.
Rules fix 21:56: public kitchen feedback read allowed only for approved items (my first rules blocked it).
