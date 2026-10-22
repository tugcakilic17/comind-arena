# Sade krem üst arayüz — v12

Kullanıcının onayladığı düzenleme: CoMind Arena ve giriş görsellerinden yapraklar/çiçekler, yüzeydeki yaprak desenleri kaldırıldı. CoMind'in dış beyaz kenarı ve harflerin kalın açık renk konturu kaldırıldı; yalnızca hafif koyu CSS gölgesi kaldı. Giriş düğmesi 204×72 px'den 245×86 px'ye, telefonda 128×50 px'den 154×60 px'ye büyütüldü. Dar ekranlarda marka alanı esneyerek iki kontrolün sığmasını sağlar.

İki görsel ayrı built-in `image_gen.imagegen` düzenlemesi ile üretildi ve bu klasöre kopyalandı. Önceki sürümler korunur.

- `public/assets/home-ui/brand-clean-cream-v12.png`
- `public/assets/home-ui/login-clean-cream-v12.png`

Ortadaki 6gen logosu, arka plan, oyun kartları ve hareketler korunur.

## Tam üretim istemleri

### brand-clean-cream-v12.png

Düzenleme hedefi: `brand-user-leafy-v11.png`. `transparent_background: true`.

Use case: precise-object-edit. Input is the EDIT TARGET: the supplied CoMind Arena brand plaque. Create its clean understated version for the TOP-LEFT header of the same illustrated forest game. Remove ALL surrounding leaves, the flower, and ALL small printed leaf motifs from the cream surface. Preserve EXACT brand lettering and layout: 'CoMind' in large friendly rounded green letters above 'ARENA' in spaced warm brown capitals, with the two subtle warm ochre horizontal separators either side of ARENA. Preserve green tonal identity, recognizable letter shapes, soft dimensional storybook style and warm ivory/cream rounded plaque. Remove the WHITE STICKER OUTLINE/keyline around the plaque AND the thick pale-white sticker outlines behind the green letters; let clean green letters rest directly on the cream face with only soft natural shading. Plaque edge unoutlined and gently rounded, very subtle warm cream/ochre lower depth, NO separate outer frame, no thick rim or bright white stroke. Calm matte material, diffuse light, no strong glossy highlights, metallic gold, neon, glow or high contrast. Clean warm cream face with generous spacing and only the brand words and separators, no other objects or decorations, no parrot. Landscape canvas ratio 3:1. Reframe the cleaned plaque to occupy about 88% canvas width and 76% canvas height with even true transparent margins; do not leave wide empty gaps where leaves were. Entire plaque visible, genuine transparent alpha outside the silhouette, no background, no baked shadow halo. Same branded character and gentle dimensional charm, simpler professional composition.

### login-clean-cream-v12.png

Düzenleme hedefi: `login-user-leafy-v11.png`. `transparent_background: true`.

Use case: precise-object-edit. Input is the EDIT TARGET: the supplied cream 'Giriş yap' UI button. Produce a clean simple version for the top-right header of the same illustrated forest game. Remove ALL surrounding leaves, the white flower, and ALL small printed leaf motifs from the cream face. Preserve exact Turkish text 'Giriş yap', the green circular account medallion at left with ivory head-and-shoulders icon, and green right chevron at right. Preserve typography shapes, forest-green lettering, icon proportions, orderly horizontal spacing and original warm ivory/cream rounded rectangular button body with softly modeled warm ochre lower edge. Keep existing soft illustrated dimensional feel but MATTE and gentle, no new hard white shine, glossy plastic, metallic frame, glow or neon. Calm clean warm cream face, tasteful shallow volume; no extra outline or added frame. Text remains clearly readable and balanced. The only visual content is the cream button body, account medallion, 'Giriş yap' and chevron: no leaves, flowers, leaf patterns, foliage, parrot or other objects anywhere. Landscape canvas 3:1. Reframe cleaned button to occupy about 88% canvas width and 76% canvas height with even genuine transparent margins, not wide blank gaps where foliage used to be. Entire button visible, real alpha outside silhouette, no background and no baked shadow haze.

