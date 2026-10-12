(function(){
  var out=document.getElementById("out");
  function line(t,c){var d=document.createElement("div");d.className=c||"";d.textContent=t;out.appendChild(d)}
  function ver(t){var m=/window\.BUILD="([^"]+)"/.exec(t||"");return m?m[1]:null}
  line("This page's own script: running","ok");
  line("Inline scripts (what the app uses): "+(window.__inline?"running":"BLOCKED by your website host. This is why the app does nothing."),window.__inline?"ok":"bad");
  line("Address: "+location.href);
  line("Secure (https): "+window.isSecureContext+" | online: "+navigator.onLine);
  line("Browser: "+navigator.userAgent);
  line("Screen: "+screen.width+"x"+screen.height+" | window: "+innerWidth+"x"+innerHeight);
  try{localStorage.setItem("chk","1");localStorage.removeItem("chk");line("Saved data on this phone: works","ok")}
  catch(e){line("Saved data on this phone: BLOCKED ("+e.name+")","bad")}
  try{var g=JSON.parse(localStorage.getItem("bc_game_v1"));line("Saved game: "+(g?("hand "+g.hand.length+" cards, deck "+g.deck.length):"none yet"))}
  catch(e){line("Saved game: unreadable","bad")}

  var netVer=null,cachedVer=null;
  function finish(){
    if(!window.__inline){line("VERDICT: your website host blocks the app's code (inline scripts), so the app cannot run there. Tell me which host you use (GitHub Pages, Netlify, Cloudflare, ...).","bad");return}
    if(netVer&&cachedVer&&netVer!==cachedVer)line("VERDICT: the phone is holding an OLD copy of the app (version "+cachedVer+") but your website has version "+netVer+". Tap Repair app files below.","bad");
    else if(netVer&&(cachedVer===null||cachedVer===netVer))line("VERDICT: the phone and website have the same version ("+netVer+").","ok");
    else if(!netVer)line("VERDICT: the website's index.html has no version line. It is probably an old file, or the host changed it.","bad");
  }
  var pending=3;function done(){if(--pending===0)finish()}

  // 1) what the website really serves
  fetch("index.html",{cache:"no-store"}).then(function(r){return r.text().then(function(t){return {s:r.status,t:t}})}).then(function(x){
    netVer=ver(x.t);
    line("index.html from the website: status "+x.s+", "+Math.round(x.t.length/1024)+" KB, version "+(netVer||"NONE"),netVer?"ok":"bad");
    line("  has the Play as hider button: "+(x.t.indexOf('id="goHider"')>=0?"yes":"NO"),x.t.indexOf('id="goHider"')>=0?"ok":"bad");
    line("  has the app code: "+(x.t.indexOf("function show(id)")>=0?"yes":"NO (the file was changed)"),x.t.indexOf("function show(id)")>=0?"ok":"bad");
    line("  has Content-Security-Policy: "+(/Content-Security-Policy/i.test(x.t)?"yes (in the page)":"not in the page"));
  }).catch(function(e){line("Could not fetch index.html: "+e,"bad")}).then(done);

  // 2) service worker + the copy it keeps
  (navigator.serviceWorker?navigator.serviceWorker.getRegistrations():Promise.resolve([])).then(function(rs){
    line("Service worker: "+(rs.length?rs.map(function(r){return (r.active?"active":"not active")+" ("+r.scope+")"}).join(", "):"none"));
    line("This page is controlled by it: "+(navigator.serviceWorker&&navigator.serviceWorker.controller?"yes":"no"));
  }).catch(function(){line("Service worker: unavailable")}).then(function(){
    if(!window.caches){line("Cache storage: unavailable");return}
    return caches.keys().then(function(ks){
      line("Saved app files: "+(ks.join(", ")||"none"));
      return Promise.all(ks.filter(function(k){return k.indexOf("tiles")<0}).map(function(k){
        return caches.open(k).then(function(c){return c.keys().then(function(reqs){
          var r=reqs.filter(function(q){return /\/(index\.html)?$/.test(new URL(q.url).pathname)&&new URL(q.url).search===""})[0];
          if(!r)return;return c.match(r).then(function(res){return res.text()}).then(function(t){cachedVer=ver(t);line("Copy kept by the phone ("+k+"): version "+(cachedVer||"NONE"),cachedVer?"ok":"warn")})
        })})
      }));
    });
  }).catch(function(e){line("Cache check failed: "+e)}).then(done);

  // 3) run the real app in a hidden frame and press its buttons
  setTimeout(function(){
    var f=document.createElement("iframe");f.src="index.html?check="+Date.now();
    f.style.cssText="position:absolute;left:-9999px;width:390px;height:800px;border:0";document.body.appendChild(f);
    f.onload=function(){setTimeout(function(){
      try{
        var d=f.contentDocument,w=f.contentWindow;
        line("App in a test frame: version line shows \""+((d.getElementById("ver")||{}).textContent||"none")+"\"");
        line("  app code started: "+(w.__mainReady?"yes":"NO"),w.__mainReady?"ok":"bad");
        var steps=w.__steps||[],exp=w.__expected||[];
        var miss=exp.filter(function(n){return steps.indexOf(n)<0});
        line("  app parts that ran: "+steps.length+" of "+exp.length+(miss.length?"  | NOT run: "+miss.join(", "):""),miss.length?"bad":"ok");
        if(w.__errs&&w.__errs.length)line("  errors reported by the app: "+w.__errs.join("  ||  ").slice(0,400),"bad");
        var eb=d.getElementById("errbar");if(eb)line("  app error message: "+eb.textContent.replace(/\s+/g," ").slice(0,160),"bad");
        d.getElementById("goHider").click();var h=!d.getElementById("game").hidden;
        line("  Play as hider button: "+(h?"WORKS":"DOES NOTHING"),h?"ok":"bad");
        d.getElementById("goHome").click();
        d.getElementById("goSeeker").click();var s2=!d.getElementById("seeker").hidden;
        line("  Play as seeker button: "+(s2?"WORKS":"DOES NOTHING"),s2?"ok":"bad");
      }catch(e){line("App test frame failed: "+e,"bad")}
      done();
    },1800)};
  },300);

  document.getElementById("repair").onclick=function(){
    var jobs=[];
    if(navigator.serviceWorker)jobs.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister()}))}));
    if(window.caches)jobs.push(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf("tiles")<0}).map(function(k){return caches.delete(k)}))}));
    Promise.all(jobs).catch(function(){}).then(function(){location.reload()});
  };
})();
