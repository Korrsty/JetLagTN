const CACHE="bonus-cards-v3",TILES="bonus-tiles-v1",MAX_TILES=800;
const FILES=["./","./index.html","./manifest.json","./icon-192.png","./icon-512.png","./icon-maskable-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE&&n!==TILES).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});

// Map tiles: remember the ones you've looked at so the map still works with a weak signal or offline.
async function tile(url){
  const c=await caches.open(TILES),hit=await c.match(url);
  if(hit)return hit;
  try{
    const res=await fetch(url,{mode:"cors"});
    if(res.ok){c.put(url,res.clone());trim(c)}
    return res;
  }catch(_){return new Response("",{status:504})}
}
async function trim(c){const k=await c.keys();if(k.length>MAX_TILES)await Promise.all(k.slice(0,k.length-MAX_TILES).map(x=>c.delete(x)))}

// App files: network first (so updates show up when online), cache as the offline fallback.
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url);
  if(u.hostname==="tile.openstreetmap.org"){e.respondWith(tile(e.request.url));return}
  if(u.origin!==location.origin)return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),3000);
      const res=await fetch(e.request,{signal:ctrl.signal,cache:"no-store"});
      clearTimeout(t);
      if(res.ok)cache.put(e.request,res.clone());
      return res;
    }catch(_){
      return (await cache.match(e.request,{ignoreSearch:true}))||(await cache.match("./index.html"));
    }
  })());
});
