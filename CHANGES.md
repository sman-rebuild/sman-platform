# Test copy of the original system (project sman-original)
Changes from the original source (everything else is byte-identical):
1. Firebase config swapped from the live project to sman-original (js/config.js, driver.html, crm/index.html).
2. Links to smanhhya.github.io swapped to this copy's address (store share text, CRM links).
3. CRM = the CRM web app from the user's CRM ZIP (www/), hosted at /crm/. printer.html and whatsapp.html under /crm/extra/.
Not included: whatsapp bot (needs a paid Meta API token), signing key, original data.
Firestore rules are open test-mode rules (not the original's, which are not in the repo).
