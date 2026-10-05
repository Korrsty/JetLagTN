const CACHE="bonus-cards-v2";
const FILES=["./","./index.html","./manifest.json","./icon-192.png","./icon-512.png","./icon-maskable-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
// Network first (so updates show up when online), cache as the offline fallback.
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),3000);
      const res=await fetch(e.request,{signal:ctrl.signal,cache:"no-store"});
      clearTimeout(t);
      if(res.ok&&new URL(e.request.url).origin===location.origin)cache.put(e.request,res.clone());
      return res;
    }catch(_){
      return (await cache.match(e.request,{ignoreSearch:true}))||(await cache.match("./index.html"));
    }
  })());
});
