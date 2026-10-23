# Kontrol ve tabela netliği — v15

Kullanıcının piksel/jagged kenar geri bildirimi üzerine geri, ses açık/kapalı, duraklat/devam ve kronometre, atlas yerine ayrı yüksek çözünürlüklü PNG'lerle gösterilir. Tabela da temiz kenarlı yeni bir görseldir. Yedi dosya built-in `image_gen.imagegen` ile, önceki tasarımlar referans alınarak oluşturuldu; önceki dosyalar korunur.

Dosyalar `public/assets/game-ui/` içindedir:
- `back-hd-v15.png`
- `sound-on-hd-v15.png`
- `sound-off-hd-v15.png`
- `pause-hd-v15.png`
- `play-hd-v15.png`
- `stopwatch-hd-v15.png`
- `title-find-symbol-hd-v15.png`

Kontrol dosyalarının her biri 1254×1254, tabela 2006×784 pikseldir; tümü şeffaf alfa içerir. Kontroller doğal img elemanlarıyla küçültülerek gösterilir. Tabelanın şeffaf kenar boşluğu CSS'te normalize edilerek önceki görünür ölçüsü korunur; harfler ve plaka kesilmez. Oyun simgeleri, büyütülmüş altıgenler ve avatarlar değişmedi. Geri sayımın sn metni kaldırıldı ve saat/sayı tek satırda ortalandı.

## Tam üretim istemleri

### back-hd-v15.png

Referanslar: `public/assets/game-ui/game-controls-atlas-v14.png`. `transparent_background: true`.

Use case: precise-object-edit. Input is the old control atlas, as an EXACT visual reference. Isolate and rerender ONLY the specified ONE control, not the sheet. Preserve its current design, proportions, colors, icon silhouette and soft MATTE dimensional material: rounded ivory/cream square, warm ochre/caramel slim lower edge, forest green softly modeled glyph. User likes the design, wants CLEAN HIGH-RESOLUTION rendering, not a redesign. Smooth continuous antialiased curves, crisp well-defined surfaces, no noisy texture, jagged pixels, broken alpha, speckles, colored edge fringes, outlines outside the silhouette, or leftover neighboring sprites. Broad soft diffuse light, minimal gentle bevels, no plastic glare, neon or metallic gold. One control centered at front view on SQUARE canvas, approximately1024x1024 or larger, filling90% canvas with even5% true transparent margin. Entire contour visible. No scene, text, labels, sheet, grid, decoration, leaves or other controls. Genuine clean transparent alpha outside object, no shadow haze. Selected control: top-left BACK button, one filled forest-green LEFT-POINTING ARROW on rounded cream square.

### sound-on-hd-v15.png

Referanslar: `public/assets/game-ui/game-controls-atlas-v14.png`. `transparent_background: true`.

Use case: precise-object-edit. Input is the old control atlas, as an EXACT visual reference. Isolate and rerender ONLY the specified ONE control, not the sheet. Preserve its current design, proportions, colors, icon silhouette and soft MATTE dimensional material: rounded ivory/cream square, warm ochre/caramel slim lower edge, forest green softly modeled glyph. User likes the design, wants CLEAN HIGH-RESOLUTION rendering, not a redesign. Smooth continuous antialiased curves, crisp well-defined surfaces, no noisy texture, jagged pixels, broken alpha, speckles, colored edge fringes, outlines outside the silhouette, or leftover neighboring sprites. Broad soft diffuse light, minimal gentle bevels, no plastic glare, neon or metallic gold. One control centered at front view on SQUARE canvas, approximately1024x1024 or larger, filling90% canvas with even5% true transparent margin. Entire contour visible. No scene, text, labels, sheet, grid, decoration, leaves or other controls. Genuine clean transparent alpha outside object, no shadow haze. Selected control: top row SECOND button, forest-green SPEAKER WITH TWO curved SOUND WAVES, sound ON, on rounded cream square.

### sound-off-hd-v15.png

Referanslar: `public/assets/game-ui/game-controls-atlas-v14.png`. `transparent_background: true`.

Use case: precise-object-edit. Input is the old control atlas, as an EXACT visual reference. Isolate and rerender ONLY the specified ONE control, not the sheet. Preserve its current design, proportions, colors, icon silhouette and soft MATTE dimensional material: rounded ivory/cream square, warm ochre/caramel slim lower edge, forest green softly modeled glyph. User likes the design, wants CLEAN HIGH-RESOLUTION rendering, not a redesign. Smooth continuous antialiased curves, crisp well-defined surfaces, no noisy texture, jagged pixels, broken alpha, speckles, colored edge fringes, outlines outside the silhouette, or leftover neighboring sprites. Broad soft diffuse light, minimal gentle bevels, no plastic glare, neon or metallic gold. One control centered at front view on SQUARE canvas, approximately1024x1024 or larger, filling90% canvas with even5% true transparent margin. Entire contour visible. No scene, text, labels, sheet, grid, decoration, leaves or other controls. Genuine clean transparent alpha outside object, no shadow haze. Selected control: top row THIRD button, green SPEAKER with small muted terracotta X beside it, sound OFF, on rounded cream square.

### pause-hd-v15.png

Referanslar: `public/assets/game-ui/game-controls-atlas-v14.png`. `transparent_background: true`.

Use case: precise-object-edit. Input is the old control atlas, as an EXACT visual reference. Isolate and rerender ONLY the specified ONE control, not the sheet. Preserve its current design, proportions, colors, icon silhouette and soft MATTE dimensional material: rounded ivory/cream square, warm ochre/caramel slim lower edge, forest green softly modeled glyph. User likes the design, wants CLEAN HIGH-RESOLUTION rendering, not a redesign. Smooth continuous antialiased curves, crisp well-defined surfaces, no noisy texture, jagged pixels, broken alpha, speckles, colored edge fringes, outlines outside the silhouette, or leftover neighboring sprites. Broad soft diffuse light, minimal gentle bevels, no plastic glare, neon or metallic gold. One control centered at front view on SQUARE canvas, approximately1024x1024 or larger, filling90% canvas with even5% true transparent margin. Entire contour visible. No scene, text, labels, sheet, grid, decoration, leaves or other controls. Genuine clean transparent alpha outside object, no shadow haze. Selected control: top row FOURTH button, two parallel forest-green vertical PAUSE BARS on rounded cream square.

### play-hd-v15.png

Referanslar: `public/assets/game-ui/game-controls-atlas-v14.png`. `transparent_background: true`.

Use case: precise-object-edit. Input is the old control atlas, as an EXACT visual reference. Isolate and rerender ONLY the specified ONE control, not the sheet. Preserve its current design, proportions, colors, icon silhouette and soft MATTE dimensional material: rounded ivory/cream square, warm ochre/caramel slim lower edge, forest green softly modeled glyph. User likes the design, wants CLEAN HIGH-RESOLUTION rendering, not a redesign. Smooth continuous antialiased curves, crisp well-defined surfaces, no noisy texture, jagged pixels, broken alpha, speckles, colored edge fringes, outlines outside the silhouette, or leftover neighboring sprites. Broad soft diffuse light, minimal gentle bevels, no plastic glare, neon or metallic gold. One control centered at front view on SQUARE canvas, approximately1024x1024 or larger, filling90% canvas with even5% true transparent margin. Entire contour visible. No scene, text, labels, sheet, grid, decoration, leaves or other controls. Genuine clean transparent alpha outside object, no shadow haze. Selected control: second row FIRST button, single forest-green rounded RIGHT-POINTING PLAY TRIANGLE on rounded cream square.

### stopwatch-hd-v15.png

Referanslar: `public/assets/game-ui/game-controls-atlas-v14.png`. `transparent_background: true`.

Use case: precise-object-edit. Input is the old control atlas, as an EXACT visual reference. Isolate and rerender ONLY the specified ONE control, not the sheet. Preserve its current design, proportions, colors, icon silhouette and soft MATTE dimensional material: rounded ivory/cream square, warm ochre/caramel slim lower edge, forest green softly modeled glyph. User likes the design, wants CLEAN HIGH-RESOLUTION rendering, not a redesign. Smooth continuous antialiased curves, crisp well-defined surfaces, no noisy texture, jagged pixels, broken alpha, speckles, colored edge fringes, outlines outside the silhouette, or leftover neighboring sprites. Broad soft diffuse light, minimal gentle bevels, no plastic glare, neon or metallic gold. One control centered at front view on SQUARE canvas, approximately1024x1024 or larger, filling90% canvas with even5% true transparent margin. Entire contour visible. No scene, text, labels, sheet, grid, decoration, leaves or other controls. Genuine clean transparent alpha outside object, no shadow haze. EXCEPTION: This is ONLY the standalone STOPWATCH in second row SECOND cell, NOT a button. Preserve round pale ivory watch face, warm honey/ochre casing, top knob and tiny side knob, one simple softly modeled warm brown hand pointing upper-right from central pivot. No enclosing square, no numbers, no text, no rim decorations. Match exact reference stopwatch design. Clean readable silhouette for display at27px.

### title-find-symbol-hd-v15.png

Referanslar: `public/assets/game-ui/title-find-symbol-v14.png`. `transparent_background: true`.

Use case: precise-object-edit. Input is EXACT design reference for the game's title plaque. Preserve its current soft matte dimensional rounded CREAM plaque, subtle warm honey lower depth and friendly DARK BROWN softly modeled lettering. Exact Turkish single-line text remains 'Ortak simgeyi bul!' with correct dotted i. User LIKES this design; improve clarity, not style. Rerender clean sharp typography and continuous antialiased edges with no ragged pixels, white fringes, colored fringe, cutout debris, noisy texture, sharpening halos or blur. Smooth shallow material, gentle diffuse light, no new glossy sheen, hard outlines, leaves, icons, scene or added text. IMPORTANT output TIGHTLY FRAMED horizontal canvas with aspect ratio5.25:1, ideally around2520x480: the plaque occupies94% width and90% height, with thin even true transparent margins; remove the old huge empty top/bottom bands. Entire plaque visible. Real clean transparent alpha outside plaque, no shadow haze. Same proportions, word shapes, layout, colors and gentle 3D charm as original; high-resolution production UI banner.

