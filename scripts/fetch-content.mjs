/* Derleme öncesi içerik çekme.
 *
 * Yazılar artık Sanity'de duruyor. Bu betik derleme sırasında yayımlanmış
 * içeriği çeker ve src/content.json dosyasına yazar; uygulama da onu
 * paketin içine gömer. Böylece okuyucu sayfayı açtığında içerik zaten
 * HTML paketinin içindedir — tarayıcının ikinci bir istek atmasını
 * beklemez, arama motoru da içeriği ilk yüklemede görür.
 *
 * Sanity'ye erişilemezse derleme BAŞARISIZ OLMAZ: elde var olan
 * content.json korunur, uyarı basılır. Yayın hattının geçici bir ağ
 * hatası yüzünden siteyi boşaltması kabul edilemez.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "src", "content.json");
/* Yayın hattının durumu site üzerinden görülebilsin: finansindex.com/icerik-durumu.json
   İçeriğin en son ne zaman ve nereden alındığını söyler. Sanity'ye erişilemediğinde
   bu dosya "eskiYedek" der; aksi hâlde sorun fark edilmeden günlerce sürebilir. */
const STATUS = path.join(__dirname, "..", "public", "icerik-durumu.json");
const SITEMAP = path.join(__dirname, "..", "public", "sitemap.xml");
const SITE_URL = "https://finansindex.com";

const writeStatus = (durum, detay) => {
  try {
    fs.writeFileSync(STATUS, JSON.stringify({ durum, detay, zaman: new Date().toISOString() }, null, 1) + "\n");
  } catch { /* durum dosyası yazılamazsa derleme yine de sürsün */ }
};

const PROJECT = process.env.SANITY_PROJECT_ID || "u13dxmis";
const DATASET = process.env.SANITY_DATASET || "production";
const API = "2026-02-01";

/* Yalnızca yayımlanmış dokümanlar. Taslaklar (drafts.*) hariç tutulur:
   editör onayından geçmemiş içerik siteye çıkmamalı. */
const QUERY = `{
  "categories": *[_type == "category" && !(_id in path("drafts.**"))] | order(order asc) {
    "slug": slug.current, "name": title, "desc": description
  },
  "articles": *[_type == "article" && !(_id in path("drafts.**")) && defined(slug.current)]
    | order(publishedAt desc) {
    _id, title, "slug": slug.current, summary, contentType,
    "category": category->slug.current,
    publishedAt, updatedAt, readMinutes, hook, inBrief, oranNotu,
    keyStat, impact, sourceName, tags, riskLevel, reviewStatus,
    autoDrafted, sponsored, sponsorName, relatedTool, seoTitle, metaDescription,
    "sources": sources[]{ title, url },
    "image": image{ "url": asset->url, alt, credit },
    body[]{
      _type, _key, t, items, head, caption, note, title, unit, dec, highlight,
      "rows": rows[]{ _key, cells, k, sub, v },
      "statItems": items[]{ _key, v, k, sub }
    }
  }
}`;

/* Sanity blok adları ile uygulamanın gövde biçimi arasındaki eşleme.
   Uygulamanın render kodu değişmedi; dönüşüm burada yapılır. */
const slugId = (t) =>
  String(t || "").toLowerCase()
    .replace(/[^a-zçğıöşü0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function mapBlock(b) {
  switch (b._type) {
    case "blockParagraph": return { type: "p", t: b.t };
    case "blockHeading":   return { type: "h2", t: b.t, id: slugId(b.t) };
    case "blockList":      return { type: "ul", items: b.items || [] };
    case "blockNote":      return { type: "note", t: b.t };
    case "blockQuote":     return { type: "quote", t: b.t };
    case "blockTable":
      return {
        type: "table",
        head: b.head || [],
        rows: (b.rows || []).map((r) => r.cells || []),
        ...(b.caption ? { caption: b.caption } : {}),
      };
    case "blockStats":
      return {
        type: "stats",
        items: (b.statItems || []).map((i) => ({ v: i.v, k: i.k, ...(i.sub ? { sub: i.sub } : {}) })),
        ...(b.caption ? { caption: b.caption } : {}),
      };
    case "blockChart":
      return {
        type: "chart",
        title: b.title,
        rows: (b.rows || []).map((r) => ({ k: r.k, ...(r.sub ? { sub: r.sub } : {}), v: r.v })),
        ...(b.unit !== undefined && b.unit !== null ? { unit: b.unit } : {}),
        ...(b.dec !== undefined && b.dec !== null ? { dec: b.dec } : {}),
        ...(b.highlight !== undefined && b.highlight !== null ? { highlight: b.highlight } : {}),
        ...(b.note ? { note: b.note } : {}),
        ...(b.caption ? { caption: b.caption } : {}),
      };
    default:
      return null;
  }
}

function mapArticle(a) {
  const out = {
    id: a._id,
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    category: a.category,
    contentType: a.contentType || "Rehber",
    author: "finansindex",
    published_at: a.publishedAt,
    updated_at: a.updatedAt || a.publishedAt,
    read: a.readMinutes || 5,
    risk_level: a.riskLevel || "orta",
    review_status: a.reviewStatus || "yayimlandi",
    reviewed_by: "finansindex",
    sponsored: !!a.sponsored,
    disclaimer: "general",
    tags: a.tags || [],
    source_name: a.sourceName || "",
    source_urls: (a.sources || []).map((s) => (s.url ? { t: s.title, u: s.url } : s.title)),
    seo_title: a.seoTitle || a.title,
    meta_description: a.metaDescription || a.summary,
    body: (a.body || []).map(mapBlock).filter(Boolean),
  };
  if (a.sponsorName) out.sponsor_name = a.sponsorName;
  if (a.relatedTool) out.related_tool = a.relatedTool;
  if (a.hook) out.hook = a.hook;
  if (a.oranNotu) out.oranNotu = a.oranNotu;
  if (a.inBrief && a.inBrief.length) out.inBrief = a.inBrief;
  if (a.keyStat && a.keyStat.v) {
    out.keyStat = { v: a.keyStat.v, unit: a.keyStat.unit, k: a.keyStat.k, sub: a.keyStat.sub };
  }
  if (a.impact && a.impact.lead) {
    out.impact = { lead: a.impact.lead, points: a.impact.points || [] };
  }
  if (a.image && a.image.url) {
    out.featured_image = {
      src: `${a.image.url}?w=1200&fit=max&auto=format`,
      alt: a.image.alt || a.title,
      ...(a.image.credit ? { credit: a.image.credit } : {}),
    };
  }
  return out;
}

/* Sitemap elle tutulduğunda yeni yazılar unutuluyor. İçerikle aynı
   kaynaktan, her derlemede yeniden üretiliyor. Adresler routeToPath ile
   aynı şemayı izler. */
const STATIC_PATHS = [
  "", "finansal-araclar", "reklam-ve-is-birlikleri", "hakkimizda", "kunye",
  "editoryal-ilkeler", "duzeltme-politikasi", "reklam-politikasi", "kvkk",
  "cerez-politikasi", "kullanim-kosullari", "iletisim",
];

function writeSitemap({ categories, articles }) {
  const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const gun = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
  const bugun = new Date().toISOString().slice(0, 10);

  const girdi = (yol, tarih, sik) =>
    `  <url>\n    <loc>${esc(SITE_URL)}/${esc(yol)}</loc>\n` +
    (tarih ? `    <lastmod>${tarih}</lastmod>\n` : "") +
    `    <changefreq>${sik}</changefreq>\n  </url>`;

  const satirlar = [
    ...STATIC_PATHS.map((y) => girdi(y, bugun, y === "" ? "daily" : "monthly")),
    ...categories.map((c) => girdi(c.slug, bugun, "daily")),
    ...articles.map((a) => girdi(`${a.category}/${a.slug}`, gun(a.updated_at || a.published_at), "monthly")),
  ];

  try {
    fs.writeFileSync(
      SITEMAP,
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${satirlar.join("\n")}\n</urlset>\n`
    );
    console.log(`[icerik] sitemap.xml yeniden üretildi (${satirlar.length} adres).`);
  } catch (e) {
    console.warn(`[icerik] sitemap yazılamadı: ${e.message}`);
  }
}

const url =
  `https://${PROJECT}.apicdn.sanity.io/v${API}/data/query/${DATASET}` +
  `?query=${encodeURIComponent(QUERY)}`;

function keepExisting(reason) {
  if (fs.existsSync(OUT)) {
    const n = JSON.parse(fs.readFileSync(OUT, "utf8")).articles.length;
    console.warn(`[icerik] ${reason} — mevcut content.json korunuyor (${n} yazı).`);
    writeStatus("eskiYedek", `${reason}. Depodaki son kopya kullanıldı: ${n} yazı.`);
    process.exit(0);
  }
  console.error(`[icerik] ${reason} — ve elde content.json yok. Derleme durduruluyor.`);
  process.exit(1);
}

try {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) keepExisting(`Sanity ${res.status} döndürdü`);

  const { result } = await res.json();
  if (!result || !Array.isArray(result.articles)) keepExisting("Sanity beklenen biçimde yanıt vermedi");
  if (result.articles.length === 0) keepExisting("Sanity'de yayımlanmış yazı bulunamadı");

  const eksikKategori = result.articles.filter((a) => !a.category).map((a) => a.slug);
  if (eksikKategori.length) keepExisting(`kategorisi çözülemeyen yazı var: ${eksikKategori.join(", ")}`);

  const payload = {
    fetchedAt: new Date().toISOString(),
    categories: result.categories,
    articles: result.articles.map(mapArticle),
  };

  fs.writeFileSync(OUT, JSON.stringify(payload, null, 1) + "\n");
  writeStatus("guncel", `${payload.articles.length} yazı, ${payload.categories.length} kategori Sanity'den alındı.`);
  writeSitemap(payload);
  console.log(
    `[icerik] Sanity'den ${payload.articles.length} yazı, ${payload.categories.length} kategori alındı.`
  );
} catch (err) {
  keepExisting(`Sanity'ye erişilemedi (${err.message})`);
}
