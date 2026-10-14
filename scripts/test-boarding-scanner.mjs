import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { decode, encode } = require('bcbp');
const root = resolve(import.meta.dirname, '..');
const sample = 'M1DESMARAIS/LUC       EABC123 YULFRAAC 0834 226F001A0025 100';
const parsed = decode(sample, 2020);
assert.equal(parsed.meta.numberOfLegs, 1);
assert.equal(parsed.data.passengerName, 'DESMARAIS/LUC');
assert.equal(parsed.data.legs[0].departureAirport, 'YUL');
assert.equal(parsed.data.legs[0].arrivalAirport, 'FRA');
assert.equal(parsed.data.legs[0].seatNumber, '001A');
const multi = encode({ data: {
  passengerName: 'TEST/USER',
  legs: [
    { operatingCarrierPNR: 'ABC123', departureAirport: 'TPE', arrivalAirport: 'AUH', operatingCarrierDesignator: 'EY', flightNumber: '0021', flightDate: new Date('2026-10-10T00:00:00.000Z'), compartmentCode: 'J', seatNumber: '001A', checkInSequenceNumber: '0001', passengerStatus: '3' },
    { operatingCarrierPNR: 'ABC123', departureAirport: 'AUH', arrivalAirport: 'BCN', operatingCarrierDesignator: 'EY', flightNumber: '0111', flightDate: new Date('2026-10-11T00:00:00.000Z'), compartmentCode: 'J', seatNumber: '002A', checkInSequenceNumber: '0002', passengerStatus: '3' }
  ]
} });
const roundtrip = decode(multi, 2026);
assert.equal(roundtrip.meta.numberOfLegs, 2);
assert.equal(roundtrip.data.legs[1].arrivalAirport, 'BCN');
for (const file of ['site/assets/vendor/zxing/reader.js','site/assets/vendor/zxing/zxing_reader.wasm','site/assets/vendor/bcbp/bcbp.js']) {
  assert.ok((await stat(join(root, file))).size > 0, file);
}
const page = await readFile(join(root,'site/tools/boarding-pass-scanner/index.html'),'utf8');
assert.match(page,/data-scanner/);
assert.match(page,/zxing\/reader\.js/);
assert.match(page,/bcbp\/bcbp\.js/);
console.log('PASS scanner dependencies, sample BCBP, and two-leg roundtrip');
