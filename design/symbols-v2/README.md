# Sade papağan desteleri — 23 Ekim 2026

Her papağanın ayrı 15 nesnesi var. Referans fotoğrafındaki papağanlar ve diğer
nesneler üretim için kırpılmadı; fotoğraf yalnızca tema ve stil referansı oldu.
Hiçbir simge papağan, karakter sahnesi veya arka plan içermez.

| Deste | Tema | Klasörden alınan | Yeni üretilen |
| --- | --- | ---: | ---: |
| Koak | Denizcilik | 4 | 11 |
| Kofen | Orman / keşif | 8 | 7 |
| Komat | Matematik / öğrenme | 5 | 10 |
| Kuik | Ses / hikâye | 8 | 7 |

Verilen klasörde 187 PNG incelendi. Uygun 25 dosya `sources/` altında özgün
dosya baytları korunarak kopyalandı. Karmaşık sahneler ve süslü karakterler
seçilmedi. Koak için onaylanan şapka, fular, pusula ve dürbün nesneleri yeni,
sade ve net üretimlerde korundu.

35 yeni nesne yerleşik imagegen aracıyla dört şeffaf sprite sayfası olarak
üretildi. İstemler `generation-prompts.json`, nesnelerin kaynakları
`provenance.json` içinde. `sources/*/generated-sheet.png` özgün üretimlerdir.

Kaynak piksel boyutları büyütülmez veya küçültülmez. Yeni üretimlerin nesneleri
kendi çözünürlüklerinde boşluklu atlas hücrelerine aktarılır; klasörden alınan
tekil PNG'ler bütün olarak yerleştirilir. PNG masterlar burada, kayıpsız WebP
atlaslar `public/assets/game-ui/*-symbols-atlas-v2.webp` içinde. Etiketli küçük
önizlemeler yalnızca inceleme içindir ve oyunun görsel kaynağı değildir.

`scripts/pack-themed-symbols.py` atlasları, alfa sınırlarını ve çarpışma
poligonlarını üretir. `src/themed-symbols.js` bu veriyi kullanır. Tek kişilik
oyunda seçilen papağanın destesi yüklenir. Arkadaş maçlarında oda sahibinin
seçtiği oyun dünyasının destesi kullanılır; varsayılan Kofen'dir. Tema bilgisi
olmayan eski arkadaş odaları ve aynı cihaz maçları klasik setle devam eder.

Kontroller: `node --test tests/symbol-sets.test.js`,
`node tests/koak-symbols-check.mjs`, `python tests/themed-assets-check.py`.
