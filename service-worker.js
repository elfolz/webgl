self.addEventListener('install', event => {
	self.skipWaiting()
})

self.addEventListener('fetch', event => {
	event.respondWith(caches.open('webgl').then(cache => {
		return cache.match(event.request)
		.then(cachedResponse => {
			const fetchedResponse = fetch(event.request)
			.then(networkResponse => {
				cache.put(event.request, networkResponse.clone())
				return networkResponse
			})
			return cachedResponse || fetchedResponse
		})
	}))
})