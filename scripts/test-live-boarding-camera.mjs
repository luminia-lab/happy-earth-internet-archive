import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const load=path=>readFileSync(join(root,path),'utf8');
const page=load('site/tools/live-boarding-scanner/index.html');
const js=load('site/assets/js/boarding-live-camera.js');
assert.doesNotThrow(()=>new Function(js),'camera JS must parse');
for(const item of [
  'data-live-scanner','data-live-video','data-live-start',
  'data-live-stop','data-live-retry','data-live-deep','data-live-status','data-live-result'
]) assert.ok(page.includes(item),item);
for(const resource of [
  'site/assets/js/boarding-live-camera.js',
  'site/assets/css/boarding-live-camera.css',
  'site/assets/js/boarding-image-recovery.js',
  'site/assets/js/boarding-bcbp-parser.js'
]) assert.ok(existsSync(join(root,resource)),resource);
assert.ok(page.includes('name="robots" content="noindex,nofollow"'));
assert.ok(page.includes('boarding-scanner.js'),'existing photo scanner retained');
assert.ok(js.includes('getUserMedia'),'live camera required');
assert.ok(js.includes('BoardingImageRecovery.scanImage'),'fallback must reuse recovery');
assert.ok(js.includes('kind===\'boarding-pass\''),'only true boarding pass can trigger success');
assert.ok(js.includes('getTracks())track.stop()'),'must stop camera tracks');
assert.ok(js.includes('visibilitychange'),'camera must stop on hidden page');
assert.ok(!/https:\/\/sheets\.googleapis\.com|localStorage|sessionStorage|sendBeacon|XMLHttpRequest/.test(js),'no persistence/sync in prototype');
console.log('Live camera prototype static checks passed.');
