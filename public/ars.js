/* ARS panel reklam yükleyicisi — FinansIndex
   Reklamlar panel.arsdigitalmedia.com'dan yönetilir. React'teki AdSlot her alanı çizmeden önce buraya sorar:
   panelde o alan için yayında reklam varsa o gösterilir; yoksa koddaki AD_INVENTORY → GAM sırası işler.
   Sayfa geneli formatlar (page skin, mobil sticky, interstitial) uygulama rota değiştirdikçe ARS.page() ile yenilenir.

   Önizleme: herhangi bir sayfa adresine ?ars_onizleme=<kampanya ID> (sekmede gezindikçe açık kalır,
   kapatmak için ?ars_onizleme=kapat). Önizlemede gösterim ve tıklama sayılmaz.

   Sayım: gösterim = reklam yerleşti · görünür = en az %50'si 1 sn ekranda · tıklama = panel üzerinden
   yönlendirme · video = %25/%50/%75/%100 izlenme. Botlar panelde ayıklanır. */
(function () {
  var SERVER = "https://panel.arsdigitalmedia.com";
  var SITE = "finansindex";
  var SLOTS = ["masthead", "home_top_banner", "home_mid_banner", "home_native_01", "ledger_native", "desktop_sidebar_sticky",
    "article_inline_01", "article_inline_02", "article_tool_sponsor", "article_end", "category_sponsor",
    "category_native_01", "calculator_sponsor", "calculator_result", "tools_index_native", "search_native_01",
    "newsletter_sponsor", "market_band_sponsor", "rail_left", "rail_right", "mobile_sticky_footer", "pageskin", "interstitial"];
  /* [masaüstü, mobil] ölçüler */
  var BIG = [[970, 250], [320, 100]];
  var SIZES = {
    masthead: BIG, home_top_banner: BIG, home_mid_banner: BIG, article_end: BIG,
    article_inline_01: [[728, 90], [300, 250]], article_inline_02: [[728, 90], [300, 250]],
    desktop_sidebar_sticky: [[300, 600], [300, 250]], rail_left: [[160, 600], [160, 600]], rail_right: [[160, 600], [160, 600]]
  };
  var NATIVE = ["home_native_01", "ledger_native", "category_native_01", "tools_index_native", "search_native_01"];
  var SPONSOR = ["calculator_sponsor", "article_tool_sponsor", "category_sponsor", "newsletter_sponsor", "market_band_sponsor"];
  var GLOBAL = ["pageskin", "mobile_sticky_footer", "interstitial"];
  var FONT = "Inter,system-ui,sans-serif", INK = "#14100E", MUTED = "#6E6A66", LINE = "#E6E1D8", ACCENT = "#8C1D33", ACCENT_BG = "#FAEFF1";

  /* ── yardımcılar ── */
  var TR = { "ç": "c", "ğ": "g", "ı": "i", "İ": "i", "ö": "o", "ş": "s", "ü": "u", "Ç": "c", "Ğ": "g", "Ö": "o", "Ş": "s", "Ü": "u" };
  function slug(t) {
    return String(t || "").replace(/[çğıİöşüÇĞÖŞÜ]/g, function (c) { return TR[c]; }).toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function list(v) {
    return [].concat(v || []).reduce(function (o, x) { return o.concat(typeof x === "string" ? x.split(",") : [x]); }, [])
      .map(function (x) { return String(x).trim(); }).filter(Boolean);
  }

  /* Sayfa bağlamı: uygulamanın rota bağlamı (ARS.page) + alanın kendi bağlamı (data-ars-ctx) */
  var PAGE = {};
  function context(el) {
    var ctx = {}, k;
    for (k in PAGE) ctx[k] = PAGE[k];
    var raw = el && el.getAttribute && el.getAttribute("data-ars-ctx");
    if (raw) { try { var o = JSON.parse(raw); for (k in o) if (o[k] != null && o[k] !== "") ctx[k] = o[k]; } catch (e) {} }
    var out = {};
    ["sayfa", "kategori", "arac", "etiket"].forEach(function (key) {
      var v = list(ctx[key]).map(slug).filter(Boolean);
      if (v.length) out[key] = v;
    });
    return out;
  }

  function previewId() {
    var p = null;
    try { p = new URLSearchParams(location.search).get("ars_onizleme"); } catch (e) {}
    try {
      if (p === "kapat") { sessionStorage.removeItem("ars_onizleme"); return null; }
      if (p && /^ARS-\d{8}-[0-9A-F]{6}$/.test(p)) sessionStorage.setItem("ars_onizleme", p);
      return sessionStorage.getItem("ars_onizleme");
    } catch (e) { return p; }
  }
  var PREVIEW = previewId();

  /* Bağlam başına tek istek; aynı bağlamdaki tüm slotlar bu cevabı paylaşır */
  var cache = {};
  function fetchAds(ctx) {
    var q = "s=" + SITE + "&slots=" + SLOTS.join(",");
    Object.keys(ctx).sort().forEach(function (k) { q += "&" + k + "=" + encodeURIComponent(list(ctx[k]).join(",")); });
    if (PREVIEW) q += "&preview=" + PREVIEW;
    if (!cache[q]) {
      cache[q] = fetch(SERVER + "/api/ad/serve?" + q, { credentials: "omit" })
        .then(function (r) { return r.ok ? r.json() : { slots: {} }; })
        .then(function (d) { if (PREVIEW) badge(); return (d && d.slots) || {}; })
        .catch(function () { return {}; });
    }
    return cache[q];
  }

  var shown = {};
  function pick(list) {
    var fresh = list.filter(function (a) { return !shown[a.key + ":" + a.j]; });
    var pool = fresh.length ? fresh : list;
    var ad = pool[Math.floor(Math.random() * pool.length)];
    shown[ad.key + ":" + ad.j] = 1;
    return ad;
  }
  var okUrl = function (u) { return !!u && /^https?:\/\//i.test(u); };

  /* ── sayım ── */
  var pending = [], timer = 0;
  function send(key, type, now) {
    if (PREVIEW) return;
    pending.push([key, type]);
    clearTimeout(timer);
    if (now) flush(); else timer = setTimeout(flush, 1500);
  }
  function flush() {
    while (pending.length) {
      var body = JSON.stringify({ s: SITE, e: pending.splice(0, 40) });
      var url = SERVER + "/api/ad/e";
      var sent = false;
      try { sent = navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "text/plain" })); } catch (e) {}
      if (!sent) { try { fetch(url, { method: "POST", body: body, keepalive: true, credentials: "omit", headers: { "content-type": "text/plain" } }); } catch (e) {} }
    }
  }
  addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flush(); });

  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var t = e.target;
      if (e.isIntersecting) {
        t.__arsT = setTimeout(function () { io.unobserve(t); send(t.getAttribute("data-ars-key"), "v"); }, 1000);
      } else clearTimeout(t.__arsT);
    });
  }, { threshold: 0.5 }) : null;

  function counted(el, ad, slot) {
    el.setAttribute("data-ars-key", ad.key);
    send(ad.key, "i", true);
    if (io) io.observe(el);
    try { if (typeof window.gtag === "function") window.gtag("event", "ad_impression", { slot: slot, advertiser: ad.marka, format: "panel_" + ad.tip }); } catch (e) {}
  }

  /* ── çizim yardımcıları ── */
  function mk(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text) e.textContent = text;
    return e;
  }
  function label(el, text) {
    el.appendChild(mk("span", "position:absolute;top:4px;left:6px;z-index:3;font-size:10px;line-height:1;letter-spacing:.6px;color:#64748B;" +
      "background:rgba(255,255,255,.9);padding:3px 6px;border-radius:4px;font-family:Inter,sans-serif;pointer-events:none", text || "Reklam"));
  }
  function link(ad, css) {
    var a = mk("a", css || "display:block;width:100%;height:100%");
    a.href = ad.click; a.target = "_blank"; a.rel = "sponsored noopener";
    a.addEventListener("click", function () {
      try { if (typeof window.gtag === "function") window.gtag("event", "sponsored_content_click", { advertiser: ad.marka, format: "panel_" + ad.tip }); } catch (e) {}
    });
    return a;
  }
  function picture(ad, alt, css, mobileSrc) {
    var pic = document.createElement("picture");
    var mob = mobileSrc === undefined ? ad.gorsel_mobil : mobileSrc;
    if (okUrl(mob)) { var s = document.createElement("source"); s.media = "(max-width: 699px)"; s.srcset = mob; pic.appendChild(s); }
    var im = mk("img", css || "width:100%;height:100%;object-fit:contain;display:block");
    im.src = ad.gorsel; im.alt = alt || ((ad.marka || "Reklam") + " reklamı"); im.loading = "lazy"; im.decoding = "async";
    pic.appendChild(im);
    return pic;
  }
  function slotSize(id) {
    var s = SIZES[id] || BIG;
    var vw = window.innerWidth;
    var mob = vw < 700 || (vw < 1024 && s[0][0] > vw - 40);
    return mob ? s[1] : s[0];
  }
  function box(el, sz) {
    el.innerHTML = "";
    el.style.cssText = "position:relative;width:" + sz[0] + "px;max-width:100%;aspect-ratio:" + sz[0] + "/" + sz[1] +
      ";margin:22px auto;display:flex;align-items:center;justify-content:center;border-radius:12px;overflow:hidden;";
  }

  function htmlFrame(ad) {
    var wh = (ad.boyut.match(/^(\d+)x(\d+)$/) || [0, 300, 250]);
    var f = mk("iframe", "border:0;display:block;max-width:100%");
    f.setAttribute("sandbox", "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation");
    f.setAttribute("scrolling", "no");
    f.width = wh[1]; f.height = wh[2]; f.title = (ad.marka || "Reklam") + " reklamı";
    f.srcdoc = "<!doctype html><html><head><meta charset=utf-8><style>html,body{margin:0;overflow:hidden}</style></head><body>" + ad.html + "</body></html>";
    return f;
  }

  /* Video oynatıcı (pre-roll ve interstitial): sessiz başlar, %25/%50/%75/%100 izlenme sayılır */
  function videoEl(ad, src, track) {
    var v = mk("video", "width:100%;height:100%;object-fit:cover;display:block;background:#000;cursor:pointer");
    v.muted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "metadata";
    if (okUrl(ad.gorsel)) v.poster = ad.gorsel;
    v.src = src;
    var q = { q1: 0.25, q2: 0.5, q3: 0.75 }, done = {};
    v.addEventListener("timeupdate", function () {
      if (!v.duration) return;
      for (var k in q) if (!done[k] && v.currentTime / v.duration >= q[k]) { done[k] = 1; send(ad.key, k); track && track(k); }
    });
    v.addEventListener("ended", function () { if (!done.q4) { done.q4 = 1; send(ad.key, "q4"); track && track("q4"); } });
    v.autoplay = true;
    var snd = mk("button", "position:absolute;right:8px;bottom:8px;z-index:3;border:0;border-radius:999px;background:rgba(15,23,42,.75);color:#fff;" +
      "font:600 12px Inter,sans-serif;padding:6px 10px;cursor:pointer", "Sesi aç");
    snd.type = "button";
    snd.onclick = function (e) { e.preventDefault(); e.stopPropagation(); v.muted = !v.muted; snd.textContent = v.muted ? "Sesi aç" : "Sesi kapat"; };
    return { video: v, sound: snd };
  }

  /* VAST: InLine MediaFile (mp4), Impression, quartile TrackingEvents, ClickThrough; Wrapper en fazla 3 kez izlenir */
  function loadVast(url, depth, acc) {
    acc = acc || { imp: [], track: {}, clicks: [] };
    return fetch(url, { credentials: "omit" }).then(function (r) { return r.text(); }).then(function (x) {
      var d = new DOMParser().parseFromString(x, "text/xml");
      var txt = function (n) { return (n && n.textContent || "").trim(); };
      [].forEach.call(d.querySelectorAll("Impression"), function (n) { if (txt(n)) acc.imp.push(txt(n)); });
      [].forEach.call(d.querySelectorAll("Tracking"), function (n) { var e = n.getAttribute("event"); (acc.track[e] = acc.track[e] || []).push(txt(n)); });
      [].forEach.call(d.querySelectorAll("ClickTracking"), function (n) { if (txt(n)) acc.clicks.push(txt(n)); });
      var wrap = d.querySelector("Wrapper VASTAdTagURI");
      if (wrap && depth < 3) return loadVast(txt(wrap), depth + 1, acc);
      var files = [].filter.call(d.querySelectorAll("MediaFile"), function (n) { return /mp4/.test(n.getAttribute("type") || "") && okUrl(txt(n)); });
      files.sort(function (a, b) { return Math.abs((+a.getAttribute("width") || 640) - 960) - Math.abs((+b.getAttribute("width") || 640) - 960); });
      if (!files.length) throw new Error("VAST: mp4 yok");
      acc.src = txt(files[0]);
      acc.click = txt(d.querySelector("ClickThrough"));
      return acc;
    });
  }
  var ping = function (u) { if (okUrl(u)) { var i = new Image(); i.src = u; } };

  /* Yazı içi / sonuç ekranı video: sessiz; en az yarısı ekrandayken oynar, çıkınca durur. Gösterim ilk oynatmada sayılır. */
  function renderInlineVideo(el, ad, slot) {
    var start = function (src, vast) {
      el.innerHTML = "";
      el.style.cssText = "position:relative;width:640px;max-width:100%;aspect-ratio:16/9;margin:22px auto;border-radius:12px;overflow:hidden;background:#000";
      var map = { q1: "firstQuartile", q2: "midpoint", q3: "thirdQuartile", q4: "complete" };
      var p = videoEl(ad, src, vast ? function (k) { (vast.track[map[k]] || []).forEach(ping); } : null);
      p.video.autoplay = false;
      var first = true;
      p.video.addEventListener("playing", function () {
        if (!first) return; first = false;
        if (vast) vast.imp.forEach(ping);
        counted(el, ad, slot);
      });
      var ended = false;
      p.video.addEventListener("ended", function () { ended = true; });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting && !ended) { var r = p.video.play(); r && r.catch && r.catch(function () {}); }
            else if (!e.isIntersecting) p.video.pause();
          });
        }, { threshold: 0.5 }).observe(p.video);
      }
      var target = vast && okUrl(vast.click) ? vast.click : ad.click;
      if (target) p.video.addEventListener("click", function () {
        if (vast) { vast.clicks.forEach(ping); if (ad.click) ping(ad.click); }
        window.open(target, "_blank", "noopener");
      });
      el.appendChild(p.video); el.appendChild(p.sound);
      label(el, "Reklam · " + (ad.marka || "Sponsor"));
      return true;
    };
    if (okUrl(ad.video)) return Promise.resolve(start(ad.video, null));
    if (!okUrl(ad.vast)) return Promise.resolve(false);
    return loadVast(ad.vast, 0).then(function (v) { return start(v.src, v); }).catch(function () { return false; });
  }

  /* Rich media: kapalı banner; üzerine gelince (dokunmatikte dokununca) açık hâli içeriğin üstüne açılır */
  function renderExpand(el, ad, slot) {
    var sz = slotSize(slot);
    box(el, sz);
    el.style.overflow = "visible";
    var mobile = window.innerWidth < 700;
    var a = link(ad);
    a.appendChild(picture(ad, null, null, mobile ? ad.gorsel_mobil : ""));
    el.appendChild(a);
    label(el, "Reklam · " + (ad.marka || "Sponsor"));
    if (!mobile && okUrl(ad.gorsel_acik)) {
      var panel = link(ad, "position:absolute;left:0;top:0;width:100%;z-index:150;display:none;border-radius:12px;overflow:hidden;box-shadow:0 18px 40px rgba(15,23,42,.25)");
      var big = mk("img", "width:100%;height:auto;display:block"); big.src = ad.gorsel_acik; big.alt = (ad.marka || "Reklam") + " reklamı";
      panel.appendChild(big);
      var x = mk("button", "position:absolute;top:6px;right:6px;z-index:2;width:26px;height:26px;border-radius:50%;border:0;background:rgba(15,23,42,.7);color:#fff;cursor:pointer", "×");
      x.type = "button"; x.setAttribute("aria-label", "Küçült");
      panel.appendChild(x);
      el.appendChild(panel);
      var hideT;
      var open = function () { clearTimeout(hideT); panel.style.display = "block"; if (!el.__opened) { el.__opened = 1; send(ad.key, "v"); } };
      var close = function () { hideT = setTimeout(function () { panel.style.display = "none"; }, 250); };
      el.addEventListener("mouseenter", open); el.addEventListener("mouseleave", close);
      x.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); panel.style.display = "none"; });
    }
    counted(el, ad, slot);
    return true;
  }

  function renderBanner(el, ad, slot) {
    if (ad.tip === "html") {
      if (!ad.html) return false;
      box(el, slotSize(slot));
      el.style.aspectRatio = "auto";
      el.appendChild(htmlFrame(ad));
      label(el, "Reklam · " + (ad.marka || "Sponsor"));
      counted(el, ad, slot);
      return true;
    }
    if (!okUrl(ad.gorsel) || !ad.click) return false;
    box(el, slotSize(slot));
    var a = link(ad); a.appendChild(picture(ad)); el.appendChild(a);
    label(el, "Reklam · " + (ad.marka || "Sponsor"));
    counted(el, ad, slot);
    return true;
  }

  /* Native: içerik kartı görünümünde, "Sponsorlu" etiketiyle. calculator_result → "Sponsorlu teklif" */
  function renderNative(el, ad, slot, offer) {
    if (!okUrl(ad.gorsel) || !ad.click) return false;
    el.innerHTML = "";
    el.style.cssText = "margin:" + (offer ? "16px 0 0" : "0") + ";font-family:" + FONT;
    var a = link(ad, "display:grid;gap:10px;align-content:start;background:#fff;border:1px solid " + LINE + ";border-radius:4px;padding:16px;text-decoration:none;color:" + INK);
    var media = mk("div", "aspect-ratio:" + (offer ? "3/1" : "3/2") + ";border-radius:2px;overflow:hidden;background:#F3EFE8");
    media.appendChild(picture(ad, "", "width:100%;height:100%;object-fit:" + (offer ? "contain" : "cover") + ";display:block", ""));
    a.appendChild(media);
    a.appendChild(mk("span", "justify-self:start;font:600 11px/1 " + FONT + ";letter-spacing:.06em;text-transform:uppercase;color:" + ACCENT + ";background:" + ACCENT_BG + ";padding:5px 8px;border-radius:2px",
      offer ? "Sponsorlu teklif" : "Sponsorlu içerik"));
    a.appendChild(mk("span", "font:700 " + (offer ? 18 : 17) + "px/1.3 " + FONT, ad.baslik || ad.marka || "Sponsor"));
    if (ad.metin) a.appendChild(mk("span", "font-size:14px;line-height:1.5;color:#3A3634", ad.metin));
    a.appendChild(mk("span", "font:600 13px/1 " + FONT + ";color:" + ACCENT, (ad.marka ? ad.marka + " · " : "") + (offer ? "Teklifi incele →" : "Devamını oku →")));
    if (offer) el.appendChild(mk("div", "font-size:12px;color:" + MUTED + ";margin:0 0 6px", "Reklamdır; hesaplama sonucunu etkilemez. FinansIndex ürün tavsiyesi vermez."));
    el.appendChild(a);
    counted(a, ad, slot);
    return true;
  }

  /* Sponsor şeridi: logo + kısa metin. market_band_sponsor koyu piyasa bandının içinde açık renkli */
  function renderSponsor(el, ad, slot) {
    if (!okUrl(ad.gorsel) || !ad.click) return false;
    el.innerHTML = "";
    var dark = slot === "market_band_sponsor";
    el.style.cssText = "display:flex;align-items:center;" + (slot === "category_sponsor" ? "margin-top:14px;" : slot === "calculator_sponsor" || slot === "article_tool_sponsor" ? "margin-top:10px;" : slot === "newsletter_sponsor" ? "margin-top:12px;" : "");
    var a = link(ad, "display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;font:13px/1.3 " + FONT + ";color:" + (dark ? "#CFC8BC" : MUTED) + ";text-decoration:none");
    a.appendChild(mk("span", "font:600 10px/1 " + FONT + ";letter-spacing:.1em;text-transform:uppercase;color:" + (dark ? "#9C948C" : MUTED), dark ? "Piyasa verileri sponsoru" : "Sponsor"));
    var logo = picture(ad, ad.marka || "Sponsor", "height:" + (dark ? 22 : 26) + "px;width:auto;display:block", "");
    a.appendChild(logo);
    var txt = ad.baslik || ad.metin;
    if (txt) a.appendChild(mk("span", "font-weight:600;color:" + (dark ? "#fff" : INK), txt));
    el.appendChild(a);
    counted(a, ad, slot);
    return true;
  }

  /* ── ads.js'in çağırdığı giriş noktası: true → panel reklamı çizildi ── */
  function slot(el) {
    var id = el.getAttribute("data-slot");
    if (SLOTS.indexOf(id) < 0 || GLOBAL.indexOf(id) > -1) return Promise.resolve(false);
    return fetchAds(context(el)).then(function (all) {
      var list = all[id];
      if (!list || !list.length) return false;
      var ad = pick(list);
      if (id === "calculator_result") return renderNative(el, ad, id, true);
      if (NATIVE.indexOf(id) > -1) return renderNative(el, ad, id, false);
      if (SPONSOR.indexOf(id) > -1) return renderSponsor(el, ad, id);
      if (ad.tip === "video") return renderInlineVideo(el, ad, id);
      if (ad.tip === "genisleyen") return renderExpand(el, ad, id);
      return renderBanner(el, ad, id);
    }).catch(function () { return false; });
  }

  /* ── sayfa geneli formatlar: page skin, mobil sticky, interstitial (yalnız içerik ekranlarında) ── */
  var globals = [];
  function removeGlobals() {
    globals.forEach(function (n) { n.parentNode && n.parentNode.removeChild(n); });
    globals = [];
    window.ARS.ownsPageskin = false;
    document.documentElement.classList.remove("ars-skin-on");
  }
  var content = function () { return true; };

  function renderSkin(ad) {
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var gutter = (vw - 1180) / 2;
    if (gutter < 192) return false;
    var gap = Math.max(16, Math.round((gutter - 160) / 2));
    window.ARS.ownsPageskin = true;
    document.documentElement.classList.add("ars-skin-on"); /* sol/sağ skyscraper'lar gizlenir */
    /* Arka plan rengi yalnız içeriğin iki yanındaki boşluğa uygulanır; içerik alanına dokunmaz */
    if (/^#[0-9a-f]{6}$/i.test(ad.renk || "")) {
      ["left", "right"].forEach(function (side) {
        var bg = mk("div", "position:fixed;top:0;bottom:0;" + side + ":0;width:" + Math.floor(gutter) + "px;background:" + ad.renk + ";z-index:110;pointer-events:none");
        bg.className = "ars-skin-bg";
        document.body.appendChild(bg); globals.push(bg);
      });
    }
    ["left", "right"].forEach(function (side) {
      var w = mk("div", "position:fixed;top:170px;" + side + ":" + gap + "px;width:160px;height:600px;max-height:calc(100vh - 130px);z-index:120;border-radius:10px;overflow:hidden");
      w.className = "ars-skin";
      var a = link(ad);
      var src = side === "left" && okUrl(ad.gorsel_sol) ? ad.gorsel_sol : ad.gorsel;
      var im = mk("img", "width:100%;height:100%;object-fit:cover;display:block"); im.src = src; im.alt = (ad.marka || "Reklam") + " reklamı";
      a.appendChild(im); w.appendChild(a); label(w, "Reklam");
      document.body.appendChild(w); globals.push(w);
      if (side === "right") counted(w, ad, "pageskin");
    });
    return true;
  }

  function renderSticky(ad) {
    if (window.innerWidth >= 700 || !okUrl(ad.gorsel) || !ad.click) return;
    try { if (sessionStorage.getItem("ars_sticky_kapali") === "1") return; } catch (e) {}
    var w = mk("div", "position:fixed;left:0;right:0;bottom:0;z-index:130;background:#fff;border-top:1px solid #E2E8F0;box-shadow:0 -4px 16px rgba(15,23,42,.08);padding:4px 40px 4px 8px;text-align:center");
    var a = link(ad, "display:inline-block");
    var im = mk("img", "max-height:50px;max-width:100%;width:auto;display:block;margin:0 auto");
    im.src = okUrl(ad.gorsel_mobil) ? ad.gorsel_mobil : ad.gorsel; im.alt = (ad.marka || "Reklam") + " reklamı";
    a.appendChild(im); w.appendChild(a);
    w.appendChild(mk("span", "position:absolute;left:8px;top:-16px;font:10px Inter,sans-serif;letter-spacing:.6px;color:#64748B;background:#fff;padding:2px 6px;border-radius:4px 4px 0 0", "Reklam"));
    var x = mk("button", "position:absolute;right:6px;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;border:1px solid #E2E8F0;background:#fff;color:#64748B;font-size:16px;cursor:pointer", "×");
    x.type = "button"; x.setAttribute("aria-label", "Reklamı kapat");
    x.onclick = function () { w.parentNode && w.parentNode.removeChild(w); try { sessionStorage.setItem("ars_sticky_kapali", "1"); } catch (e) {} };
    w.appendChild(x);
    document.body.appendChild(w); globals.push(w);
    counted(w, ad, "mobile_sticky_footer");
  }

  /* Interstitial: oturumda en fazla 1 kez, ancak ikinci sayfa görüntülemesinden itibaren
     (aramadan gelen ziyaretçinin ilk sayfası kapatılmaz — Google'ın müdahaleci reklam kuralı). */
  function renderInterstitial(ad) {
    var pv = 0;
    try { pv = +(sessionStorage.getItem("ars_pv") || 0); if (sessionStorage.getItem("ars_int") === "1") return; } catch (e) { return; }
    if (!PREVIEW && pv < 2) return;
    var mobile = window.innerWidth < 700;
    var ov = mk("div", "position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.82);display:flex;align-items:center;justify-content:center;padding:16px");
    var card = mk("div", "position:relative;width:" + (ad.tip === "video" ? "min(960px,100%)" : mobile ? "min(320px,100%)" : "min(800px,100%)") +
      ";aspect-ratio:" + (ad.tip === "video" ? "16/9" : mobile ? "320/480" : "800/600") + ";background:#000;border-radius:12px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.4)");
    var close = function () { ov.parentNode && ov.parentNode.removeChild(ov); document.removeEventListener("keydown", esc); };
    var esc = function (e) { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", esc);
    if (ad.tip === "video") {
      var src = okUrl(ad.video) ? ad.video : null;
      if (!src) return; /* interstitialda yalnız MP4 */
      var p = videoEl(ad, src, null);
      p.video.addEventListener("ended", function () { setTimeout(close, 800); });
      if (ad.click) p.video.addEventListener("click", function () { window.open(ad.click, "_blank", "noopener"); });
      card.appendChild(p.video); card.appendChild(p.sound);
    } else {
      if (!okUrl(ad.gorsel) || !ad.click) return;
      var a = link(ad); a.appendChild(picture(ad, null, "width:100%;height:100%;object-fit:cover;display:block")); card.appendChild(a);
      setTimeout(close, 15000);
    }
    label(card, "Reklam · " + (ad.marka || "Sponsor"));
    var x = mk("button", "position:absolute;top:8px;right:8px;z-index:4;border:0;border-radius:999px;background:rgba(255,255,255,.95);color:#0F172A;font:700 13px Inter,sans-serif;padding:7px 12px;cursor:pointer", "Kapat ×");
    x.type = "button"; x.onclick = close;
    card.appendChild(x);
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    ov.appendChild(card); document.body.appendChild(ov);
    try { sessionStorage.setItem("ars_int", "1"); } catch (e) {}
    counted(card, ad, "interstitial");
  }

  function renderGlobals() {
    removeGlobals();
    if (!content()) return Promise.resolve();
    return fetchAds(context(null)).then(function (all) {
      if (!content()) return;
      if (all.pageskin && all.pageskin.length) renderSkin(pick(all.pageskin));
      if (all.mobile_sticky_footer && all.mobile_sticky_footer.length) renderSticky(pick(all.mobile_sticky_footer));
      if (all.interstitial && all.interstitial.length) renderInterstitial(pick(all.interstitial));
    });
  }

  function badge() {
    if (document.getElementById("ars-preview")) return;
    var b = mk("div", "position:fixed;left:12px;bottom:12px;z-index:2147483001;display:flex;gap:10px;align-items:center;padding:8px 14px;border-radius:999px;background:#0F172A;color:#fff;font:600 13px Inter,sans-serif");
    b.id = "ars-preview";
    b.appendChild(mk("span", "", "Reklam önizlemesi · " + PREVIEW));
    var a = mk("a", "color:#4ADE80"); a.textContent = "Kapat";
    var u = new URL(location.href); u.searchParams.set("ars_onizleme", "kapat"); a.href = u.toString();
    b.appendChild(a);
    (document.body || document.documentElement).appendChild(b);
  }

  function pageview() { try { sessionStorage.setItem("ars_pv", String(+(sessionStorage.getItem("ars_pv") || 0) + 1)); } catch (e) {} }
  /* Uygulama her rota değişiminde çağırır: bağlamı günceller, sayfa sayar, sayfa geneli formatları yeniler */
  var lastPage = "";
  function page(ctx) {
    var key = JSON.stringify(ctx || {});
    if (key === lastPage) return;
    lastPage = key; PAGE = ctx || {};
    pageview();
    renderGlobals();
  }

  window.ARS = {
    slot: slot,
    renderGlobals: renderGlobals,
    removeGlobals: removeGlobals,
    page: page,
    setPage: function (ctx) { PAGE = ctx || {}; },
    pageKey: function () { return JSON.stringify(PAGE); },
    ownsPageskin: false,
    preview: PREVIEW
  };

  /* İlk çizim uygulamanın ARS.page() çağrısıyla yapılır */
  var rt;
  addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (!content()) return;
      var vw = document.documentElement.clientWidth || window.innerWidth;
      var skinOn = document.querySelector(".ars-skin");
      if (!!skinOn !== ((vw - 1180) / 2 >= 192)) renderGlobals();
    }, 250);
  });
})();
