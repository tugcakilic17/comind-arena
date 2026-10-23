# Koak'ın denizci simge seti

Yerleşik `image_gen` aracı kullanıldı. Kullanıcının 14 simgeli referansı aynı karakter/nesne kimlikleriyle daha yüksek çözünürlüklü, şeffaf bir atlas olarak hazırlandı. Kullanıcının “eksik varsa sen bu temaya uygun üreterek tamamla” talimatıyla 15. simge olarak denizci dürbünü eklendi.

Dosyalar: `koak-symbols-atlas-v1.png` (1586 × 992 RGBA kaynak) ve `koak-symbols-atlas-v1.webp` (kayıpsız tarayıcı kopyası). Beyaz şapka, yelken ve kitap sayfaları opaktır; dış zemin şeffaftır.

Atlas 5 sütun × 3 satır içerir. `src/koak-symbols.js` dosyasındaki kare sınırları alfa >= 32 büyük bağlantılı bileşenlerden ölçülerek 6 piksel payla genişletildi; yerleşim için alfa >= 8 dış hatlarını çevreleyen sekiz yönlü muhafazakâr çokgenler hesaplandı. Kaynak referans `design/references/koak-symbols-user-v1.png` içinde korunur.

## Oyun bağlantısı

- Yalnız Koak'a karşı tek kişilik oyunlarda etkinleşir. Diğer papağanlar ve aynı cihazdaki iki kişilik oyun, kendi yeni setleri eklenene kadar mevcut seti kullanır.
- Yerel HTML görünümü, animasyon katmanı, aktarım klonları ve erişilebilir simge adları aynı setten beslenir.
- İki 8 simgeli kartta yalnız bir ortak simge için 15 farklı simge gerekir. Görünen kart çiftindeki farklı kimlikler 15 simgelik havuza birebir eşlenir. Ortak simgenin iki kopyası aynı kimliği alır, diğer simgeler farklı kalır. El sayıları, aktarım yönleri ve kazanma hedefleri değişmez.

## Simge sırası

1. Kaptan Koak
2. Kaptan şapkası
3. Denizci fuları
4. Pusula
5. Hazine haritası
6. Yelkenli gemi
7. Can simidi
8. Dümen madalyonu
9. Koak ve gemisi
10. Tropik ada
11. Dalga kitabı
12. Hazine sandığı
13. Çapa kitabı
14. Deniz feneri
15. Denizci dürbünü

## Üretim istemi

```text
Use case: compositing.
Asset type: ONE production sprite atlas containing exactly FIFTEEN isolated nautical game icons, genuine transparent background. High-resolution landscape canvas, 5 equal columns × 3 equal rows, ideally 2048×1280 or similar landscape proportions.
Input image 1 is the exact character/icon identity and art-style reference. It contains fourteen existing icons. Faithfully preserve ALL fourteen distinct designs, their colors, costumes, shapes and props, while cleaning up the low-resolution edges and rerendering with crisp high-resolution detail. Re-layout them into the grid below and add ONE matching nautical brass spyglass as the fifteenth icon. These are game symbols, so do not merge icons or add new symbolic decorations around them.
Style: the reference's polished whimsical storybook 3D illustration, saturated turquoise/blue, warm orange/gold, cream and warm wood, soft rounded shapes and gentle lighting. Koak is the same friendly turquoise/blue captain parrot with orange accents and a white/navy captain hat with orange lightning emblem. Keep his recognizable identity and proportions.
Exact grid order left-to-right, top-to-bottom:
Row 1: (1) standing Captain Koak holding his little map/book as in the top-left reference; (2) white and navy captain hat with round orange lightning badge; (3) orange sailor neckerchief with the lightning badge; (4) golden compass with blue/red compass rose and small hanging ring; (5) parchment treasure map with rolled sides.
Row 2: (6) small warm wooden sailing ship with white sails, blue flag, orange/blue decoration and turquoise wave base; (7) cream-and-orange life ring resting on small turquoise waves; (8) ornate circular ship-wheel medallion enclosing an open book and miniature ship, as in reference bottom-left; (9) Captain Koak standing beside his little wooden ship on turquoise waves, as in reference bottom second; (10) tiny sandy tropical island with palms, small book-like flag and a turquoise water base.
Row 3: (11) curling turquoise ocean wave rising from an open book, exact reference motif; (12) open navy-and-gold treasure chest with glowing golden treasure, exact reference motif; (13) golden anchor above an open book with small coral/water details, exact reference motif; (14) white-and-blue lighthouse with warm gold roof on small rocks and turquoise waves, exact reference motif; (15) NEW single nautical brass spyglass/telescope with a navy grip and blue glass lens, angled diagonally, matching the same soft warm nautical aesthetic.
Each icon sits independently centered in its own equal-size rectangular cell, with at least 14% empty transparent padding on EVERY side. Keep icon scales visually balanced: about 65–72% of each cell's available width/height, no icon touches cell edges. Maintain clear gaps between cells. Composite motifs count as ONE icon and stay compact.
Absolutely NO text, numbers, labels, letters, grid lines, panels, card backs, border, watermark or clipped text from the source. DO NOT invent a sixteenth icon, omit an icon or duplicate any cell. Preserve the white hat, sails, parchment and book pages as opaque surfaces; only the outside background and gaps are transparent. No white background, checkerboard, opaque drop-shadow rectangles or background gradients. Clean true alpha edges.
```

