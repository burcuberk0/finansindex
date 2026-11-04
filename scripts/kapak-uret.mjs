/* Paylaşım ve arama görselleri (kapak) üretimi.
 *
 * Her yazı için 1200x675 PNG üretir: public/img/kapak/<slug>.png
 * Görsel, sitedeki veri kartının (DataCard) aynısıdır: koyu zemin, şarap
 * kırmızısı çizgi, yazının manşet rakamı. Sahte grafik ya da stok fotoğraf
 * yok; görseldeki her rakam yazının kendi verisinden gelir.
 *
 * Neden: Google Discover ve WhatsApp / X önizlemeleri en az 1200 px genişlikte
 * bir görsel ister. Görseli olmayan yazı bu kanallarda ya hiç görünmez ya da
 * boş kartla görünür. Bu betik her derlemede çalıştığı için yeni yazıların
 * kapağı da kendiliğinden oluşur; elle görsel hazırlamak gerekmez.
 *
 * Sanity'de "Öne çıkan görsel" yüklenmiş yazılarda o görsel kullanılır,
 * bu kapak yalnızca paylaşım ve arama için yedek olarak üretilir.
 *
 * Hata olursa derleme DURMAZ: o yazının kapağı atlanır, uyarı basılır.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CONTENT = path.join(ROOT, "src", "content.json");
const OUT_DIR = path.join(ROOT, "public", "img", "kapak");

const W = 1200;
const H = 675;

const C = {
  ink: "#14100E",
  wine: "#8C1D33",
  gold: "#C8A64B",
  text: "#FFFFFF",
  soft: "#EDE8E0",
  unit: "#B4ADA5",
  muted: "#8F8880",
};

const font = (pkg, file) =>
  fs.readFileSync(path.join(path.dirname(require.resolve(`${pkg}/package.json`)), "files", file));

function loadFonts() {
  const list = [];
  const add = (name, pkg, base, weight) => {
    for (const sub of ["latin", "latin-ext"]) {
      list.push({ name: sub === "latin" ? name : `${name} Ext`, weight, style: "normal", data: font(pkg, `${base}-${sub}-${weight}-normal.woff`) });
    }
  };
  add("Inter", "@fontsource/inter", "inter", 500);
  add("Inter", "@fontsource/inter", "inter", 600);
  add("Space Grotesk", "@fontsource/space-grotesk", "space-grotesk", 600);
  add("Space Grotesk", "@fontsource/space-grotesk", "space-grotesk", 700);
  add("JetBrains Mono", "@fontsource/jetbrains-mono", "jetbrains-mono", 500);
  add("JetBrains Mono", "@fontsource/jetbrains-mono", "jetbrains-mono", 600);
  return list;
}

/* Her yazı tipi iki alt kümeyle (latin + latin-ext) yükleniyor; Türkçe
   karakterler (ğ, ş, ı, İ) ve ₺ latin-ext dosyasında. Satori aynı adlı iki
   dosya arasında karakter araması yapmadığı için ikinci küme "Ext" adıyla
   ayrı yükleniyor ve font-family listesinde yedek olarak duruyor. */

/* Satori, React yerine düz nesne kabul ediyor. */
const h = (style, children) => ({ type: "div", props: { style: { display: "flex", ...style }, children } });

const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s || "");

function card(a, catName) {
  const stat = a.keyStat && a.keyStat.v ? a.keyStat : null;
  const head = h({ justifyContent: "space-between", alignItems: "center", width: "100%" }, [
    h({ fontFamily: "Space Grotesk, Space Grotesk Ext, Inter Ext", fontWeight: 700, fontSize: 34, color: C.text, letterSpacing: -1.4 }, "FinansIndex"),
    h({ fontFamily: "JetBrains Mono, JetBrains Mono Ext, Inter Ext", fontWeight: 600, fontSize: 20, color: C.gold, letterSpacing: 3, textTransform: "uppercase" },
      catName.toLocaleUpperCase("tr-TR")),
  ]);

  let main;
  if (stat) {
    const v = String(stat.v);
    const vSize = v.length <= 4 ? 200 : v.length <= 7 ? 168 : 132;
    main = h({ flexDirection: "column" }, [
      h({ alignItems: "baseline" }, [
        h({ fontFamily: "JetBrains Mono, JetBrains Mono Ext, Inter Ext", fontWeight: 600, fontSize: vSize, color: C.text, letterSpacing: -6, lineHeight: 0.9 }, v),
        stat.unit ? h({ fontFamily: "JetBrains Mono, JetBrains Mono Ext, Inter Ext", fontWeight: 500, fontSize: 52, color: C.unit, marginLeft: 22 }, stat.unit) : null,
      ].filter(Boolean)),
      stat.k ? h({ fontFamily: "Inter, Inter Ext, Inter Ext", fontWeight: 500, fontSize: 36, color: C.soft, lineHeight: 1.3, marginTop: 30, maxWidth: 960 }, clip(stat.k, 110)) : null,
    ].filter(Boolean));
  } else {
    main = h({ flexDirection: "column" }, [
      h({ fontFamily: "Space Grotesk, Space Grotesk Ext, Inter Ext", fontWeight: 600, fontSize: a.title.length > 80 ? 54 : 64, color: C.text, lineHeight: 1.15, letterSpacing: -1.5, maxWidth: 1000 },
        clip(a.title, 120)),
      a.hook ? h({ fontFamily: "Inter, Inter Ext, Inter Ext", fontWeight: 500, fontSize: 32, color: C.soft, lineHeight: 1.3, marginTop: 28, maxWidth: 960 }, clip(a.hook, 100)) : null,
    ].filter(Boolean));
  }

  const foot = h({ justifyContent: "space-between", alignItems: "flex-end", width: "100%", borderTop: "1px solid rgba(255,255,255,.14)", paddingTop: 26 }, [
    h({ fontFamily: "Inter, Inter Ext, Inter Ext", fontWeight: 600, fontSize: 24, color: C.soft, maxWidth: 820, lineHeight: 1.3 },
      stat ? clip(a.title, 90) : (stat === null && a.keyStat && a.keyStat.sub) ? a.keyStat.sub : "Finansı anlamanın en kolay yolu"),
    h({ fontFamily: "JetBrains Mono, JetBrains Mono Ext, Inter Ext", fontWeight: 500, fontSize: 20, color: C.muted, letterSpacing: 1 }, "finansindex.com"),
  ]);

  return h(
    { width: W, height: H, backgroundColor: C.ink, position: "relative" },
    [
      /* Sitedeki kartla aynı ince yatay çizgi dokusu */
      h({ position: "absolute", left: 0, top: 0, width: W, height: H,
          backgroundImage: "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px)", backgroundSize: `100% ${Math.round(H * 0.14)}px` }, []),
      h({ position: "absolute", left: 0, top: 0, width: 8, height: H, backgroundColor: C.wine }, []),
      h({ flexDirection: "column", justifyContent: "space-between", width: W, height: H, padding: "56px 72px 48px 80px" }, [head, main, foot]),
    ]
  );
}

async function main() {
  let satori, Resvg;
  try {
    satori = (await import("satori")).default;
    ({ Resvg } = await import("@resvg/resvg-js"));
  } catch (e) {
    console.warn("[kapak] Görsel kütüphaneleri yüklenemedi, kapaklar atlandı:", e.message);
    return;
  }

  const content = JSON.parse(fs.readFileSync(CONTENT, "utf8"));
  const cats = Object.fromEntries((content.categories || []).map((c) => [c.slug, c.name]));
  const fonts = loadFonts();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0;
  for (const a of content.articles || []) {
    try {
      const svg = await satori(card(a, cats[a.category] || "FinansIndex"), { width: W, height: H, fonts });
      const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
      fs.writeFileSync(path.join(OUT_DIR, `${a.slug}.png`), png);
      a.og_image = `/img/kapak/${a.slug}.png`;
      ok++;
    } catch (e) {
      console.warn(`[kapak] ${a.slug} atlandı:`, e.message);
    }
  }

  /* Ana sayfa ve yazı dışı sayfalar için genel paylaşım görseli */
  try {
    const site = { title: "Ekonomideki gelişmelerin bütçene etkisi, sade bir dille", hook: "Kredi, mevduat, yatırım ve sigorta rehberleri · Hesaplama araçları" };
    const svg = await satori(card(site, "Finansı anlamanın en kolay yolu"), { width: W, height: H, fonts });
    fs.writeFileSync(path.join(OUT_DIR, "site.png"), new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng());
  } catch (e) {
    console.warn("[kapak] Genel görsel atlandı:", e.message);
  }

  /* og_image alanı content.json'a yazılır; uygulama paylaşım etiketlerinde onu kullanır. */
  fs.writeFileSync(CONTENT, JSON.stringify(content, null, 1) + "\n");
  console.log(`[kapak] ${ok}/${(content.articles || []).length} kapak üretildi.`);
}

main().catch((e) => console.warn("[kapak] Beklenmeyen hata, derleme sürüyor:", e.message));
