const CACHE = 'minesweeper'

self.addEventListener('install', () => self.skipWaiting())

//drop older caches and reload tabs they served
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      const stale = keys.filter((key) => key !== CACHE)
      await Promise.all(stale.map((key) => caches.delete(key)))
      await self.clients.claim()
      if (!stale.length) return
      const tabs = await self.clients.matchAll({ type: 'window' })
      tabs.forEach((tab) => tab.navigate(tab.url))
    }),
  )
})

//network first, cache only for offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return
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
