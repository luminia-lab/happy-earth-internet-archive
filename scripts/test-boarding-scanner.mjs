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
assert.ok(page.includes('boarding-image-recovery.js'));
assert.ok(!page.includes('\\\\n<script'), 'HTML must not contain literal backslash-n between scripts');

const recoveryJs = await readFile(join(root,'site/assets/js/boarding-image-recovery.js'),'utf8');
assert.match(recoveryJs, /裁切/);
assert.match(recoveryJs, /旋轉/);
assert.match(recoveryJs, /提高對比/);
const vm = await import('node:vm');
const simulated = {
  document: { createElement: () => ({
    width:0,height:0,
    getContext: () => ({
      fillRect(){}, translate(){}, rotate(){}, drawImage(){},
      getImageData: () => ({data:new Uint8ClampedArray(4),width:1,height:1})
    })
  })},
  createImageBitmap: async () => ({width:800,height:1200,close(){}}),
  setTimeout,
  Uint8ClampedArray
};
simulated.window=simulated;
vm.runInNewContext(recoveryJs,simulated);
let calls=0;
const report=await simulated.BoardingImageRecovery.scanImage(
 {type:'image/png'},
 async (_image, options) => {
   calls++;
   if(calls===3) return [{text:'M1TEST/USER          EABC123 TPEAUHEY 0021 283J001A0001 300',format:'PDF417',isValid:true}];
   return [];
 },()=>{},()=>false
);
assert.ok(calls>=3, 'Rescue must retry more than once');
assert.equal(report.results.length,1);
assert.equal(report.results[0].format,'PDF417');
let falseCalls=0;
const invalid=await simulated.BoardingImageRecovery.scanImage(
 {type:'image/png'}, async () => {
   falseCalls++;
   return [{text:'CORRUPTED',format:'QRCode',isValid:false}];
 },()=>{},()=>false
);
assert.equal(invalid.results.length,0, 'Invalid barcode may not be reported as valid');
assert.ok(falseCalls>8,'Failed scan must try crops and angle correction');


const code = await readFile(join(root,'site/assets/js/boarding-image-recovery.js'),'utf8');
assert.ok(code.includes('九宮格') && code.includes('小區域'), 'Multi-scale regions are mandatory');
assert.ok(!code.includes('Math.min(2, maxSide'), 'Do not reintroduce old photo-wide shrink limit');
assert.match(code,/imageSmoothingEnabled = false/);
const regions = simulated.BoardingImageRecovery.tiles(4,.32);
assert.equal(regions.length,16);
assert.ok(regions.every(([x,y,w,h]) => x>=0 && y>=0 && x+w<=1.00001 && y+h<=1.00001));
let staged=0;
const lastTile=await simulated.BoardingImageRecovery.scanImage(
 {type:'image/png'},
 async () => {
   staged++;
   return staged === 27 ? [{text:'M1TEST/USER         EABC123 TPEAUHEY 0021 283J001A0001 300',format:'PDF417',isValid:true}] : [];
 },()=>{},()=>false
);
assert.equal(lastTile.results.length,1,'Tiles should rescue off-center small barcodes');
assert.ok(staged>=27);

console.log('PASS scanner dependencies, sample BCBP, two-leg roundtrip, and multi-scale recovery');
