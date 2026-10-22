# Sade orman ve zemine oturan kartlar · V22

Yöntem: yerleşik `image_gen.imagegen`; CLI kullanılmadı. Önceki varlıklar korunur.

Amaç: arka plandaki yoğun bitki, çiçek, taş ve ağaç detayını azaltmak; kartları ahşap yüzeye gerçek temas hissiyle yerleştirmek. Büyük krem panel geri eklenmez. Altıgen kartlar, oyun simgeleri ve üst kontroller korunur.

Orman sade, düşük kontrastlı ve merkeze doğru açık renkli yeni bir PNG'dir. Ahşap platform bu kez arka plana gömülü değildir; gerçek alfa kanallı ayrı PNG olarak kartların altına bağlanır. Kartların dar temas gölgesi ve geniş yumuşak çevre gölgesi kartın boyutuyla ölçeklenir. Kartlar alt kenara hizalanır; masaüstünde ortak platform, uzun telefon/tablet ekranında her kart altında ayrı platform kullanılır. Tur geçişi yalnız kartları ve simgeleri hareket ettirir; ahşap yüzeyler sabit kalır. Arka planda yalnız hafif doygunluk azaltımı uygulanır.

## forest-calm-v22.png

Proje: public/assets/game-ui/forest-calm-v22.png

Generated images are saved to C:\Users\tugca\.codex\generated_images\01a15d68-560a-7e50-961b-f076f466d86c as C:\Users\tugca\.codex\generated_images\01a15d68-560a-7e50-961b-f076f466d86c\exec-2fa14745-e554-404b-be48-d71256f0148d.png by default.

Referanslar: public/assets/game-ui/forest-stage-v21.png (arka plan), test-results/reference-v21-desktop.png (arayüz kompozisyonu).

Tam üretim istemi:

Use case: precise-object-edit. Edit target: the attached forest background. The second supplied image is a screenshot showing the live foreground UI for context only: DO NOT reproduce any of its UI. Redesign the forest backdrop to be dramatically calmer, quieter and visually restful for a professional children's matching game. Preserve the rounded 3D storybook forest style but remove 80 percent of the foliage, flower, grass and cloud detail. REMOVE the entire wooden platform: it will be a separate composited foreground asset. Center 75 percent must be a large very quiet empty open clearing with soft pale sage and warm mint near-white atmospheric tones, smooth low-contrast light, almost no texture, no little bushes, no flowers, no fine branches. Upper center softly luminous pale blue green sky, no high contrast white clouds. Only at extreme far left and far right, a few large softly modeled desaturated sage tree silhouettes and restrained rounded canopies suggest a forest, progressively faded into the light quiet center. No vivid lime green, no intense cyan, no busy pines behind the cards, no foreground rock piles, no tiny plants everywhere, no sunbeams, no sparkle, no bokeh dots. A little muted grass at extreme bottom edge only. Broad soft daylight from upper left, soft atmospheric depth, deliberate premium game art direction. Calm, spacious, bright and friendly, not dark or foggy, not monochrome. Full bleed landscape 16:9. No platform, no cards, no UI, no panels, no buttons, no logos, no animals, no symbols, no text.

## wooden-stage-v22.png

Proje: public/assets/game-ui/wooden-stage-v22.png

Generated images are saved to C:\Users\tugca\.codex\generated_images\01a15d68-560a-7e50-961b-f076f466d86c as C:\Users\tugca\.codex\generated_images\01a15d68-560a-7e50-961b-f076f466d86c\exec-79ebffd9-7ea7-4b10-95b8-d2a697bb7dd3.png by default.

Referanslar: public/assets/game-ui/forest-stage-v21.png (arka plan), test-results/reference-v21-desktop.png (arayüz kompozisyonu).

Tam üretim istemi:

Use case: stylized-concept. Asset type: one isolated transparent PNG foreground wooden stage for a premium children's matching game. Use the attached forest picture as a STYLE reference ONLY, and the second game screenshot as composition context only. Create JUST a broad low oval wooden tabletop/platform, seen nearly front on but enough from above to see the top surface. It will hold two upright hexagonal game boards side by side. Width to height about 7:1 for the complete platform. Smooth softly rounded silhouette, 3 broad honey beige warm oak planks, finely restrained broad wood grain, substantially calmer and less orange than reference. Soft warm light from upper left, subtle brighter top lip, convincing thick slightly darker rounded front edge and underside, soft contact ambient shading in seams. The top surface is evenly lit and EMPTY, no objects or dark placeholder spots on top. A soft ambient floor shadow beneath the platform fades smoothly into TRUE TRANSPARENT alpha background. Full platform including soft shadow entirely visible and not cropped. Very small transparent margin, platform fills the canvas width. Polished soft 3D toy/storybook game art, gentle natural materials and high quality bevels. No foliage, no flowers, no rocks, no scenery, no legs, no buttons, no text, no logos, no hexagonal boards. Single complete isolated wooden platform with genuine transparency, NOT a rectangular opaque forest image.

## Doğrulama

npm test ve npm run build geçer. tests/layout-check.mjs iki modda 11 ekran boyutunu, kartların platforma temas hizasını, taşma ve tıklama alanlarını doğrular. tests/motion-check.mjs gerçek Phaser çizimini, puanlama, tur geçişi, tahta katmanlarının sabit kalması, dokunma, mola ve hareket azaltma davranışını doğrular. Son görünüm test-results/calm-v22-1130.png ve test-results/calm-v22-390.png ile incelendi.
