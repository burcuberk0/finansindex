/* Derleme sonrası: her yazı için paylaşım etiketli HTML kopyası.
 *
 * Site tek sayfalık bir uygulama (SPA). Başlık, açıklama ve görsel etiketleri
 * sayfa açıldıktan sonra JavaScript ile yazılıyor. WhatsApp, X, LinkedIn ve
 * Facebook önizleme botları JavaScript çalıştırmaz; bu yüzden her yazı
 * paylaşıldığında ana sayfanın başlığı görünüyordu ve görsel çıkmıyordu.
 *
 * Bu betik dist/index.html'i şablon alır ve her yazı için
 * dist/<kategori>/<slug>.html dosyası yazar. Netlify, /<kategori>/<slug>
 * adresine gelen isteği önce bu dosyayla karşılar; uygulama aynı şekilde
 * açılır, yalnızca <head> içi o yazıya özeldir. Dosya yoksa mevcut
 * yakala-tümü kuralı index.html'e düşer, yani hiçbir adres kırılmaz.
 *
 * Hata olursa derleme DURMAZ; o yazı atlanır.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const CONTENT = path.join(ROOT, "src", "content.json");
const SITE = "https://finansindex.com";
const SITE_NAME = "FinansIndex";
const DEFAULT_IMG = "/img/kapak/site.png";

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const abs = (u) => (!u ? null : /^https?:\/\//.test(u) ? u : SITE + u);

function headTags({ title, description, url, image, type, jsonLd }) {
  const t = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
  ];
  if (image) {
    t.push(
      `<meta property="og:image" content="${esc(image)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="675" />`,
      `<meta name="twitter:image" content="${esc(image)}" />`
    );
  }
  t.push(
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`
  );
  if (jsonLd) t.push(`<script type="application/ld+json" id="fi-jsonld">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`);
  return t.join("\n    ");
}

/* Şablondaki genel etiketleri çıkarıp yazıya özel olanları ekler. */
function inject(template, tags) {
  return template
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta\s+name="description"[^>]*>\s*/i, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/i, "")
    .replace(/<meta\s+property="og:(type|title|description|url|image)"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:[^"]+"[^>]*>\s*/gi, "")
    .replace(/<\/head>/i, `    ${tags}\n  </head>`);
}

function main() {
  const tplPath = path.join(DIST, "index.html");
  if (!fs.existsSync(tplPath)) { console.warn("[meta] dist/index.html yok, atlandı."); return; }
  const tpl = fs.readFileSync(tplPath, "utf8");
  const content = JSON.parse(fs.readFileSync(CONTENT, "utf8"));
  const cats = Object.fromEntries((content.categories || []).map((c) => [c.slug, c.name]));
  const hasImg = (p) => p && fs.existsSync(path.join(DIST, p.replace(/^\//, "")));

  /* Ana sayfanın kendisine de genel görsel eklenir. */
  if (hasImg(DEFAULT_IMG) && !/property="og:image"/.test(tpl)) {
    const home = tpl.replace(/<\/head>/i,
      `    <meta property="og:image" content="${SITE + DEFAULT_IMG}" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="675" />\n    <meta name="twitter:card" content="summary_large_image" />\n    <meta name="twitter:image" content="${SITE + DEFAULT_IMG}" />\n  </head>`);
    fs.writeFileSync(tplPath, home);
  }

  let ok = 0;
  for (const a of content.articles || []) {
    try {
      if (!a.slug || !a.category) continue;
      const pathPart = `/${a.category}/${a.slug}`;
      const url = SITE + pathPart;
      const img = (a.featured_image && a.featured_image.src) || (hasImg(a.og_image) ? a.og_image : null) || (hasImg(DEFAULT_IMG) ? DEFAULT_IMG : null);
      const image = abs(img);
      const title = a.seo_title || `${a.title} | ${SITE_NAME}`;
      const description = a.meta_description || a.summary || "";
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: a.title,
        description: a.summary,
        datePublished: a.published_at,
        dateModified: a.updated_at || a.published_at,
        author: { "@type": "Organization", name: SITE_NAME, url: SITE },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE },
        mainEntityOfPage: url,
        articleSection: cats[a.category],
        keywords: (a.tags || []).join(", "),
        isAccessibleForFree: true,
        ...(image ? { image: [image] } : {}),
      };
      const html = inject(tpl, headTags({ title, description, url, image, type: "article", jsonLd }));
      const out = path.join(DIST, a.category, `${a.slug}.html`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, html);
      ok++;
    } catch (e) {
      console.warn(`[meta] ${a.slug} atlandı:`, e.message);
    }
  }
  console.log(`[meta] ${ok} yazı için paylaşım etiketli sayfa yazıldı.`);
}

main();
