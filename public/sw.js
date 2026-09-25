const VERSION = "v7";
const SHELL_CACHE = `aptfindr-shell-${VERSION}`;
const RUNTIME_CACHE = `aptfindr-runtime-${VERSION}`;
const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest?v=7",
  "/icon.svg?v=7",
  "/aptFindr-logo-exact.svg?v=7",
];

async function cacheAppShell() {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(APP_SHELL);

  const indexResponse = await fetch("/index.html", { cache: "no-store" });
  if (!indexResponse.ok) return;
  const markup = await indexResponse.text();
  const buildAssets = [...markup.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
  const manifestResponse = await fetch("/.vite/manifest.json", { cache: "no-store" });
  if (manifestResponse.ok) {
    const buildManifest = await manifestResponse.json();
    const visitedEntries = new Set();
    const addEntry = (key) => {
      if (!key || visitedEntries.has(key) || !buildManifest[key]) return;
      visitedEntries.add(key);
      const entry = buildManifest[key];
      if (entry.file) buildAssets.push(`/${entry.file}`);
      for (const stylesheet of entry.css || []) buildAssets.push(`/${stylesheet}`);
      for (const asset of entry.assets || []) buildAssets.push(`/${asset}`);
      for (const dependency of entry.imports || []) addEntry(dependency);
    };
    addEntry("index.html");
    addEntry("src/main.jsx");
    addEntry("src/landing/Landing.jsx");
  }
  await cache.addAll([...new Set(buildAssets)]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("aptfindr-") && ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(SHELL_CACHE).then((cache) => cache.put("/index.html", response.clone()));
          return response;
        })
        .catch(async () => (await caches.match("/index.html")) || caches.match("/offline.html")),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || ["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok && (response.type === "basic" || response.type === "cors")) {
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
          .catch(() => cached || Response.error());
        return cached || network;
      }),
    );
  }
});
