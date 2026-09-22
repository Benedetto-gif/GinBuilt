/* GinBuilder — service worker
 *
 * Cambia VERSIONE a ogni aggiornamento dei file: basta questo
 * per far scaricare al telefono la versione nuova.
 *
 * La pagina viene sempre chiesta prima alla rete e solo in sua
 * assenza alla cache, così un aggiornamento si vede subito e
 * l'app continua comunque a funzionare senza connessione.
 */

const VERSIONE = 'ginbuilder-v9';

const FILE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSIONE);
    // uno per uno: se un file manca, gli altri si salvano lo stesso
    await Promise.all(FILE.map(f => cache.add(f).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const chiavi = await caches.keys();
    await Promise.all(chiavi.filter(k => k !== VERSIONE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // La pagina: prima la rete, poi la cache.
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith((async () => {
      try {
        const risposta = await fetch(req);
        const cache = await caches.open(VERSIONE);
        cache.put('./index.html', risposta.clone());
        return risposta;
      } catch (err) {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Tutto il resto: prima la cache, poi la rete.
  e.respondWith((async () => {
    const salvato = await caches.match(req);
    if (salvato) return salvato;
    try {
      const risposta = await fetch(req);
      if (risposta && risposta.status === 200 && risposta.type === 'basic') {
        const cache = await caches.open(VERSIONE);
        cache.put(req, risposta.clone());
      }
      return risposta;
    } catch (err) {
      return Response.error();
    }
  })());
});
