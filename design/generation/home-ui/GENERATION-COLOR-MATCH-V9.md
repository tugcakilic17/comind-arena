# Papağan ve oynat renk uyumu — v9

Built-in `image_gen.imagegen` ile dört ayrı düzenleme yapıldı. Orijinaller korundu; yeni dosyalar bu klasöre kopyalandı ve `src/main.js` içinde kullanıldı.

- `mode-together-blue-red-v9.png`: sağdaki yeşil kâşif yerine gözlüklü kırmızı papağan. Mavi karakter, çak yapma pozu, kartın ölçüsü, yazıları ve boş oynat alanı korunur.
- `play-kofen-leaf-v9.png`: Kofen'in tüylerine yakın sıcak yaprak yeşili.
- `play-together-coral-v9.png`: kırmızı papağana uygun yumuşak mercan kırmızısı.
- `play-friend-sky-v9.png`: davet kartındaki mavi papağana uygun gök mavisi.

Mevcut küçük düğme boyutu, kart eğimi ve baloncuk animasyonu değişmedi. Mat doku ve şeffaf alfa korunur.

## Tam üretim istemleri

### mode-together-blue-red-v9.png

Referanslar: mode-together-soft-v6.png, kofen-red-avatar-v6.png

Use case: precise-object-edit. Image 1 is the EDIT TARGET: a transparent square game mode card. Image 2 is the identity reference for the red parrot. Change ONLY the right-hand green safari explorer in image 1 into the friendly red thinker parrot from image 2: warm red feathers, red crest, cream face, dark rounded beak, brown eyes and round brown spectacles, no safari hat or explorer vest. Preserve its small scale and high-five pose with the blue navigator at left; natural red wing raised to meet the blue wing. Match the existing soft matte storybook rendering and gentle lighting, no glossy plastic or hard reflections. Keep the blue parrot UNCHANGED. Preserve card canvas size, transparent margins, hexagon silhouette, vanilla yellow face, cream rim, leaf positions, every text glyph and every text position EXACTLY. The exact centered wording remains 'Yan Yana' then 'Oynayalım', and smaller 'Aynı cihazda 2 kişi'. Do not enlarge characters or move the lettering. Lower central area remains completely empty for the separate play button: no button, no triangle, no symbol there. No additional text, props, or characters. True transparent alpha outside the card, no scene or background, no halo. Output the entire card with original square framing.

### play-kofen-leaf-v9.png

Referanslar: play-sage-soft-v6.png, mode-kofen-green-wave-v7.png

Use case: precise-object-edit. Image 1 is the isolated play-button EDIT TARGET. Image 2 is color reference ONLY for the green parrot Kofen, not a compositing input. Recolor only the oval body of image 1 to a warm fresh LEAF GREEN matching Kofen's feathers in image 2: medium apple/leaf green, subtly yellow-green upper surface and darker natural leaf-green lower edge. Keep calm natural saturation, soft MATTE storybook surface and shallow plush volume. Avoid the grayish sage of the old button; also avoid neon lime, glassy gloss, specular streaks, metallic rims, glow or aura. Preserve the exact front-facing horizontal oval silhouette, scale, centered placement, 3:2 canvas and transparent margins of image 1. Preserve the ivory white rounded right-pointing play triangle, original size and placement. Only ONE isolated button; no parrot, no text, no leaves, no card. Genuine transparent alpha outside button, no background or colored halo. Keep existing small UI readability.

### play-together-coral-v9.png

Referanslar: play-honey-soft-v6.png, kofen-red-avatar-v6.png

Use case: precise-object-edit. Image 1 is isolated play-button EDIT TARGET. Image 2 is color reference ONLY for the red parrot, not a compositing input. Recolor only the oval body of image 1 to a warm soft CORAL RED matching this parrot, a gently muted feather red with subtle warm salmon top and deeper terracotta-red lower edge. This button will sit on a vanilla-yellow card with blue and red parrots; keep cheerful harmonious warm storybook color, no neon red. Preserve original soft MATTE surface, shallow softly padded volume, diffuse lighting. No glossy plastic, hard reflections, metallic rims, glow or aura. Preserve EXACT front-facing horizontal oval silhouette, size, centered placement, landscape 3:2 canvas and transparent margins of image 1. Preserve the ivory white rounded right-pointing triangle at same size and position. One isolated button only, no text, parrot, leaves or card. True transparent alpha outside button, no background or colored halo.

### play-friend-sky-v9.png

Referanslar: play-lavender-soft-v6.png, mode-together-soft-v6.png

Use case: precise-object-edit. Image 1 is isolated play-button EDIT TARGET. Image 2 is color reference ONLY: use the BLUE navigator parrot at LEFT, not the green bird and not the card. Recolor only the oval body of image 1 to soft warm SKY/TURQUOISE BLUE matching the blue navigator's feathers: medium clear sky blue with gentle turquoise undertone, slightly lighter top and deeper blue lower edge. Button will sit on pale lavender card with blue parrot. Keep harmonious soft MATTE storybook surface, shallow softly padded volume and diffuse lighting. No electric cyan, neon, glossy plastic, hard reflections, metallic rims, glow or aura. Preserve EXACT front-facing horizontal oval silhouette, size, centered placement, landscape 3:2 canvas and transparent margins of image 1. Preserve the ivory white rounded right-pointing triangle at same size and position. Only one isolated play button, no text, parrot, leaves or card. True transparent alpha outside button, no background or colored halo.

