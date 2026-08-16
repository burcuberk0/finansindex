/**
 * Piyasa verisi proxy'si — çok kaynaklı.
 *
 * Tasarım kararı: tek sağlayıcıya bağımlı kalmıyoruz.
 *  1) Döviz için TCMB'nin resmî XML servisi (birincil kaynak).
 *     FinansIndex'in editoryal ilkesi birincil kaynak kullanmak; döviz
 *     tarafında bunu doğrudan uygulayabiliyoruz.
 *  2) Kıymetli maden için serbest piyasa sağlayıcısı (TCMB altın/gümüş
 *     serbest piyasa fiyatı yayımlamıyor).
 *  3) Biri çökerse diğeri çalışmaya devam eder; kısmi veri gösterilir.
 *
 * Hiçbir koşulda tahmini, eski ya da uydurma değer üretilmez.
 *
 * Teşhis: /api/piyasa?debug=1
 */

const TCMB_URL = "https://www.tcmb.gov.tr/kurlar/today.xml";
const METAL_URLS = [
  "https://api.genelpara.com/embed/altin.json",
  "https://finans.truncgil.com/today.json",
];

const UA = {
  "User-Agent": "Mozilla/5.0 (compatible; FinansIndexBot/1.0; +https://finansindex.com)",
  Accept: "application/json,text/xml,application/xml,text/plain,*/*",
};

const num = (v) => {
  if (v === null || v === undefined) return null;
  const raw = String(v).trim();
  if (!raw) return null;
  const norm = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const n = parseFloat(norm);
  return isNaN(n) ? null : n;
};

/* --- TCMB: resmî döviz kurları (XML) --- */
async function fetchTcmb() {
  const res = await fetch(TCMB_URL, { headers: UA });
  if (!res.ok) throw new Error("TCMB " + res.status);
  const xml = await res.text();

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
    return { alis: alis ? alis / unit : null, satis: satis ? satis / unit : null };
  };

  const dateM = xml.match(/Tarih="([^"]+)"/);
  return {
    date: dateM ? dateM[1] : null,
    USD: pick("USD"),
    EUR: pick("EUR"),
    GBP: pick("GBP"),
  };
}

/* --- Kıymetli maden: serbest piyasa --- */
async function fetchMetals() {
  for (const url of METAL_URLS) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) continue;
      const text = await res.text();
      const data = JSON.parse(text);
      if (data && typeof data === "object" && Object.keys(data).length) {
        return { source: url, data };
      }
    } catch { /* sıradaki kaynağı dene */ }
  }
  return null;
}

const findKey = (obj, ...cands) => {
  if (!obj) return null;
  const keys = Object.keys(obj);
  for (const c of cands) {
    const hit = keys.find((k) => k.toLowerCase().replace(/[\s_-]/g, "") === c.toLowerCase().replace(/[\s_-]/g, ""));
    if (hit) return obj[hit];
  }
  return null;
};

const metalItem = (metals, cands, label) => {
  const d = findKey(metals, ...cands);
  if (!d || typeof d !== "object") return null;
  const alis = num(findKey(d, "alis", "alış", "Alış", "buying"));
  const satis = num(findKey(d, "satis", "satış", "Satış", "selling"));
  const val = satis ?? alis;
  if (val == null) return null;
  return {
    k: label, v: val, unit: "₺", alis, satis,
    d: num(findKey(d, "degisim", "değişim", "Değişim", "change")),
  };
};

export default async (req) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
  };

  const debug = new URL(req.url).searchParams.get("debug") === "1";
  const items = [];
  const errors = {};
  let tcmbDate = null;

  // 1) Döviz — TCMB
  try {
    const t = await fetchTcmb();
    tcmbDate = t.date;
    const add = (o, label) => {
      if (!o) return;
      const v = o.satis ?? o.alis;
      if (v != null) items.push({ k: label, v, unit: "₺", alis: o.alis, satis: o.satis, d: null });
    };
    add(t.USD, "Dolar");
    add(t.EUR, "Euro");
    add(t.GBP, "Sterlin");
  } catch (e) {
    errors.tcmb = String(e.message || e);
  }

  // 2) Kıymetli maden
  let metalsRaw = null;
  try {
    const m = await fetchMetals();
    if (!m) throw new Error("Hiçbir maden kaynağı yanıt vermedi");
    metalsRaw = m;
    const md = m.data;
    const push = (it) => { if (it) items.push(it); };
    push(metalItem(md, ["GA", "gram-altin", "gramaltin", "Gram Altın", "gram altın"], "Gram Altın"));
    push(metalItem(md, ["C", "ceyrek-altin", "ceyrekaltin", "Çeyrek Altın", "çeyrek altın"], "Çeyrek Altın"));
    push(metalItem(md, ["GUMUS", "gumus", "Gümüş", "gümüş"], "Gümüş"));
    push(metalItem(md, ["PLATIN", "platin", "Platin"], "Platin"));
  } catch (e) {
    errors.metals = String(e.message || e);
  }

  if (debug) {
    return new Response(JSON.stringify({
      itemsFound: items.length,
      items,
      errors,
      metalSource: metalsRaw ? metalsRaw.source : null,
      metalKeys: metalsRaw ? Object.keys(metalsRaw.data).slice(0, 40) : null,
      metalSample: metalsRaw ? Object.entries(metalsRaw.data).slice(0, 4) : null,
    }, null, 2), { headers: { ...headers, "Cache-Control": "no-store" } });
  }

  if (!items.length) {
    return new Response(JSON.stringify({ ok: false, error: "Kaynaklardan veri alınamadı", errors, items: [] }),
      { status: 200, headers });
  }

  return new Response(JSON.stringify({
    ok: true,
    updatedAt: new Date().toISOString(),
    source: errors.tcmb ? "Serbest piyasa" : "TCMB (döviz) · serbest piyasa (maden)",
    tcmbDate,
    items,
  }), { headers });
};
