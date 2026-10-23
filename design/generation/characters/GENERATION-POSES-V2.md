# Oyun içi papağan pozları · V2

Dört rakip de oyun ve sonuç ekranında ayakta duran seçim görselinden ayrı, göğüsten yukarı normal ve iki kanadı yukarıda sevinç pozlarını kullanır. Seçili rakibin iki pozu da ilk oyun açılmadan yüklenir.

Komat için mevcut `../game-ui/player-idle-v26.png` ve `../game-ui/player-cheer-v26.png`, Kofen için mevcut `../game-ui/kofen-idle-v26.webp` ve `../game-ui/kofen-cheer-v26.webp` yeniden kullanıldı.

Koak ve Kuik'in eksik pozları built-in image_gen ile, mevcut karakterlerinin kimlikleri ve mevcut normal/sevinç pozlarının kadrajı referans alınarak üretildi. Şeffaf PNG kaynakları değiştirilmeden saklanır; WebP kopyaları alfa kanalını korur.

## koak · idle

Dosyalar: `koak-idle-v2.png`, `koak-idle-v2.webp`.

İstem:

Use case: identity-preserve. Image 1 is the edit target: Koak: blue/cyan navigator parrot, blue eyes, white sailor hat with blue band and orange lightning badge, orange scarf with lightning medallion, cream cheeks, dark gray beak. Image 2 is ONLY the composition/style reference for an existing in-game idle avatar. Make an upper-body bust portrait of Image 1 for that exact same game avatar system: chest-up crop, large head, face centered, shoulders and relaxed wings hanging down close to the body, warm small open-beak smile, looking toward the viewer. No legs, no feet, no tail, no handheld objects (remove book/map). Retain exact character colors, hat, neck scarf and chest emblem. Match Image 2's head scale and chest-up composition on a square transparent canvas, head at x50%, eyes at y43%, bottom of torso at y95%, small clear padding around head and shoulders. Same polished 3D feathers and soft lighting. One character, true transparent alpha, no background, no words, no ground. This is the resting pose, do not raise wings.

## koak · cheer

Dosyalar: `koak-cheer-v2.png`, `koak-cheer-v2.webp`.

İstem:

Use case: identity-preserve. Image 1 is the exact idle avatar to edit. Image 2 is ONLY the target celebration pose reference. Change only the pose and expression in Image 1: both empty wings raised beside the head in a joyful Y-shaped 'yay!' celebration, feathers splayed upward, delighted open-beak smile. Keep the character's identity, face, eye color, hat, scarf, medallion, feather colors, rendering style, lighting, canvas size, head size and head center exactly as Image 1. Same chest-up framing, no legs or feet. Fit both raised wing tips completely inside the square canvas with small clear side margins. No map, no book or other handheld props. Transparent background with actual alpha. One character only, no words or backdrop. Match Image 2's lifted-wing gesture but do not copy its red character identity.

## kuik · idle

Dosyalar: `kuik-idle-v2.png`, `kuik-idle-v2.webp`.

İstem:

Use case: identity-preserve. Image 1 is the edit target: Kuik: orange baby parrot, big blue eyes, turquoise wing tips and scarf, cream sailor cap with blue band and round orange badge, cream cheeks, dark gray beak. Preserve the young round baby identity. Image 2 is ONLY the composition/style reference for an existing in-game idle avatar. Make an upper-body bust portrait of Image 1 for that exact same game avatar system: chest-up crop, large head, face centered, shoulders and relaxed wings hanging down close to the body, warm small open-beak smile, looking toward the viewer. No legs, no feet, no tail, no handheld objects (remove book/map). Retain exact character colors, hat, neck scarf and chest emblem. Match Image 2's head scale and chest-up composition on a square transparent canvas, head at x50%, eyes at y43%, bottom of torso at y95%, small clear padding around head and shoulders. Same polished 3D feathers and soft lighting. One character, true transparent alpha, no background, no words, no ground. This is the resting pose, do not raise wings.

## kuik · cheer

Dosyalar: `kuik-cheer-v2.png`, `kuik-cheer-v2.webp`.

İstem:

Use case: identity-preserve. Image 1 is the exact idle avatar to edit. Image 2 is ONLY the target celebration pose reference. Change only the pose and expression in Image 1: both empty wings raised beside the head in a joyful Y-shaped 'yay!' celebration, feathers splayed upward, delighted open-beak smile. Keep the character's identity, face, eye color, hat, scarf, medallion, feather colors, rendering style, lighting, canvas size, head size and head center exactly as Image 1. Same chest-up framing, no legs or feet. Fit both raised wing tips completely inside the square canvas with small clear side margins. No map, no book or other handheld props. Transparent background with actual alpha. One character only, no words or backdrop. Match Image 2's lifted-wing gesture but do not copy its red character identity.
