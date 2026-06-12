// Disables access to DOM typings like `HTMLElement` which are not available
// inside a service worker and instantiates the correct globals
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Ensures that the `$service-worker` import has proper type definitions
/// <reference types="@sveltejs/kit" />

// Only necessary if you have an import from `$env/static/public`
/// <reference types="../.svelte-kit/ambient.d.ts" />

import { build, files, version } from "$service-worker"

// This gives `self` the correct types
const self = globalThis.self as unknown as ServiceWorkerGlobalScope

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`

const ASSETS = [
    ...build, // the app itself
    ...files, // everything in `static`
    "/200.html", // SPA fallback
]

self.addEventListener("install", (event) => {
    self.skipWaiting()

    // Create a new cache and add all files to it
    async function addFilesToCache() {
        const cache = await caches.open(CACHE)
        await cache.addAll(ASSETS)
    }

    event.waitUntil(addFilesToCache())
})

self.addEventListener("activate", (event) => {
    // Ensure the service worker takes control of all clients immediately
    event.waitUntil(self.clients.claim())

    // Remove previous cached data from disk
    async function deleteOldCaches() {
        for (const key of await caches.keys()) {
            if (key !== CACHE) await caches.delete(key)
        }
    }

    event.waitUntil(deleteOldCaches())
})

self.addEventListener("fetch", (event) => {
    // ignore POST requests etc
    if (event.request.method !== "GET") return

    async function respond() {
        const url = new URL(event.request.url)
        const cache = await caches.open(CACHE)

        // `build`/`files` can always be served from the cache
        if (ASSETS.includes(url.pathname)) {
            const response = await cache.match(url.pathname)

            if (response) {
                return response
            }
        }

        // For SPA navigation requests, fallback to the 200.html shell immediately
        // to provide a fast "offline-first" experience.
        if (event.request.mode === "navigate") {
            const fallback = await cache.match("/200.html")
            if (fallback) {
                return fallback
            }
        }

        // for everything else, try the network first, but
        // fall back to the cache if we're offline
        try {
            const response = await fetch(event.request)

            // if we're offline, fetch can return a value that is not a Response
            // instead of throwing - and we can't pass this non-Response to respondWith
            if (!(response instanceof Response)) {
                throw new Error("invalid response from fetch")
            }

            if (
                response.status === 200 &&
                !response.headers.get("cache-control")?.includes("no-store") &&
                url.origin === self.location.origin &&
                !url.pathname.toLowerCase().endsWith(".pdf") // Don't cache large PDFs in Cache API
            ) {
                cache.put(event.request, response.clone())
            }

            return response
        } catch (err) {
            const response = await cache.match(event.request)

            if (response) {
                return response
            }

            // if there's no cache, then just error out
            // as there is nothing we can do to respond to this request
            throw err
        }
    }

    event.respondWith(respond())
})
