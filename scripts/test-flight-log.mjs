import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { window: {}, document: {}, URL, Date, Blob, setTimeout };
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../site/assets/js/boarding-flight-log.js', import.meta.url), 'utf8'), context);
const { ordinalToISO, isDuplicate } = context.window.HappyEarthFlightLog;

assert.equal(ordinalToISO(60, 2024), '2024-02-29');
assert.equal(ordinalToISO(60, 2025), '2025-03-01');
assert.equal(ordinalToISO(366, 2025), '');
assert.equal(ordinalToISO(366, 2024), '2024-12-31');

const existing=[['2024年04月27日(週六) ','','TPE','','','KIX','','','China Airlines','CI 156']];
const same=['2024年04月27日(週六) ','','TPE','','','KIX','','','CI','CI156'];
const other=['2024年04月27日(週六) ','','TPE','','','KIX','','','CI','CI157'];
assert.equal(isDuplicate(existing,same),true);
assert.equal(isDuplicate(existing,other),false);
console.log('Flight log date and duplicate checks passed.');
