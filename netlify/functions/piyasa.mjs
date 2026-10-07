/**
 * Piyasa verisi proxy'si — çok kaynaklı.
 *
 * Döviz: TCMB resmî XML (birincil kaynak).
 *   Günlük değişim, bir önceki iş gününün resmî kuruyla karşılaştırılarak
 *   hesaplanır. TCMB değişim yüzdesi yayımlamadığı için farkı biz çıkarıyoruz;
 *   böylece hem değer hem değişim tek bir resmî kaynağa dayanır.
 *
 * Kıymetli maden: serbest piyasa sağlayıcısı (TCMB serbest piyasa altın/gümüş
 *   fiyatı yayımlamaz). Birden çok sağlayıcı sırayla denenir.
 *
 * Hiçbir koşulda tahmini, eski ya da uydurma değer üretilmez.
 * Teşhis: /api/piyasa?debug=1
 */

/* Sırayla denenir. Bir kaynak yanıt verse bile içinde gram altın fiyatı
   yoksa (hata mesajı, sınır aşımı sayfası vb.) geçersiz sayılır ve
   sıradaki kaynağa geçilir. */
const METAL_URLS = [
  "https://finans.truncgil.com/today.json",
  "https://finans.truncgil.com/v4/today.json",
  "https://api.genelpara.com/embed/altin.json",
];

const GRAM_KEYS = ["gram-altin", "GA", "GRA", "GRAMALTIN", "gramaltin", "Gram Altın", "gram altın"];

/* Maden kaynaklarına giden istekler tarayıcı kimliğiyle ve zaman aşımıyla
   yapılır; bazı sağlayıcılar bot kimliğini engelliyor. */
const METAL_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  Accept: "application/json,text/plain,*/*",
  "Accept-Language": "tr-TR,tr;q=0.9",
};

const UA = {
  "User-Agent": "Mozilla/5.0 (compatible; FinansIndexBot/1.0; +https://finansindex.com)",
  Accept: "application/json,text/xml,application/xml,text/plain,*/*",
};

const num = (v) => {
  if (v === null || v === undefined) return null;
  let raw = String(v).trim().replace(/%/g, "").replace(/\s/g, "");
  if (!raw) return null;
  // "1.234,56" (TR) → 1234.56 · "1234.56" (EN) olduğu gibi
  if (raw.includes(",")) raw = raw.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
};

/* ---------------------------------------------------------------- TCMB --- */

const tcmbUrlFor = (d) => {
  if (!d) return "https://www.tcmb.gov.tr/kurlar/today.xml";
  const p = (x) => String(x).padStart(2, "0");
  const yyyy = d.getFullYear(), mm = p(d.getMonth() + 1), dd = p(d.getDate());
  return `https://www.tcmb.gov.tr/kurlar/${yyyy}${mm}/${dd}${mm}${yyyy}.xml`;
};

function parseTcmb(xml) {
  const pick = (code) => {
    const re = new RegExp(`<Currency[^>]*CurrencyCode="${code}"[\\s\\S]*?</Currency>`, "i");
    const block = xml.match(re);
    if (!block) return null;
    const get = (tag) => {
      const m = block[0].match(new RegExp(`<${tag}>([^<]*)</${tag}>`, "i"));
      return m ? num(m[1]) : null;
    };
    const unit = get("Unit") || 1;
    const alis = get("ForexBuying");
    const satis = get("ForexSelling");
    if (satis == null && alis == null) return null;
    return { alis: alis != null ? alis / unit : null, satis: satis != null ? satis / unit : null };
  };
  const dateM = xml.match(/Tarih="([^"]+)"/);
  return { date: dateM ? dateM[1] : null, USD: pick("USD"), EUR: pick("EUR"), GBP: pick("GBP") };
}

async function fetchTcmbAt(date) {
  const res = await fetch(tcmbUrlFor(date), { headers: UA });
  if (!res.ok) return null;
  const xml = await res.text();
  if (!/<Currency/i.test(xml)) return null;   // tatil günlerinde boş sayfa döner
  return parseTcmb(xml);
}

/** "13.08.2026" → Date */
const parseTrDate = (str) => {
  if (!str) return null;
  const m = String(str).match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
};

/**
 * Bir önceki YAYIMLANMIŞ kuru bulur.
 *
 * Önemli: TCMB günün kurunu öğleden sonra yayımlar. Bu saatten önce
 * today.xml hâlâ bir önceki iş gününü gösterir. Bu yüzden geriye doğru
 * yürümeye takvim tarihinden değil, today.xml'in KENDİ tarihinden
 * başlıyoruz. Aksi hâlde aynı günü iki kez çeker ve değişim sıfır çıkar.
 */
async function fetchTcmbPrevious(todayDateStr, maxBack = 10) {
  const base = parseTrDate(todayDateStr) || new Date();
  const d = new Date(base);
  for (let i = 1; i <= maxBack; i++) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;  // pazar / cumartesi
    try {
      const r = await fetchTcmbAt(new Date(d));
      if (!r || !(r.USD || r.EUR || r.GBP)) continue;
      // Aynı yayın tarihini yakaladıysak değişim hesaplanamaz, geriye devam et
      if (r.date && todayDateStr && r.date === todayDateStr) continue;
      return r;
    } catch { /* sıradaki güne bak */ }
  }
  return null;
}

/* -------------------------------------------------------------- METAL --- */

const norm = (s) => String(s).toLocaleLowerCase("tr").replace(/[\s_\-.]/g, "");

const findKey = (obj, ...cands) => {
  if (!obj || typeof obj !== "object") return null;
  const keys = Object.keys(obj);
  for (const c of cands) {
    const hit = keys.find((k) => norm(k) === norm(c));
    if (hit !== undefined) return obj[hit];
  }
  return null;
};

/** Alan adı bilinmiyorsa: anahtar adında ipucu arar (degisim/change/fark/%). */
const findChange = (obj) => {
  const direct = findKey(obj, "degisim", "değişim", "change", "fark", "rate", "yuzde", "yüzde");
  if (direct !== null && direct !== undefined) return num(direct);
  if (!obj || typeof obj !== "object") return null;
  for (const k of Object.keys(obj)) {
    const n = norm(k);
    if (n.includes("degisim") || n.includes("change") || n.includes("fark")) return num(obj[k]);
  }
  return null;
};

async function fetchMetals(attempts = []) {
  for (const url of METAL_URLS) {
    try {
      const res = await fetch(url, { headers: METAL_HEADERS, signal: AbortSignal.timeout(6000) });
      if (!res.ok) { attempts.push({ url, error: `HTTP ${res.status}` }); continue; }
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { attempts.push({ url, error: "JSON değil", sample: text.slice(0, 120) }); continue; }
      if (!data || typeof data !== "object") { attempts.push({ url, error: "Boş yanıt" }); continue; }
      /* Yanıtta gerçek bir gram altın fiyatı yoksa bu kaynağı kullanma */
      if (!metalItem(data, GRAM_KEYS, "Gram Altın")) {
        attempts.push({ url, error: "Gram altın fiyatı bulunamadı", keys: Object.keys(data).slice(0, 12) });
        continue;
      }
      attempts.push({ url, ok: true });
      return { source: url, data };
    } catch (e) {
      attempts.push({ url, error: String((e && e.message) || e) });
    }
  }
  return null;
}

const metalItem = (md, cands, label) => {
  const d = findKey(md, ...cands);
  if (!d || typeof d !== "object") return null;
  const alis = num(findKey(d, "alis", "alış", "buying", "bid"));
  const satis = num(findKey(d, "satis", "satış", "selling", "ask"));
  const v = satis ?? alis;
  if (v == null) return null;
  return { k: label, v, unit: "₺", alis, satis, d: findChange(d) };
};

/* ---------------------------------------------------------------- MAIN --- */

export default async (req) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
  };
  const debug = new URL(req.url).searchParams.get("debug") === "1";

  const items = [];
  const errors = {};
  let tcmbDate = null;
  let prevDate = null;

  // 1) Döviz — TCMB bugün + önceki iş günü (değişim hesabı için)
  try {
    const today = await fetchTcmbAt(null);
    if (!today) throw new Error("TCMB kur verisi alınamadı");
    tcmbDate = today.date;
    const prev = await fetchTcmbPrevious(today.date).catch(() => null);
    prevDate = prev ? prev.date : null;

    const add = (key, label) => {
      const o = today[key];
      if (!o) return;
      const v = o.satis ?? o.alis;
      if (v == null) return;
      let change = null;
      const p = prev && prev[key] ? (prev[key].satis ?? prev[key].alis) : null;
      if (p != null && p > 0) {
        const c = ((v - p) / p) * 100;
        // Gerçekten sıfırsa (aynı yayın) değişim göstermeyiz; yeşil ok yanıltır.
        change = Math.abs(c) < 0.0001 ? null : c;
      }
      items.push({ k: label, v, unit: "₺", alis: o.alis, satis: o.satis, d: change });
    };
    add("USD", "Dolar");
    add("EUR", "Euro");
    add("GBP", "Sterlin");
  } catch (e) {
    errors.tcmb = String(e.message || e);
  }

  // 2) Kıymetli maden
  let metalsRaw = null;
  const metalAttempts = [];
  try {
    const m = await fetchMetals(metalAttempts);
    if (!m) throw new Error("Hiçbir maden kaynağı yanıt vermedi");
    metalsRaw = m;
    const md = m.data;
    const push = (it) => { if (it) items.push(it); };
    push(metalItem(md, GRAM_KEYS, "Gram Altın"));
    push(metalItem(md, ["ceyrek-altin", "C", "CEYREKALTIN", "ceyrekaltin", "Çeyrek Altın", "çeyrek altın"], "Çeyrek Altın"));
    push(metalItem(md, ["yarim-altin", "Y", "YARIMALTIN", "Yarım Altın", "yarım altın"], "Yarım Altın"));
    push(metalItem(md, ["tam-altin", "T", "TAMALTIN", "Tam Altın", "tam altın", "cumhuriyet-altini"], "Tam Altın"));
    push(metalItem(md, ["gumus", "GUMUS", "Gümüş", "gümüş", "silver"], "Gümüş"));
  } catch (e) {
    errors.metals = String(e.message || e);
  }

  if (debug) {
    const sampleKey = metalsRaw ? Object.keys(metalsRaw.data).find((k) => norm(k).includes("gram")) : null;
    return new Response(JSON.stringify({
      itemsFound: items.length,
      items,
      errors,
      tcmbDate, prevDate,
      metalSource: metalsRaw ? metalsRaw.source : null,
      metalAttempts,
      metalKeysSample: metalsRaw ? Object.keys(metalsRaw.data).filter((k) => /alt|gum|gümü|gram|ceyrek|çeyrek/i.test(k)).slice(0, 20) : null,
      oneMetalEntry: sampleKey ? { key: sampleKey, value: metalsRaw.data[sampleKey] } : null,
    }, null, 2), { headers: { ...headers, "Cache-Control": "no-store" } });
  }

  if (!items.length) {
    return new Response(JSON.stringify({ ok: false, error: "Kaynaklardan veri alınamadı", errors, items: [] }),
      { status: 200, headers });
  }

  /* Netlify CDN önbelleği: aynı veri 5 dakika boyunca kaynaklara tekrar
     gitmeden sunulur (sağlayıcıların istek sınırına takılmamak için).
     Maden verisi eksikse önbellek 1 dakikayla sınırlanır, hızlı toparlanır. */
  headers["Netlify-CDN-Cache-Control"] = errors.metals
    ? "public, s-maxage=60"
    : "public, s-maxage=300, stale-while-revalidate=600";

  return new Response(JSON.stringify({
    ok: true,
    updatedAt: new Date().toISOString(),
    source: errors.tcmb ? "Serbest piyasa" : "TCMB (döviz) · serbest piyasa (maden)",
    tcmbDate, prevDate,
    items,
  }), { headers });
};
