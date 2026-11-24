// Builds www/ for one app: node scripts/prepare-www.mjs crm|courier
import { cpSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
const app = process.argv[2];
if (!['crm', 'courier'].includes(app)) { console.error('usage: prepare-www.mjs crm|courier'); process.exit(1); }
const out = `${app}/www`;
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
cpSync('../apps/shared', `${out}/shared`, { recursive: true });
cpSync(`../apps/${app}`, `${out}/${app}`, { recursive: true });
writeFileSync(`${out}/index.html`, `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${app}/index.html">`);
console.log('prepared', out);
