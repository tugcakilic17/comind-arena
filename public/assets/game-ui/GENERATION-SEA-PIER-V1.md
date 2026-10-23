# Koak'ın iskelesi

Yerleşik `image_gen` aracıyla iki şeffaf PNG üretildi. PNG kaynakları korunarak kayıpsız WebP kopyaları oluşturuldu.

- Geniş iskele: `sea-pier-wide-v1.png` / `sea-pier-wide-v1.webp`.
- Dikey düzende tek kartlık bölüm: `sea-pier-compact-v1.png` / `sea-pier-compact-v1.webp`.

Bütün dosyalar bu klasördedir. İki görsel 2172 × 724 pikseldir. `game-ui.js` yalnız şeffaf tuval paylarını normalize eder; görseller kırpılıp yeniden çizilmez.

Oyun kartlarının PNG tuvalinde görünen tabanın altında yaklaşık %4,4 şeffaf pay bulunur. Yerleşim ve temas gölgeleri bu payı hesaba katar. Dar temas gölgesi görünen tabanda, geniş yumuşak gölge ahşap zeminde kalır. İskele yüzeyleri kartlardan ayrı tutulduğu için kart dönüşü, eşleşme animasyonu ve aktarımı sırasında sabit kalır. Her iki varlık yalnız Koak seçildiğinde oyun öncesinde yüklenir. Diğer papağanların sahneleri değişmez.

## Üretim istemleri

### wide

```text
Use case: stylized-concept.
Asset type: isolated transparent raster environment support for an existing children's matching game. A professionally integrated wooden seaside PIER, replacing an oval floating wooden tray. New standalone prop only.
Input image 1: existing wooden stage, reference for warm matte wood material and rendering quality. Do NOT preserve its oval tray shape.
Input image 2: existing hexagonal game card, reference for soft storybook 3D style, lighting and perspective. Do NOT include a card in the output.
Input image 3: seaside environment, reference for coherent bright diffuse upper-left daylight and pale warm stone colors.
Style: premium soft rounded storybook 3D illustration, honey-colored slightly weathered wooden planks, subtle warm/cool shading, broad soft shadows, gentle realistic depth, matte natural materials. No harsh glossy highlights, no black outline.
Design: a sturdy shallow wooden pier with a STRAIGHT level back edge and a broad uninterrupted horizontal deck surface where large upright cards can stand. Low front fascia below the deck, short stout support piles visible below in the water-facing space, small natural rope wraps around the end bollards. All posts, ropes and tiny rounded cream anchor rocks stay at the extreme left/right ends only. Absolutely NO rails, posts, rope or objects in the central 80% of the deck or above its clear standing surface. No oval rim, no tray, no boat hull. No tall side towers.
View: straight-on view from slightly above, matching cards standing upright on a shallow visible top plane. All decking perspective and plank grain must agree. Deck is the visual focus. Short support piles make the structure clearly anchored instead of floating. Subtle soft transparent environmental shadow beneath the wood, no flat black blobs. Do not draw card shadows, which are added by the live game.
No birds, characters, hexagons, game symbols, text, UI, scenery, sea background, white background or checkerboard. True transparent alpha all around and BETWEEN the supporting piles; any subtle sea contact glints must be minimal and translucent.
Canvas: very wide landscape 3:1, object isolated in the middle horizontal band, with transparent breathing room above and below, entire prop in frame.
WIDE VERSION: one long low pier spanning almost the entire canvas width for TWO side-by-side game cards. It connects through short wooden end-ramps into small pale cream shore-rock anchors at both ends. Place bollards and short rope ties ONLY in the outermost 6% at left and right. Two clear empty standing zones at x28% and x72% share one continuous broad level deck. Include four short sturdy piles BELOW the fascia, not on top. Keep the silhouette low and sleek, no central steps. Deck top around y38–58%, fascia y58–65%, short supports down to y78%; most pixels in the top quarter and bottom eighth are transparent.
```

### compact

```text
Use case: stylized-concept.
Asset type: isolated transparent raster environment support for an existing children's matching game. A professionally integrated wooden seaside PIER, replacing an oval floating wooden tray. New standalone prop only.
Input image 1: existing wooden stage, reference for warm matte wood material and rendering quality. Do NOT preserve its oval tray shape.
Input image 2: existing hexagonal game card, reference for soft storybook 3D style, lighting and perspective. Do NOT include a card in the output.
Input image 3: seaside environment, reference for coherent bright diffuse upper-left daylight and pale warm stone colors.
Style: premium soft rounded storybook 3D illustration, honey-colored slightly weathered wooden planks, subtle warm/cool shading, broad soft shadows, gentle realistic depth, matte natural materials. No harsh glossy highlights, no black outline.
Design: a sturdy shallow wooden pier with a STRAIGHT level back edge and a broad uninterrupted horizontal deck surface where large upright cards can stand. Low front fascia below the deck, short stout support piles visible below in the water-facing space, small natural rope wraps around the end bollards. All posts, ropes and tiny rounded cream anchor rocks stay at the extreme left/right ends only. Absolutely NO rails, posts, rope or objects in the central 80% of the deck or above its clear standing surface. No oval rim, no tray, no boat hull. No tall side towers.
View: straight-on view from slightly above, matching cards standing upright on a shallow visible top plane. All decking perspective and plank grain must agree. Deck is the visual focus. Short support piles make the structure clearly anchored instead of floating. Subtle soft transparent environmental shadow beneath the wood, no flat black blobs. Do not draw card shadows, which are added by the live game.
No birds, characters, hexagons, game symbols, text, UI, scenery, sea background, white background or checkerboard. True transparent alpha all around and BETWEEN the supporting piles; any subtle sea contact glints must be minimal and translucent.
Canvas: very wide landscape 3:1, object isolated in the middle horizontal band, with transparent breathing room above and below, entire prop in frame.
COMPACT LANDING VERSION: a compact low pier landing for ONE upright game card, same horizontal 3:1 canvas. It has a broad clear level center, two low end bollards, small rope ties only at the ends, a straight front edge with two short sturdy piles below. Small pale stone anchor fragments may sit at extreme ends. No ramp extending forward into the camera. Keep a low silhouette: deck top around y38–58%, fascia y58–65%, short supports down to y78%. Its wood construction must look identical in material and perspective to a larger pier, simply fewer planks and two support piles. Clear standing zone at x50%.
```

