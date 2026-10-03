const CACHE='codekids-v1';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(clients.claim()); });
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
