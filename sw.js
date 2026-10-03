const CACHE='codekids-v4';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>clients.claim())
  );
});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.open(CACHE).then(async c=>{
    try{
      const r=await fetch(e.request);
      if(e.request.method==='GET' && r.ok) c.put(e.request, r.clone());
      return r;
    }catch(err){
      const m=await c.match(e.request);
      return m || c.match('./index.html');
    }
  }));
});
