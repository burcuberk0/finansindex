# FinansIndex Studio

Sanity içerik şemasının kaynak kodu. Bu klasör siteyi etkilemez;
Netlify yalnızca depo kökündeki package.json ile derleme yapar.

- Proje: u13dxmis
- Veri kümesi: production
- Workspace: default

## Şema değişikliği nasıl yayımlanır

studio/ altında bir şey değiştirip main dalına gönderdiğinde
.github/workflows/sanity-schema.yml otomatik çalışır ve şemayı yayımlar.
Elle tetiklemek için: GitHub → Actions → "Sanity semasini yayimla" → Run workflow.

## Önemli not

Şema alanlarında validation içinde Rule.custom(...) KULLANMAYIN.
Özel doğrulama fonksiyonları şema manifestine yazılamadığı için
Sanity panelindeki Studio onları çalıştıramaz ve alan sürekli
"This validator is unavailable..." hatası verir. Bunun yerine
required(), min(), max(), uri() gibi serileştirilebilir
kuralları kullanın.
