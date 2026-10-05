/**
 * Resmî gösterge servisi — TÜFE, kira artış oranı, politika faizi.
 *
 * TASARIM KARARI: Her göstergeyi otomatikleştirmiyoruz.
 *
 *   TÜFE ve kira artış oranı → EVDS'den OTOMATİK.
 *     Kira artış oranı hazır oran serisinden değil, DÜZEY ENDEKSİNDEN
 *     hesaplanır. Kullanılan endeks ortalamaları çıktıda gösterilir;
 *     böylece rakam TÜİK bülteniyle birebir karşılaştırılabilir.
 *
 *   Politika faizi → MANUEL.
 *     İnternette yaygın paylaşılan TP.APIFON4 kodu politika faizi DEĞİL,
 *     "TCMB ağırlıklı ortalama fonlama maliyeti"dir. Karıştırmak hatalı
 *     bilgi üretir. Yılda sekiz kez açıklanan bir rakamı elle güncellemek
 *     yanlış seri çekmekten güvenlidir.
 *
 * EVDS API SÖZLEŞMESİ (2026 itibarıyla)
 *   - Uç: https://evds3.tcmb.gov.tr/igmevdsms-dis/
 *     Eski evds2.tcmb.gov.tr/service/evds/ yolu 2025 sonunda kapandı ve
 *     artık EVDS web arayüzünün HTML'ini döndürüyor.
 *   - Parametreler yolun SONUNA eklenir, başında "?" OLMAZ. Soru işareti
 *     eklenirse servis isteği reddeder.
 *   - Anahtar yalnızca HTTP başlığında (key) gönderilir; URL'de gönderim
 *     Nisan 2024'ten beri kabul edilmiyor ve anahtarı sunucu günlüklerine
 *     yazdırır.
 *   - Tarih biçimi GG-AA-YYYY. Yanlış biçim hata değil, farklı bir dönem
 *     döndürür — sessiz hata riski.
 *   - Sütun adı noktasız gelir: TP.FG.J0 istenir, yanıtta TP_FG_J0 olur.
 *
 * KURULUM: evds3.tcmb.gov.tr → ücretsiz kayıt → Profilim → API Key.
 * Netlify'da EVDS_API_KEY ortam değişkeni olarak tanımlanır.
 *
 * TEŞHİS: /api/gosterge?debug=1
 */

/* ----------------------------------------------------- MANUEL GÖSTERGELER */
/* TCMB Para Politikası Kurulu kararından sonra elle güncellenir. */
const POLITIKA_FAIZI = {
  deger: null,                 // örn. 39.5 → açıklandığında yazılır
  tarih: null,                 // örn. "2026-09-11"
  aciklama: "1 hafta vadeli repo ihale faiz oranı",
  kaynak: "TCMB — Para Politikası Kurulu kararı",
};

/* ------------------------------------------------------------ EVDS AYARI */
const EVDS_BASE = "https://evds3.tcmb.gov.tr/igmevdsms-dis";

/* TÜFE genel endeksi.
   2025=100 bazına geçişte seri kodu değişti; yeni kod önce denenir,
   dönmezse eski seriye düşülür. Hangisinin kullanıldığı debug çıktısında
   yazar — yayından önce oradan teyit edin. */
const TUFE_SERILER = [
  "TP.TUKFIY2025.GENEL",   // 2025=100 bazlı yeni seri
  "TP.FG.J0",              // 2003=100 bazlı eski seri
];

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
};

const ddmmyyyy = (d) => {
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
};

async function fetchSeri(key, seriKodu) {
  const end = new Date();
  const start = new Date(end.getFullYear() - 4, end.getMonth(), 1);

  /* Parametreler yolun sonuna, "?" OLMADAN eklenir. */
  const path = [
    `series=${seriKodu}`,
    `startDate=${ddmmyyyy(start)}`,
    `endDate=${ddmmyyyy(end)}`,
    "type=json",
    "frequency=5",            // 5 = aylık
  ].join("&");

  const res = await fetch(`${EVDS_BASE}/${path}`, {
    headers: {
      key,                                     // anahtar yalnızca başlıkta
      Accept: "application/json",
      "User-Agent": "FinansIndexBot/1.0 (+https://finansindex.com)",
    },
  });

  const text = await res.text();
  if (/^\s*<(!doctype|html)/i.test(text)) {
    return { ok: false, seriKodu, status: res.status, neden: "HTML döndü — uç adresi yanlış olabilir", ilk120: text.slice(0, 120) };
  }
  if (!res.ok) {
    return { ok: false, seriKodu, status: res.status, neden: "HTTP hatası", ilk120: text.slice(0, 120) };
  }

  let data;
  try { data = JSON.parse(text); }
  catch { return { ok: false, seriKodu, status: res.status, neden: "JSON ayrıştırılamadı", ilk120: text.slice(0, 120) }; }

  const items = Array.isArray(data.items) ? data.items : [];
  const field = seriKodu.replace(/\./g, "_");   // TP.FG.J0 → TP_FG_J0

  const seri = items
    .map((it) => ({ tarih: it.Tarih, v: num(it[field]) }))
    .filter((x) => x.v != null);

  if (!seri.length) {
    return {
      ok: false, seriKodu, status: res.status,
      neden: "JSON geldi ama seri boş — seri kodu geçersiz olabilir",
      donenAlanlar: items.length ? Object.keys(items[0]) : null,
    };
  }
  return { ok: true, seriKodu, seri, donenAlanlar: Object.keys(items[0]) };
}

async function fetchTufe(key) {
  const denemeler = [];
  for (const kod of TUFE_SERILER) {
    try {
      const r = await fetchSeri(key, kod);
      denemeler.push({ ...r, seri: undefined });
      if (r.ok) return { seri: r.seri, kullanilanSeri: kod, donenAlanlar: r.donenAlanlar, denemeler };
    } catch (e) {
      denemeler.push({ seriKodu: kod, ok: false, hata: String(e.message || e) });
    }
  }
  const err = new Error("EVDS'den geçerli seri alınamadı");
  err.denemeler = denemeler;
  throw err;
}

/**
 * Kira artış oranı = on iki aylık ortalamalara göre TÜFE değişimi.
 * Türk Borçlar Kanunu konut kiralarında bu seriyi esas alır.
 *
 * Hesap: son 12 ayın endeks ortalaması ÷ önceki 12 ayın ortalaması − 1
 */
function kiraArtisOrani(seri) {
  if (seri.length < 24) return null;
  const son24 = seri.slice(-24);
  const avg = (a) => a.reduce((t, x) => t + x.v, 0) / a.length;
  const son12 = son24.slice(12);
  const onceki12 = son24.slice(0, 12);
  const oran = (avg(son12) / avg(onceki12) - 1) * 100;
  return {
    oran: Number(oran.toFixed(2)),
    donem: son12[son12.length - 1].tarih,
    son12Ortalama: Number(avg(son12).toFixed(2)),
    onceki12Ortalama: Number(avg(onceki12).toFixed(2)),
    son12Araligi: `${son12[0].tarih} – ${son12[son12.length - 1].tarih}`,
    onceki12Araligi: `${onceki12[0].tarih} – ${onceki12[onceki12.length - 1].tarih}`,
  };
}

/** Yıllık TÜFE değişimi: son ay ÷ 12 ay öncesi − 1 */
function yillikTufe(seri) {
  if (seri.length < 13) return null;
  const son = seri[seri.length - 1];
  const gecenYil = seri[seri.length - 13];
  return {
    oran: Number(((son.v / gecenYil.v - 1) * 100).toFixed(2)),
    donem: son.tarih,
    sonEndeks: son.v,
    oncekiEndeks: gecenYil.v,
  };
}

export default async (req) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
  };
  const debug = new URL(req.url).searchParams.get("debug") === "1";
  const key = process.env.EVDS_API_KEY;
  const noStore = { ...headers, "Cache-Control": "no-store" };

  const out = {
    ok: true,
    updatedAt: new Date().toISOString(),
    politikaFaizi: POLITIKA_FAIZI.deger != null ? POLITIKA_FAIZI : null,
    enflasyon: null,
    kiraArtisi: null,
    errors: {},
  };

  if (!key) {
    out.errors.evds = "EVDS_API_KEY tanımlı değil";
    if (debug) {
      return new Response(JSON.stringify({
        anahtarVar: false,
        ipucu: "Netlify → Project configuration → Environment variables → EVDS_API_KEY ekleyin, sonra yeniden derleyin.",
      }, null, 2), { headers: noStore });
    }
    return new Response(JSON.stringify(out), { headers });
  }

  try {
    const { seri, kullanilanSeri, donenAlanlar, denemeler } = await fetchTufe(key);
    if (debug) {
      return new Response(JSON.stringify({
        anahtarVar: true,
        uc: EVDS_BASE,
        kullanilanSeri,
        donenAlanlar,
        denemeler,
        gozlemSayisi: seri.length,
        ilkUcGozlem: seri.slice(0, 3),
        sonUcGozlem: seri.slice(-3),
        hesaplananKiraArtisi: kiraArtisOrani(seri),
        hesaplananYillikTufe: yillikTufe(seri),
        kontrolNotu: "Kira artış oranını TÜİK'in açıkladığı on iki aylık ortalama TÜFE değişimiyle karşılaştırın.",
      }, null, 2), { headers: noStore });
    }
    out.enflasyon = yillikTufe(seri);
    out.kiraArtisi = kiraArtisOrani(seri);
    out.seriKodu = kullanilanSeri;
  } catch (e) {
    out.errors.evds = String(e.message || e);
    if (debug) {
      return new Response(JSON.stringify({
        anahtarVar: true,
        anahtarUzunluk: key.length,
        uc: EVDS_BASE,
        hata: String(e.message || e),
        denemeler: e.denemeler || null,
      }, null, 2), { headers: noStore });
    }
  }

  return new Response(JSON.stringify(out), { headers });
};
