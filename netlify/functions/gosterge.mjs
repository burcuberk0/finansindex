/**
 * Resmî gösterge servisi — TÜFE, kira artış oranı, politika faizi.
 *
 * TASARIM KARARI: Her göstergeyi otomatikleştirmiyoruz.
 *
 *   TÜFE ve kira artış oranı → EVDS'den OTOMATİK.
 *     TÜİK aylık endeks yayımlar; kira artış oranı bu endeksten hesaplanır.
 *     Hazır oran serisine güvenmek yerine DÜZEY ENDEKSİNDEN kendimiz
 *     hesaplıyoruz ve kullanılan endeks değerlerini çıktıda gösteriyoruz.
 *     Böylece rakam TÜİK bülteniyle birebir karşılaştırılabilir.
 *
 *   Politika faizi → MANUEL.
 *     İnternette yaygın olarak paylaşılan TP.APIFON4 kodu politika faizi
 *     DEĞİL, "TCMB ağırlıklı ortalama fonlama maliyeti"dir. İkisi farklı
 *     değerlerdir ve karıştırmak hatalı bilgi üretir. Politika faizi yılda
 *     sekiz kez açıklandığı için elle güncellemek hem güvenli hem kolaydır.
 *
 * KURULUM: evds3.tcmb.gov.tr → ücretsiz kayıt → Profilim → API Key.
 * Anahtar Netlify'da EVDS_API_KEY ortam değişkeni olarak tanımlanır.
 * Anahtar yoksa TÜFE bölümü boş döner, sayfa çalışmaya devam eder.
 *
 * SERİ KODU DOĞRULAMA: /api/gosterge?debug=1
 * EVDS'den dönen resmî seri etiketini ve ham gözlemleri gösterir.
 * Kodun doğru seriye işaret ettiğini yayından önce buradan teyit edin.
 * 2025=100 bazlı yeni serilere geçişte kod değişmiş olabilir.
 */

/* ----------------------------------------------------- MANUEL GÖSTERGELER */
/* TCMB Para Politikası Kurulu kararından sonra elle güncellenir.
   Kaynak: TCMB — PPK karar metni. */
const POLITIKA_FAIZI = {
  deger: null,                 // örn. 39.5  → açıklandığında yazılır
  tarih: null,                 // örn. "2026-09-11"
  aciklama: "1 hafta vadeli repo ihale faiz oranı",
  kaynak: "TCMB — Para Politikası Kurulu kararı",
};

/* ------------------------------------------------------------ EVDS AYARI */
const EVDS_BASE = "https://evds2.tcmb.gov.tr/service/evds";

/* TÜFE genel endeksi. 2025=100 bazına geçişte kod değişebilir;
   debug modundan dönen resmî etiketle teyit edin. */
const TUFE_SERI = "TP.FG.J0";

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
};

const ddmmyyyy = (d) => {
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
};

async function fetchTufe(key) {
  const end = new Date();
  const start = new Date(end.getFullYear() - 3, end.getMonth(), 1);
  const params = new URLSearchParams({
    series: TUFE_SERI,
    startDate: ddmmyyyy(start),
    endDate: ddmmyyyy(end),
    type: "json",
    frequency: "5",            // aylık
  });
  const res = await fetch(`${EVDS_BASE}/${params.toString()}`, {
    headers: { key, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`EVDS ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  const field = TUFE_SERI.replace(/\./g, "_");

  const seri = items
    .map((it) => ({ tarih: it.Tarih, v: num(it[field]) }))
    .filter((x) => x.v != null);

  return { seri, raw: data };
}

/**
 * Kira artış oranı = on iki aylık ortalamalara göre TÜFE değişimi.
 * Türk Borçlar Kanunu konut kiralarında bu seriyi esas alır.
 *
 * Hesap: son 12 ayın endeks ortalaması ÷ önceki 12 ayın endeks ortalaması − 1
 */
function kiraArtisOrani(seri) {
  if (seri.length < 24) return null;
  const son = seri.slice(-24);
  const avg = (a) => a.reduce((t, x) => t + x.v, 0) / a.length;
  const son12 = son.slice(12);
  const onceki12 = son.slice(0, 12);
  const oran = (avg(son12) / avg(onceki12) - 1) * 100;
  return {
    oran: Number(oran.toFixed(2)),
    donem: son12[son12.length - 1].tarih,
    son12Ortalama: Number(avg(son12).toFixed(2)),
    onceki12Ortalama: Number(avg(onceki12).toFixed(2)),
    ilkAy: son12[0].tarih,
    sonAy: son12[son12.length - 1].tarih,
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
    return new Response(JSON.stringify(out), { headers });
  }

  try {
    const { seri, raw } = await fetchTufe(key);
    if (debug) {
      return new Response(JSON.stringify({
        seriKodu: TUFE_SERI,
        resmiEtiket: raw.items && raw.items.length ? Object.keys(raw.items[0]) : null,
        gozlemSayisi: seri.length,
        ilkUcGozlem: seri.slice(0, 3),
        sonUcGozlem: seri.slice(-3),
        hesaplananKiraArtisi: kiraArtisOrani(seri),
        hesaplananYillikTufe: yillikTufe(seri),
      }, null, 2), { headers: { ...headers, "Cache-Control": "no-store" } });
    }
    out.enflasyon = yillikTufe(seri);
    out.kiraArtisi = kiraArtisOrani(seri);
  } catch (e) {
    out.errors.evds = String(e.message || e);
  }

  return new Response(JSON.stringify(out), { headers });
};
