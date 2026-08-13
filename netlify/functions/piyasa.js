/**
 * Piyasa verisi proxy'si.
 *
 * Neden sunucu tarafında?
 *  1) CORS: tarayıcıdan doğrudan çağrı çoğu sağlayıcıda engellenir.
 *  2) Önbellek: sağlayıcıyı her ziyaretçide değil, 60 saniyede bir çağırırız.
 *  3) Gizlilik: ileride ücretli bir sağlayıcıya geçilirse API anahtarı
 *     tarayıcıya sızmaz, yalnızca burada durur.
 *
 * Sağlayıcı değişecekse yalnızca SOURCE_URL ve normalize() güncellenir.
 */

const SOURCE_URL = "https://api.genelpara.com/embed/para-birimleri.json";
const ALTIN_URL = "https://api.genelpara.com/embed/altin.json";

const num = (v) => {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
};

export default async (req) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    // 60 sn tarayıcı, 120 sn CDN önbelleği — sağlayıcıya yük bindirmez
    "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
  };

  try {
    const [dovizRes, altinRes] = await Promise.all([
      fetch(SOURCE_URL, { headers: { "User-Agent": "FinansIndex/1.0" } }),
      fetch(ALTIN_URL, { headers: { "User-Agent": "FinansIndex/1.0" } }),
    ]);

    if (!dovizRes.ok || !altinRes.ok) throw new Error("Kaynak yanıt vermedi");

    const doviz = await dovizRes.json();
    const altin = await altinRes.json();

    const pick = (obj, key, label, unit) => {
      const d = obj?.[key];
      if (!d) return null;
      const satis = num(d.satis) ?? num(d.alis);
      if (satis == null) return null;
      return {
        k: label,
        v: satis,
        d: num(d.degisim),
        unit,
        alis: num(d.alis),
        satis: num(d.satis),
      };
    };

    const items = [
      pick(doviz, "USD", "Dolar", "₺"),
      pick(doviz, "EUR", "Euro", "₺"),
      pick(doviz, "GBP", "Sterlin", "₺"),
      pick(altin, "GA", "Gram Altın", "₺"),
      pick(altin, "C", "Çeyrek Altın", "₺"),
      pick(altin, "ONS", "Ons Altın", "$"),
      pick(altin, "GUMUS", "Gümüş", "₺"),
      pick(altin, "PLATIN", "Platin", "₺"),
    ].filter(Boolean);

    if (!items.length) throw new Error("Veri boş döndü");

    return new Response(
      JSON.stringify({
        ok: true,
        updatedAt: new Date().toISOString(),
        source: "GenelPara",
        items,
      }),
      { headers }
    );
  } catch (err) {
    // Hata durumunda sahte veri ÜRETMİYORUZ. Arayüz "veri alınamadı" gösterir.
    return new Response(
      JSON.stringify({ ok: false, error: String(err.message || err), items: [] }),
      { status: 200, headers }
    );
  }
};

export const config = { path: "/api/piyasa" };
