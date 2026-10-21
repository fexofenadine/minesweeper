const CACHE = 'minesweeper'

self.addEventListener('install', () => self.skipWaiting())

//drop caches left by older workers, and reload open tabs they were serving stale files to
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

//network first so updates show straight away, cache only as an offline fallback
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
