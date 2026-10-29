//one worker for every game, each registers it with its own folder as scope
const CACHE = self.registration.scope
//the worker before the games moved into folders, cached under one name at the root
const LEGACY = 'minesweeper'
const root = self.registration.scope === new URL('./', self.location).href

self.addEventListener('install', () => self.skipWaiting())

//drop the old cache, retire the old root registration and reload tabs they served
//other caches on the host belong to other sites or games, so they are left alone
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const stale = await caches.delete(LEGACY)
      if (root) await self.registration.unregister()
      else await self.clients.claim()
      if (!stale && !root) return
      const tabs = await self.clients.matchAll({ type: 'window' })
      tabs.forEach((tab) => tab.navigate(tab.url))
    })(),
  )
})

//network first, cache only for offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (root || request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copy))
        return response
      })
      .catch(() => caches.match(request)),
  )
})
