// Offline-Speicher für die Wurftechnik-Analyse (Halle ohne Netz): Seite, Anmeldung/Cloud-Skript, Logo, Erkennungsmodell.
// Die Daten selbst hält cloud.js als Offline-Kopie und überträgt sie beim nächsten Netz.
const CACHE = 'mtv-wurftechnik-v1';
const FILES = [
  'index.html', '../shared/cloud.js', '../logo_mtv_schwarmstedt.jpg',
  'lib/jspdf.umd.min.js',
  'lib/mediapipe-pose/pose.js', 'lib/mediapipe-pose/pose_web.binarypb',
  'lib/mediapipe-pose/pose_solution_packed_assets.data', 'lib/mediapipe-pose/pose_solution_packed_assets_loader.js',
  'lib/mediapipe-pose/pose_solution_simd_wasm_bin.js', 'lib/mediapipe-pose/pose_solution_simd_wasm_bin.wasm',
  'lib/mediapipe-pose/pose_solution_wasm_bin.js', 'lib/mediapipe-pose/pose_solution_wasm_bin.wasm',
  'lib/mediapipe-pose/pose_landmark_lite.tflite', 'lib/mediapipe-pose/pose_landmark_full.tflite'
];
const PFAD = {};   // absoluter Pfad -> Eintrag in FILES
for (const f of FILES) PFAD[new URL(f, self.location).pathname] = f;
const ORDNER = new URL('./', self.location).pathname;
const netzZuerst = (f) => f.endsWith('.html') || f.endsWith('.js') && !f.startsWith('lib/');

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const f of FILES) {
      if (await c.match(f)) continue;
      const r = await fetch(f, { cache: 'no-cache' });
      if (!r.ok) throw new Error('fehlt: ' + f);
      await c.put(f, r);
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k.startsWith('mtv-wurftechnik-')) await caches.delete(k);
    await self.clients.claim();
  })());
});
async function ausNetzOderSpeicher(f, url) {
  const c = await caches.open(CACHE);
  const netz = fetch(url.pathname + url.search, { cache: 'no-store' }).then((r) => { if (r.ok) c.put(f, r.clone()); return r; });
  try { const r = await Promise.race([netz, new Promise((ok) => setTimeout(ok, 3500))]); if (r && r.ok) return r; } catch (err) {}
  const alt = await c.match(f);
  return alt || netz;
}
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  let p = url.pathname; if (p === ORDNER) p += 'index.html';
  const f = PFAD[p]; if (!f) return;
  if (netzZuerst(f)) e.respondWith(ausNetzOderSpeicher(f, url));
  else e.respondWith(caches.match(f).then((r) => r || fetch(e.request)));
});
self.addEventListener('message', (e) => {
  if (e.data === 'status' && e.ports[0]) {
    caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => c.match(f)))).then((rs) => {
      const n = rs.filter(Boolean).length;
      e.ports[0].postMessage({ ok: n === FILES.length, n, total: FILES.length });
    });
  }
});
