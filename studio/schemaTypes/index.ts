import {defineType, defineField, defineArrayMember} from 'sanity'

/* Türkçe karakterleri doğru çeviren slug üreticisi */
const trSlugify = (input: string) =>
  input
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

/* ---------- Gövde blokları ---------- */

const blockParagraph = defineType({
  name: 'blockParagraph',
  title: 'Paragraf',
  type: 'object',
  fields: [
    defineField({
      name: 't',
      title: 'Metin',
      type: 'text',
      description: 'Kalın yazmak için **iki yıldız** arasına al.',
    }),
  ],
})

const blockHeading = defineType({
  name: 'blockHeading',
  title: 'Ara başlık',
  type: 'object',
  fields: [defineField({name: 't', title: 'Başlık', type: 'string'})],
})

const blockList = defineType({
  name: 'blockList',
  title: 'Madde listesi',
  type: 'object',
  fields: [
    defineField({
      name: 'items',
      title: 'Maddeler',
      type: 'array',
      of: [defineArrayMember({type: 'text'})],
    }),
  ],
})

const blockNote = defineType({
  name: 'blockNote',
  title: 'Uyarı kutusu',
  type: 'object',
  fields: [defineField({name: 't', title: 'Metin', type: 'text'})],
})

const blockQuote = defineType({
  name: 'blockQuote',
  title: 'Vurgu cümlesi',
  type: 'object',
  fields: [defineField({name: 't', title: 'Cümle', type: 'text'})],
})

const tableRow = defineType({
  name: 'tableRow',
  title: 'Satır',
  type: 'object',
  fields: [
    defineField({
      name: 'cells',
      title: 'Hücreler',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
    }),
  ],
})

const blockTable = defineType({
  name: 'blockTable',
  title: 'Tablo',
  type: 'object',
  fields: [
    defineField({
      name: 'head',
      title: 'Başlık satırı',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
    }),
    defineField({
      name: 'rows',
      title: 'Satırlar',
      type: 'array',
      of: [defineArrayMember({type: 'tableRow', title: 'Satır'})],
    }),
    defineField({name: 'caption', title: 'Tablo altı not', type: 'text'}),
  ],
})

const statItem = defineType({
  name: 'statItem',
  title: 'Rakam',
  type: 'object',
  fields: [
    defineField({name: 'v', title: 'Değer', type: 'string'}),
    defineField({name: 'k', title: 'Ne anlama geliyor', type: 'string'}),
    defineField({name: 'sub', title: 'Alt not', type: 'string'}),
  ],
})

const blockStats = defineType({
  name: 'blockStats',
  title: 'Rakam kutuları',
  type: 'object',
  fields: [
    defineField({
      name: 'items',
      title: 'Rakamlar',
      type: 'array',
      of: [defineArrayMember({type: 'statItem', title: 'Rakam'})],
    }),
    defineField({name: 'caption', title: 'Kaynak notu', type: 'text'}),
  ],
})

const chartRow = defineType({
  name: 'chartRow',
  title: 'Çubuk',
  type: 'object',
  fields: [
    defineField({name: 'k', title: 'Etiket', type: 'string'}),
    defineField({name: 'sub', title: 'Alt etiket', type: 'string'}),
    defineField({name: 'v', title: 'Değer', type: 'number'}),
  ],
})

const blockChart = defineType({
  name: 'blockChart',
  title: 'Grafik',
  type: 'object',
  fields: [
    defineField({name: 'title', title: 'Grafik başlığı', type: 'string'}),
    defineField({
      name: 'rows',
      title: 'Çubuklar',
      type: 'array',
      of: [defineArrayMember({type: 'chartRow', title: 'Çubuk'})],
    }),
    defineField({
      name: 'unit',
      title: 'Birim',
      type: 'string',
      description: 'Örnek: ₺ veya " ay"',
    }),
    defineField({name: 'dec', title: 'Ondalık basamak', type: 'number'}),
    defineField({name: 'highlight', title: 'Vurgulanan çubuk (0 = ilk)', type: 'number'}),
    defineField({name: 'note', title: 'Grafik altı yorum', type: 'text'}),
    defineField({name: 'caption', title: 'Varsayım ve kaynak notu', type: 'text'}),
  ],
})

/* ---------- Yardımcı nesneler ---------- */

const keyStat = defineType({
  name: 'keyStat',
  title: 'Manşet rakamı',
  type: 'object',
  fields: [
    defineField({name: 'v', title: 'Değer', type: 'string'}),
    defineField({name: 'unit', title: 'Birim', type: 'string'}),
    defineField({name: 'k', title: 'Ne anlama geliyor', type: 'string'}),
    defineField({name: 'sub', title: 'Alt not', type: 'string'}),
  ],
})

const impact = defineType({
  name: 'impact',
  title: 'Bu gelişme seni nasıl etkiliyor?',
  type: 'object',
  fields: [
    defineField({name: 'lead', title: 'Tek cümlelik özet', type: 'text'}),
    defineField({
      name: 'points',
      title: 'Somut adımlar',
      type: 'array',
      of: [defineArrayMember({type: 'text'})],
    }),
  ],
})

const sourceLink = defineType({
  name: 'sourceLink',
  title: 'Kaynak',
  type: 'object',
  fields: [
    defineField({name: 'title', title: 'Kaynak adı', type: 'string'}),
    defineField({
      name: 'url',
      title: 'Bağlantı (varsa)',
      type: 'url',
      validation: (Rule) => Rule.uri({scheme: ['http', 'https']}),
    }),
  ],
})

/* ---------- Belge tipleri ---------- */

const category = defineType({
  name: 'category',
  title: 'Kategori',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Ad', type: 'string'}),
    defineField({
      name: 'slug',
      title: 'Adres',
      type: 'slug',
      options: {source: 'title', maxLength: 60, slugify: trSlugify},
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'description', title: 'Açıklama', type: 'text'}),
    defineField({name: 'order', title: 'Sıra', type: 'number'}),
  ],
})

const article = defineType({
  name: 'article',
  title: 'Yazı',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Başlık',
      type: 'string',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Adres',
      type: 'slug',
      options: {source: 'title', maxLength: 60, slugify: trSlugify},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Spot açıklama',
      type: 'text',
      rows: 3,
      description: '140-220 karakter.',
      validation: (Rule) => Rule.required().min(100).max(320),
    }),
    defineField({
      name: 'category',
      title: 'Kategori',
      type: 'reference',
      to: [{type: 'category'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'contentType',
      title: 'İçerik türü',
      type: 'string',
      options: {
        list: [
          {title: 'Haber', value: 'Haber'},
          {title: 'Rehber', value: 'Rehber'},
          {title: 'Analiz', value: 'Analiz'},
          {title: 'Dosya', value: 'Dosya'},
          {title: 'Veri', value: 'Veri'},
          {title: 'Sponsorlu', value: 'Sponsorlu'},
        ],
      },
    }),
    defineField({
      name: 'publishedAt',
      title: 'Yayın tarihi',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'updatedAt', title: 'Güncelleme tarihi', type: 'datetime'}),
    defineField({name: 'readMinutes', title: 'Okuma süresi (dk)', type: 'number'}),
    defineField({
      name: 'image',
      title: 'Öne çıkan görsel',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({name: 'alt', title: 'Alternatif metin', type: 'string'}),
        defineField({name: 'credit', title: 'Görsel kaynağı', type: 'string'}),
      ],
    }),
    defineField({name: 'hook', title: 'Kart üstü çengel cümle', type: 'string'}),
    defineField({name: 'keyStat', title: 'Manşet rakamı', type: 'keyStat'}),
    defineField({
      name: 'inBrief',
      title: 'Yazıda ne var?',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      validation: (Rule) => Rule.max(5),
    }),
    defineField({
      name: 'body',
      title: 'Gövde',
      type: 'array',
      of: [
        defineArrayMember({type: 'blockParagraph', title: 'Paragraf'}),
        defineArrayMember({type: 'blockHeading', title: 'Ara başlık'}),
        defineArrayMember({type: 'blockList', title: 'Madde listesi'}),
        defineArrayMember({type: 'blockNote', title: 'Uyarı kutusu'}),
        defineArrayMember({type: 'blockQuote', title: 'Vurgu cümlesi'}),
        defineArrayMember({type: 'blockTable', title: 'Tablo'}),
        defineArrayMember({type: 'blockStats', title: 'Rakam kutuları'}),
        defineArrayMember({type: 'blockChart', title: 'Grafik'}),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({name: 'impact', title: 'Cep etkisi', type: 'impact'}),
    defineField({name: 'sourceName', title: 'Ana kaynak kurumu', type: 'string'}),
    defineField({
      name: 'sources',
      title: 'Kaynak listesi',
      type: 'array',
      of: [defineArrayMember({type: 'sourceLink', title: 'Kaynak'})],
    }),
    defineField({
      name: 'oranNotu',
      title: 'Oran ve tarih notu',
      type: 'text',
      rows: 3,
      description:
        'Mevzuata bağlı oran içeren yazılarda zorunlu: hangi oran, ne zaman yürürlüğe girdi, nereden teyit edilir.',
    }),
    defineField({
      name: 'tags',
      title: 'Etiketler',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
    }),
    defineField({
      name: 'riskLevel',
      title: 'Risk seviyesi',
      type: 'string',
      options: {
        list: [
          {title: 'Düşük', value: 'dusuk'},
          {title: 'Orta', value: 'orta'},
          {title: 'Yüksek', value: 'yuksek'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'reviewStatus',
      title: 'Editör kontrolü',
      type: 'string',
      options: {
        list: [
          {title: 'Taslak — kontrol edilmedi', value: 'taslak'},
          {title: 'Kontrol edildi', value: 'kontrol_edildi'},
          {title: 'Yayımlandı', value: 'yayimlandi'},
        ],
        layout: 'radio',
      },
      initialValue: 'taslak',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'autoDrafted',
      title: 'Otomatik hazırlanmış taslak',
      type: 'boolean',
      description:
        'Zamanlanmış görev tarafından hazırlandıysa işaretlidir. Yayına almadan önce her rakamı kaynağından doğrula.',
      initialValue: false,
    }),
    defineField({
      name: 'draftNotes',
      title: 'Taslak notları (doğrulanacaklar)',
      type: 'text',
      rows: 4,
      description:
        'Otomatik taslaklarda: hangi rakam hangi kaynaktan alındı, neyin teyide ihtiyacı var. Yayına almadan önce bu alanı boşalt.',
    }),
    defineField({
      name: 'sponsored',
      title: 'Sponsorlu içerik',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'sponsorName',
      title: 'Sponsor kurum adı',
      type: 'string',
      description:
        'Sponsorlu içerikte okura gösterilen kurum adı. Reklam mevzuatı gereği açıkça yazılır.',
    }),
    defineField({
      name: 'relatedTool',
      title: 'İlgili hesaplama aracı',
      type: 'string',
      options: {
        list: ['kredi', 'mevduat', 'asgari', 'kira', 'enflasyon', 'karsilastir'],
      },
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO başlığı',
      type: 'string',
      validation: (Rule) => Rule.max(70),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta açıklama',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.max(165),
    }),
  ],
})

export const schemaTypes = [
  article,
  category,
  keyStat,
  impact,
  sourceLink,
  blockParagraph,
  blockHeading,
  blockList,
  blockNote,
  blockQuote,
  blockTable,
  tableRow,
  blockStats,
  statItem,
  blockChart,
  chartRow,
]
