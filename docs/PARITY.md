# Parity checklist against the original (smanhhya/smanhhya.github.io)

Status values: DONE = built and covered by an automated test in this repo. PARTIAL = a reduced version exists. NOT PORTED = nothing exists yet.
Nothing here is marked verified-equivalent. Each row names the original source so it can be compared line by line. "Tested" means the local emulator suites (rules 71, store/CRM/courier e2e 30, courier e2e 12). No test has run on a real phone.
Original size: index.html 973 lines, js/app.js 4437, js/admin.js 1119, driver.html 1060, track.html 2073, reviews.html 583, kitchen/ 2880, bot.js, sw.js, manifest.json.

## Customer store (index.html, js/app.js)
| Feature | Original | Status |
|---|---|---|
| Product grid, filters, cart, localStorage cart | app.js saveCart/loadCart, buildAppGridProductCard | PARTIAL (5 fixed products, stand-in names/prices, no admin-editable products) |
| Live prices and stock from the database | listenToDatabase | PARTIAL (read once on load, no live listener) |
| Place order with server-side validation | order submit ~L3436 | DONE (rules validate totals, stock, zone, batch) |
| Delivery zones and fees | renderDeliveryZones, renderQuickZoneChips | PARTIAL (dropdown from catalog/prices; no quick chips; no admin zone editor) |
| Batches (slaughter rounds): pick batch, capacity ceiling | renderBatchesSelection, getBatchRemainingCeilingPairs | PARTIAL (open/visible/ceiling/bookedPairs only; no per-track quail vs chicks, no smart date window or notes) |
| Weighted birds (pick by weight) and pre-book holds | buildWeightProductCard, startWeightHoldsLiveListener | NOT PORTED |
| Chicks product track | getProductTrackType | NOT PORTED |
| Per-batch stock and booked per product | getPureAvailableStock | NOT PORTED |
| Promo codes | promoCodes in settings, applied in cart | NOT PORTED |
| Loyalty points, rewards, gift promo after order | showOrderSuccessModal rewardHtml | NOT PORTED |
| Returning customer banner, wallet lookup by phone, saved profile | initReturningCustomerWelcome, checkCustomerWalletSafe | NOT PORTED (cart only) |
| Reorder last order | getCachedLastOrderItems | NOT PORTED |
| In-cart add-ons (suggest eggs) | renderInCartQuickAddons | NOT PORTED |
| Order success modal with smart delivery schedule | showOrderSuccessModal, buildSmartDeliverySchedule | PARTIAL (redirects to tracking page; no schedule text) |
| WhatsApp order message and floating WhatsApp button | buildSmartOrderWhatsAppMessage, js/floating-wa.js | NOT PORTED |
| Size comparison, size guide gallery, lightbox, stories | renderQuailSizeComparison, renderLightboxFrame, renderStoryContent | PARTIAL (size list only) |
| Feast/occasion calculator | calculators in index.html | NOT PORTED |
| Announcements, trust badges, storefront builder blocks | applyStorefrontBuilderConfig | NOT PORTED |
| Cooking tips per product | getCookingTipForProduct | NOT PORTED |
| Live purchase notifications ("someone just ordered") | startLiveNotifications | NOT PORTED |
| Theme manager | js/theme-manager.js | NOT PORTED |
| PWA install and offline (manifest.json, sw.js) | manifest.json, sw.js | NOT PORTED |

## Order tracking (track.html)
| Feature | Status |
|---|---|
| Look up order by secret link | DONE (token link, tested) |
| Look up by phone number, multiple orders tabs | NOT PORTED (by design: phone lookup would expose customer data; needs a different safe design) |
| Status timeline | PARTIAL (status text only) |
| Customer edits order items before dispatch (loadProductsForEdit) | NOT PORTED |
| Honest driver ETA, progress, batch tracking box | NOT PORTED |
| Rating/feedback after delivery | NOT PORTED |
| Kitchen bridge (recipes link) | NOT PORTED |

## Reviews (reviews.html)
| Public reviews page with zone filters and stats | NOT PORTED |

## Admin (index.html admin dialog, js/admin.js)
| Feature | Original | Status |
|---|---|---|
| Admin login | PIN dialog (verifyAdminPin, client-side) | DONE, replaced by real email login (intentional security change) |
| Orders list, status updates, notes | renderOrdersList, updateOrderStatus, addOrderNote | PARTIAL (list, assign courier, cancel; no notes, no search/filter, no edit) |
| Cancel restores stock | updateOrderStatus | DONE (also restores batch capacity) |
| Customers list with history | - | DONE (basic) |
| Cash reconciliation of couriers | - | DONE |
| Courier accounts | renderAdminDrivers (PIN stored readable) | DONE (real accounts, 6+ char password) |
| Product management (add, delete, reorder, images) | renderAdminProducts, moveProduct | NOT PORTED (prices and stock only) |
| Zones editor | renderAdminZones | NOT PORTED |
| Promo codes editor | renderAdminPromos | NOT PORTED |
| Batches | - | PARTIAL (create, open/close, show/hide, archive) |
| Gallery tab, texts, UI settings | renderGalleryTabUI, applyUITexts | NOT PORTED |
| Stats and top products | renderTopProductsStats | NOT PORTED |
| Export orders CSV | exportOrdersToCSV | NOT PORTED |
| Message customer / rating request via WhatsApp | sendMessageToCustomer, sendRatingRequest | NOT PORTED |
| Dispatch several orders to a courier, bulk WhatsApp links | sendDispatchToDriver, generateBulkWhatsAppLinks | NOT PORTED (single order assign only) |
| Delete all orders / reset stats | deleteAllOrders, resetStatsOnly | NOT PORTED (deletion is blocked by rules on purpose) |
| Order archive | - | NOT PORTED |

## Courier app (driver.html)
| Login by phone + PIN | DONE (real account; PIN replaced by password) |
| List of assigned orders, deliver, no answer | DONE |
| Report problem note | DONE |
| Cash handoff report, admin confirms | DONE |
| Voice note input (SpeechRecognition) | NOT PORTED |
| Greeting, quotes, tabs by status, ETA | PARTIAL |
| Waybill / Bluetooth thermal printing (TSPL) | NOT PORTED (needs a real printer and device to test) |
| Open customer location / call buttons | to verify |

## Kitchen (kitchen/, 2880 lines)
| Public recipes site and admin editor, ratings | NOT PORTED |

## Backend extras
| WhatsApp bot (bot.js, GitHub Action) sending messages from orders | NOT PORTED (needs paid Meta API token; cannot be free) |
| Google Sheet sync, ImgBB image upload | NOT PORTED (ImgBB needs an external key; replace with Firebase Storage which needs the paid plan, so images stay bundled) |
