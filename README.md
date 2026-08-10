# FinansIndex — Yayına alma

Vite + React ile kurulmuş, Netlify'a hazır proje. Build doğrulandı.

## Yerelde çalıştırma

Node.js 20+ gerekir.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ klasörünü üretir
npm run preview  # build çıktısını yerelde test eder
```

## Netlify'a yükleme — üç yol

### A) Sürükle bırak (en hızlı, 2 dakika)

1. `npm run build` çalıştırın.
2. https://app.netlify.com/drop adresine gidin.
3. Oluşan **`dist`** klasörünü tarayıcıya sürükleyin.

Anında `rastgele-isim.netlify.app` adresinde yayına girer. Dezavantajı: her
güncellemede tekrar sürüklemeniz gerekir.

### B) GitHub üzerinden (önerilen)

1. GitHub'da boş bir repo açın (örn. `finansindex`).
2. Bu klasörde:

```bash
git init
git add .
git commit -m "FinansIndex ilk sürüm"
git branch -M main
git remote add origin https://github.com/KULLANICI/finansindex.git
git push -u origin main
```

3. Netlify → **Add new site → Import an existing project → GitHub** → repoyu seçin.
4. Build ayarları `netlify.toml` dosyasından otomatik okunur. Elle girmeniz gerekmez:
   - Build command: `npm run build`
   - Publish directory: `dist`

Bundan sonra `main` dalına her push otomatik olarak yayına gider.

### C) Netlify CLI

```bash
npm i -g netlify-cli
netlify login
netlify init      # siteyi oluşturur ve repoya bağlar
netlify deploy --prod
```

## Alan adını bağlama

Netlify panelinde: **Domain management → Add a domain → `finansindex.com`**

Sonrasında iki seçenek sunulur:

- **Netlify DNS (önerilen):** Netlify size 4 adet name server verir. Alan adını
  aldığınız firmanın panelinde (GoDaddy, Turhost, Natro vb.) name server'ları
  bunlarla değiştirirsiniz. Yayılma 1–24 saat sürer. SSL sertifikası otomatik gelir.
- **Mevcut DNS'te kalmak:** Netlify panelde size gereken A ve CNAME kayıtlarını
  gösterir. Bu kayıtlar zaman zaman güncellendiği için değerleri panelden
  kopyalayın, başka bir kaynaktan değil.

`www.finansindex.com` → `finansindex.com` yönlendirmesini Netlify otomatik kurar.

## Önemli: bu sürümü hangi adreste yayınlamalısınız?

Bu bir **SPA**'dır; HTML sunucuda üretilmez. Arama motorları JavaScript çalıştırabilse
de indeksleme daha yavaş ve güvenilmezdir. Bu nedenle:

- **Şimdi:** bu sürümü `netlify.app` adresinde ya da `demo.finansindex.com`
  alt alan adında tutun. Tasarım onayı, iç kullanım ve reklamveren sunumu için yeterli.
- **Ana alan adı (`finansindex.com`):** Next.js sürümüne ayrılmalı. SEO, ilk yükleme
  hızı ve sosyal medya önizlemeleri için gerekli olan sunucu tarafı HTML üretimi
  ancak orada mümkün.

`robots.txt` ve `sitemap.xml` dosyaları `public/` içinde hazır. Demo alt alan adında
yayınlarsanız `public/robots.txt` içeriğini geçici olarak şununla değiştirin:

```
User-agent: *
Disallow: /
```

Böylece demo sürüm indekslenip ana alan adıyla içerik çakışması yaratmaz.

## Klasör yapısı

```
├─ index.html            # kök HTML, meta etiketleri
├─ netlify.toml          # build ayarları, SPA yönlendirmesi, cache başlıkları
├─ vite.config.js
├─ public/
│  ├─ robots.txt
│  ├─ sitemap.xml        # 30 URL
│  └─ favicon.svg
└─ src/
   ├─ main.jsx
   ├─ global.css
   └─ FinansIndex.jsx    # tüm uygulama: veri katmanı + bileşenler + sayfalar
```

Sonraki adımda `FinansIndex.jsx` içindeki bölümler (veri katmanı, bileşenler,
sayfalar) ayrı dosyalara bölünüp Next.js route yapısına taşınır.
