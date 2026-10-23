# Papağana göre oyun arka planları

Yerleşik `image_gen` aracı kullanıldı. Kofen'in mevcut `forest-calm-warm-v23.webp` dosyası değiştirilmedi. Yeni arka planların orta alanı kartların okunabilmesi için açık ve sakin; belirgin çevre ayrıntıları kenarlarda kalır.

| Papağan | Tema | Kaynak PNG | Tarayıcı WebP | Dikey kaynak / WebP |
| --- | --- | --- | --- | --- |
| Koak | Deniz | sea-calm-v1.png | sea-calm-v1.webp | sea-calm-v1-portrait.png / .webp |
| Kuik | Kum ve plaj | beach-calm-v1.png | beach-calm-v1.webp | beach-calm-v1-portrait.png / .webp |
| Komat | Sayılar Şehri | numbers-city-calm-v1.png | numbers-city-calm-v1.webp | numbers-city-calm-v1-portrait.png / .webp |

Dosyalar bu klasördedir. PNG kaynakları korunur; WebP kopyaları kayıpsızdır. Telefonlarda kadrajın kenarındaki palmiyelerin ve sayı kulelerinin kaybolmaması için dikey kompozisyon kullanılır. Oyun ve sonuç ekranları aynı tema, kaplama ve kadraj kurallarını paylaşır; arka planlar oyuna girişten önce yüklenir. Ana sayfa ve çevrim içi ekranlar etkilenmez. Papağan seçilmeyen aynı cihaz modu mevcut ormanı kullanır.

## Referanslar

- Stil/kompozisyon: `forest-calm-warm-v23.png`.
- Sayılar Şehri mimarisi: kullanıcının sağladığı Sayılar Şehri ekran görüntüsü; karakter ve arayüz öğeleri arka plana eklenmedi.
- Dikey üretimler: aynı temanın yukarıdaki yatay PNG kaynağı.

## Yatay üretim istemleri

### koak

```text
Use case: stylized-concept.
Asset type: full-screen landscape 16:9 background for a children's visual matching game, also used behind its win/loss result panel. Production illustrated raster art, high resolution.
Input image 1: style and composition reference (existing forest game background). Match its soft rounded storybook 3D illustrated forms, matte natural materials, sunny diffuse lighting, gently painterly textures, warm cheerful atmosphere, level perspective, richly detailed outer edges, low-contrast spacious center. Transform the setting completely as specified below; do not retain forest trees.
Composition is CRITICAL: a broad clean empty central playing area spans x18–82%, y15–87%; keep its subtle color and lighting gradients and soft texture only, NO distinct objects or sharp shapes here. Place the identifying scenery at outer left/right edges, upper corners, and distant horizon. Lower center must also stay quiet. The center should feel naturally part of the landscape, not a pasted rectangle or a white blur. Match the reference's delicate softening of distant and central scenery; keep peripheral scenery crisp. Avoid busy repeated patterns or high contrast near game cards. The scene must fill the whole frame without borders.
No parrots, people, characters, UI, panels, text, title, labels, logos, watermark, game cards, floating game symbols or play buttons. Fully opaque background.
Setting: KOAK'S SEA. A peaceful turquoise open sea cove in daylight, cool aqua and clear sky-blue palette with warm sunlight. Frame the extreme side edges with softly rounded cream seaside rocks and sparse marine greenery; distant tiny rocky islands near the far left/right horizon, perhaps one very small moored wooden sailboat tucked into the far side. The vast central sea is glassy pale turquoise with very soft broad water reflections and subtle horizontal ripples, no distinct wave crests or busy objects. Sky occupies the upper half, calm aqua water lower half. This must feel clearly maritime/open water, NOT a sandy beach, no sand foreground and no forest. Soft tranquil light in the middle protects colored symbol readability.
```

### kuik

```text
Use case: stylized-concept.
Asset type: full-screen landscape 16:9 background for a children's visual matching game, also used behind its win/loss result panel. Production illustrated raster art, high resolution.
Input image 1: style and composition reference (existing forest game background). Match its soft rounded storybook 3D illustrated forms, matte natural materials, sunny diffuse lighting, gently painterly textures, warm cheerful atmosphere, level perspective, richly detailed outer edges, low-contrast spacious center. Transform the setting completely as specified below; do not retain forest trees.
Composition is CRITICAL: a broad clean empty central playing area spans x18–82%, y15–87%; keep its subtle color and lighting gradients and soft texture only, NO distinct objects or sharp shapes here. Place the identifying scenery at outer left/right edges, upper corners, and distant horizon. Lower center must also stay quiet. The center should feel naturally part of the landscape, not a pasted rectangle or a white blur. Match the reference's delicate softening of distant and central scenery; keep peripheral scenery crisp. Avoid busy repeated patterns or high contrast near game cards. The scene must fill the whole frame without borders.
No parrots, people, characters, UI, panels, text, title, labels, logos, watermark, game cards, floating game symbols or play buttons. Fully opaque background.
Setting: KUIK'S SAND AND BEACH. A welcoming tropical sandy beach with softly rounded palm trees framing extreme left and right edges and corners. Wide pale warm golden sand clearing covers the lower half and central playing area; turquoise sea appears only as a narrow distant horizon with soft sky above. Small shells, a few rounded beach rocks and tufts of beach grass stay only at far outer bottom corners, no decorative objects in the central sand. Gentle matte terracotta/coral and golden accents at edges; creamy sand and soft cyan center. Airy inviting storybook summer daylight, subtle soft shadows. Distinct from the sea background by its broad dry sandy foreground and framing palms.
```

### komat

```text
Use case: stylized-concept.
Asset type: full-screen landscape 16:9 background for a children's visual matching game, also used behind its win/loss result panel. Production illustrated raster art, high resolution.
Input image 1: style and composition reference (existing forest game background). Match its soft rounded storybook 3D illustrated forms, matte natural materials, sunny diffuse lighting, gently painterly textures, warm cheerful atmosphere, level perspective, richly detailed outer edges, low-contrast spacious center. Transform the setting completely as specified below; do not retain forest trees.
Composition is CRITICAL: a broad clean empty central playing area spans x18–82%, y15–87%; keep its subtle color and lighting gradients and soft texture only, NO distinct objects or sharp shapes here. Place the identifying scenery at outer left/right edges, upper corners, and distant horizon. Lower center must also stay quiet. The center should feel naturally part of the landscape, not a pasted rectangle or a white blur. Match the reference's delicate softening of distant and central scenery; keep peripheral scenery crisp. Avoid busy repeated patterns or high contrast near game cards. The scene must fill the whole frame without borders.
No parrots, people, characters, UI, panels, text, title, labels, logos, watermark, game cards, floating game symbols or play buttons. Fully opaque background.
Input image 2: world design reference ONLY for the architectural theme of Numbers City; do not reproduce its parrot, text, banner layout or UI.
Setting: KOMAT'S NUMBERS CITY. A magical friendly educational town of rounded ochre/cream/terracotta buildings with muted teal-blue roofs, towers architecturally shaped like numerals 1, 2, 3 at the far left and right edges, small abacus railings and ruler-inspired architecture in peripheral buildings. Follow the supplied city reference's warm toy-like number architecture but reinterpret with the forest reference's airy softness and lower visual density. Frame a VERY broad empty creamy sandstone town square with buildings concentrated along extreme side edges. Distant small architecture sits only near outer portions of the horizon; central skyline fades gently into pale airy blue sky. Lower central plaza is smooth pale warm sandstone with a few soft broad natural light gradients, absolutely no paving grid, hopscotch numbers, objects, symbols or patterned tiles behind the cards. No giant numerals or buildings in the central playing area. Recognizably a numbers city around its edges, restrained sunny matte storybook illustration throughout.
```

## Dikey üretim istemleri

### koak

```text
Use case: stylized-concept.
Asset type: NEW VERTICAL PORTRAIT 9:16 full-screen children's game background, intended for a narrow mobile phone. Output MUST be TALL PORTRAIT, not landscape. Input image 1 is the same world's landscape illustration and is a visual style, setting, material and color reference, not a crop target.
Recompose this landscape as a full new PORTRAIT illustration: preserve its exact sunny soft rounded matte storybook 3D illustrated aesthetic, palette and world identity. Do not simply crop the wide image. Put the characteristic setting details on the visible narrow left and right margins, not outside the portrait.
Keep the broad center x20–80%, y10–90% extremely calm, gently softened, empty of distinct objects, so TWO LARGE vertically stacked game cards or a result panel can sit here. Use natural open sky above and quiet ground/water below. Detail at the edges should taper gently towards the middle. Motifs can occupy x0–18% and x82–100%, but never clutter the center. No parrots, people, characters, UI, panels, text, labels, logos, watermark or floating game symbols. Fully opaque, edge-to-edge scene.
World: Koak's peaceful turquoise open sea. Keep a clearly recognizable sunlit pale aqua open sea in the lower half and blue sky above, with softly rounded seaside rocks and sparse greenery framing only the narrow visible side margins near the lower corners; tiny rocky islets and perhaps one tiny far-side boat near horizon y45%. Keep reflections very soft in the central water, reduce bright thin water caustics to subtle broad ripples. No sandy beach foreground.
```

### kuik

```text
Use case: stylized-concept.
Asset type: NEW VERTICAL PORTRAIT 9:16 full-screen children's game background, intended for a narrow mobile phone. Output MUST be TALL PORTRAIT, not landscape. Input image 1 is the same world's landscape illustration and is a visual style, setting, material and color reference, not a crop target.
Recompose this landscape as a full new PORTRAIT illustration: preserve its exact sunny soft rounded matte storybook 3D illustrated aesthetic, palette and world identity. Do not simply crop the wide image. Put the characteristic setting details on the visible narrow left and right margins, not outside the portrait.
Keep the broad center x20–80%, y10–90% extremely calm, gently softened, empty of distinct objects, so TWO LARGE vertically stacked game cards or a result panel can sit here. Use natural open sky above and quiet ground/water below. Detail at the edges should taper gently towards the middle. Motifs can occupy x0–18% and x82–100%, but never clutter the center. No parrots, people, characters, UI, panels, text, labels, logos, watermark or floating game symbols. Fully opaque, edge-to-edge scene.
World: Kuik's sunny tropical sandy beach. A broad creamy golden sand clearing fills the lower half, distant narrow turquoise sea horizon near y48%, soft sky above. Include rounded slim palm trunks at the narrow left and right edges and a few palm fronds into upper corners, ensuring that palms and a few shells in outer bottom corners REMAIN VISIBLE in the portrait frame. Center stays clear, no shells or toys on central sand.
```

### komat

```text
Use case: stylized-concept.
Asset type: NEW VERTICAL PORTRAIT 9:16 full-screen children's game background, intended for a narrow mobile phone. Output MUST be TALL PORTRAIT, not landscape. Input image 1 is the same world's landscape illustration and is a visual style, setting, material and color reference, not a crop target.
Recompose this landscape as a full new PORTRAIT illustration: preserve its exact sunny soft rounded matte storybook 3D illustrated aesthetic, palette and world identity. Do not simply crop the wide image. Put the characteristic setting details on the visible narrow left and right margins, not outside the portrait.
Keep the broad center x20–80%, y10–90% extremely calm, gently softened, empty of distinct objects, so TWO LARGE vertically stacked game cards or a result panel can sit here. Use natural open sky above and quiet ground/water below. Detail at the edges should taper gently towards the middle. Motifs can occupy x0–18% and x82–100%, but never clutter the center. No parrots, people, characters, UI, panels, text, labels, logos, watermark or floating game symbols. Fully opaque, edge-to-edge scene.
World: Komat's Numbers City. Airy warm ochre/cream/terracotta town with teal/blue roofs and NUMBER-SHAPED architectural towers. Put a SLIM yet recognizable blue numeral 1 tower along the left margin around y20–50%, and a SLIM orange numeral 2 tower on the right margin around y25–52%; a few tiny peripheral abacus details and warm rounded town buildings frame only the edges. These towers must be visible inside the actual narrow portrait image and must not extend into the quiet central column behind the game cards. Wide empty creamy sandstone plaza below and blue sky above. Central distant architecture is very softly blurred and low contrast, no numbered tiles or paving grid.
```

