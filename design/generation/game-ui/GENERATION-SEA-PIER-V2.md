# Sade ve daha kısa Koak iskelesi

Yerleşik `image_gen` aracıyla v1 iskelelerinin iki ucundaki taşlar ve bitkiler kaldırıldı. Ahşap iskele, halatlı direkler, destekler ve suya temas ayrıntıları korundu.

Dosyalar: `sea-pier-wide-v2.png`, `sea-pier-wide-v2.webp`, `sea-pier-compact-v2.png`, `sea-pier-compact-v2.webp`. Kaynaklar bu klasörde; WebP kopyaları kayıpsızdır, şeffaflık korunur. Tuval ve dikey yerleşim aynı kalır.

Yatay genişlik CSS yerleşiminde masaüstünde yaklaşık %13, yatay telefonda %11, dikey düzende %6 azaltıldı. Taban hizası ve temas gölgeleri korunur. Arka planın kendi sahil kayaları değiştirilmedi.

## Her iki düzenleme için kullanılan üretim istemi

```text
Use case: precise-object-edit.
Input image 1 is the edit target: a transparent wooden pier game prop.
Make one strictly localized correction: REMOVE EVERY stone, rock, pebble, grass tuft, plant, green leaf and moss at BOTH ENDS of the pier. Replace all those removed pixels with true transparent alpha. Keep ONLY the wooden deck, wood support piles, wooden bollards with their existing rope wraps, wood end pieces, and the subtle existing water rings around the piles. No stone or greenery remains anywhere, including tiny fragments at the left and right edges.
Preserve the exact canvas dimensions 2172x724, original object position, wooden deck width and height, perspective, wood color/texture, lighting, plank positions, rope and post placements, support-pile lengths and transparent margins. Do NOT shorten or resize the wood in this image; the UI adjusts width separately. Do NOT redesign, add decorations, produce a backdrop, or change the deck's vertical position. True clean transparent alpha outside the remaining wood/rope/water-ring silhouette, no checkerboard, white matte, erased-object ghosting or colored halos.
```

