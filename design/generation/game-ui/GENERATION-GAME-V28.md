# Result screen V28

Created with the built-in ImageGen tool on 2026-10-21.

## Result panel

Saved asset: `public/assets/game-ui/result-panel-v28.png`
Original output: `C:/Users/tugca/.codex/generated_images/01a15d68-560a-7e50-961b-f076f466d86c/exec-71e6dbfa-b1ec-414a-8883-fe441ff29df2.png`
Reference: `public/assets/game-ui/result-panel-leafy-v26.png` (material reference only).

Prompt:

Use case: stylized-concept. Asset type: blank transparent UI panel for a premium cheerful forest matching game. Create ONE large rounded rectangular ivory result card front view, roughly width 1200 height 970, centered in a square transparent canvas, with generous transparent margin. Soft warm porcelain/cream face completely empty, subtle buttery warm shading at perimeter only. A single narrow restrained champagne-gold bevel around edge, small clean dimensional thickness along bottom and very soft contact shadow, no orange glow, no ornate multiple outlines. Very small delicate clusters of 2-3 green sculpted leaves at LOWER two corners only. Upper corners clean. Rounded corners radius about 75px. Refined polished 3D casual game illustration matching the supplied reference's materials but MUCH calmer, elegant restrained trim and minimal decor. Broad blank face for live text and score portraits. No header, no mascot, no buttons, no inset compartments, no illustrations inside the card, no text, no lettering, no numbers, no watermark. Transparent background, preserve alpha. Supplied image is a material reference only; redesign as described, do not copy its very bright thick gold border.

## Primary button

Saved asset: `public/assets/game-ui/result-replay-blank-v28.png`
Original output: `C:/Users/tugca/.codex/generated_images/01a15d68-560a-7e50-961b-f076f466d86c/exec-f6286bab-1ead-43bf-92bf-4df0ab494f87.png`

Prompt:

Use case: stylized-concept. Asset type: one blank primary button for a polished forest casual game. Isolated front view, wide rounded capsule button, actual shape ratio 5:1, on a wide transparent canvas. Premium sculpted leaf-green face, soft satin semi-matte finish, warm bright lime along upper edge blending to rich forest green lower edge, one slim green bevel, soft ivory reflected highlight, restrained contact shadow below. Restrained dimensional shading, NOT neon, NOT wet plastic, NO gold border, NO orange outline, NO inset outline rings. Large empty center area. Rounded capsule ends. Consistent thickness. Button exactly level straight-on, no perspective. Absolutely NO text, no symbols, no arrow, no play icon, no lettering, no objects, no watermark. Fill image width with modest transparent margin. Alpha transparent background. Approximately 1800 x 600 canvas.

## Implementation

- Retained transparent PNG alpha; no raster post-processing.
- Result uses the original home forest. Gameplay art and rules are unchanged.
- Winner illustration is behind the panel, with lower torso occluded by the opaque card.
- Removed the nested gold score tray. Equal circular portrait crops use the existing player/Kofen identities.
- Responsive content flows inside the decorative panel; no percentage-positioned text blocks.
- Button labels are live Turkish text so their proportions remain correct at each screen size. The home symbol follows the existing SVG icon system.
- Tested player/Kofen/local-second-player wins, ties, replay, home navigation, no casual leaderboard write, and eight viewport sizes.

