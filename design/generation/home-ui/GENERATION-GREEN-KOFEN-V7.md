# Kullanıcının rozeti ve yeşil Kofen — 20 Ekim 2026

## Kullanılan dosyalar

- `brand-user-parrot-badge-v7.png`: kullanıcının `C:/Users/tugca/Downloads/CoMind Arena Parrot Badge.png` dosyasının değişiklik yapılmadan birebir kopyası. Kaynak ile dosya baytlarının aynı olduğu doğrulandı. Kullanıcının bu görseli aynen kullanma isteği, önceki çerçevesiz marka tercihinin bu alan için yerine geçer. Referans kopyası ayrıca `design/references/comind-arena-parrot-badge.png` içinde korunur.
- `mode-kofen-green-wave-v7.png`: mat mint kartın yalnızca papağanı, rozetteki aynı yeşil/sarı gagalı/pembe yanaklı karakterin el sallayan haliyle değiştirildi. Kofen’le Oyna yazısı, çerçeve, boşluk ve bağımsız oynat katmanı korundu.
- `kofen-green-avatar-v7.png`: oyun içindeki Kofen'in kartla aynı yeşil kimlikte küçük avatarı.

Kart ve avatar built-in `image_gen.imagegen` ile üretildi. Diğer kartlar, orta başlık, arka plan, oynat görselleri ve animasyonlar değiştirilmedi. Tüm PNG'ler şeffaf alfa içerir. Önceki sürümler korundu.

## Tam üretim istemleri

### mode-kofen-green-wave-v7.png

Use case: precise-object-edit. Image 1 is the EDIT TARGET, a finished mint-green hexagonal game-mode card without a play button. Image 2 is the EXACT CHARACTER IDENTITY reference, the user-supplied green CoMind parrot badge.
Change ONLY the red bespectacled parrot in image 1 into a friendly WAVING version of the green parrot from image 2. Precisely preserve the new character's recognizable identity: soft fresh medium-green feathers, rounded leaf-like green crest with NO HAT, warm CREAM facial patches, big warm BROWN eyes, small pink/peach blushing cheek circles, big rounded YELLOW-ORANGE beak, joyful open smile. No glasses, black beak, safari hat, shirt, necklace, medallion or other accessories. Show head and upper chest with one green wing raised at its right in a clear friendly wave, similar pose and visual footprint to the previous red mascot. Same softly rounded storybook toy character as image 2 with gentle matte feather material and broad diffuse light, no lacquer or sharp reflections.
IMPORTANT INVARIANTS: preserve EXACT canvas, overall card silhouette, matte cream rim, leaves, soft mint face, text positions and wording. Exact title stays in two lines: "Kofen’le" then "Oyna". Keep mascot the same SMALL airy size as original, approximately central x32-72%, y16-47%, with whitespace between mascot and text. Do not enlarge the mascot. Keep the lower center completely empty for the separate play button. No play button, triangle, oval, added words or decorations. Do not reproduce the badge's CoMind lettering, plaque or surrounding logo in the card. Preserve genuine transparent alpha outside the original card. Finished crisp production raster UI asset.

### kofen-green-avatar-v7.png

Use case: identity-preserve. Supplied image is the EXACT identity reference for the new green parrot Kofen. Create a square isolated transparent game avatar showing head and upper chest of THIS SAME parrot: fresh soft medium-green feathers, rounded leaf-shaped green crest, cream facial patches, warm large brown eyes, pink/peach blushing cheeks, large rounded yellow-orange beak, happy open friendly smile. Same face geometry, crest, proportions and personality as provided badge. No glasses, safari hat, black beak, clothing or necklace. Soft warm matte storybook 3D render, broad diffuse daylight, tiny gentle eye catchlights, naturally rounded volume with no shiny lacquer. Center complete head and crest in square canvas with 8% transparent margins, slight friendly 3/4 view, readable at small avatar size. No badge, wood/cream plaque, frame, text, logo, foliage decorations, floor or background. Genuine transparent alpha outside character. Finished production raster avatar.

