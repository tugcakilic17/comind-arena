# Welcome sign-in dialog V34

Generated with the built-in ImageGen tool on 2026-10-21.

## Final saved mascot

Workspace asset: `public/assets/home-ui/account-mascot-mail-v34.png` (1536 × 1024, RGBA).
Original final output: `C:/Users/tugca/.codex/generated_images/01a15d68-560a-7e50-961b-f076f466d86c/exec-4cc453f7-6607-4fea-8e75-f87cfe6afdfd.png`.
Source reference saved at `design/references/account-reference-v34.png`.

The PNG is used unchanged with its alpha preserved. The dialog reuses `public/assets/game-ui/result-panel-v28.png` for the cream surface and leaves. Text and controls are native HTML/CSS; the Google mark is a local SVG.

## Initial generation prompt

Use case: stylized-concept. Asset type: transparent UI mascot cutout for CoMind Arena's welcome sign-in dialog. Reference image: use ONLY the small green bird holding an envelope at the TOP CENTER of the supplied screenshot as the character and pose reference. Generate this isolated mascot, no interface and no background. A very cute happy lime-green baby parrot, large warm brown eyes with clean highlights, cream fluffy cheeks, small friendly golden-orange beak, little soft green crest. Front-facing, head upright, wings lightly open to either side, smiling. Small orange feet/claws at lower sides as though peeking over a panel edge. A single small ivory sealed envelope with a tiny green leaf seal is held in front of the chest, tilted about 5 degrees. Envelope overlaps the lower chest. Match the reference's soft premium 3D family game illustration, warm gentle lighting, sculpted layered feathers, clean silhouette. Small welcoming expression, proportions close to reference. The entire bird, wings, feet, and envelope visible with transparent margin. Portrait bust only, no long torso, no clothing, no hat, no glasses. No panel, no leaves arranged outside the bird, no logo, no text, no typography, no watermarks. Actual alpha transparent background.

Initial output: `C:/Users/tugca/.codex/generated_images/01a15d68-560a-7e50-961b-f076f466d86c/exec-0b0de0bf-4820-45ec-a9c5-77d0df043199.png`.

## Final edit prompt

Edit target: supplied green envelope parrot cutout. Precise-object-edit / background-extraction. Keep the bird's face, lime feathers, brown eyes, golden beak, wing pose, orange claws, envelope, tiny leaf seal, proportions and rendering exactly the same. Remove ALL green/yellow glow, aura, haze, fog, vignette and atmospheric color outside the bird and envelope. All empty space must be genuinely alpha transparent, clean crisp feather silhouette, no luminous fringe, no colored drop shadow. Especially remove the broad green halo around the crest, wings and below the envelope. Do not add a backdrop, do not add or change anything in the character. The envelope remains opaque ivory. This will be displayed small over a cream login panel; external glow is unwanted. Transparent background.

## Scope and behavior

- The original home background, branding and modes are unchanged. Native dialog backdrop blurs the existing page only while open.
- Close, Escape, outside click and guest return to the existing screen. Focus stays in the dialog and returns to the opener.
- Google authentication is not configured in this repository. The button currently shows an availability notice; it does not fabricate a signed-in user or contact Google.
- Checked six viewport sizes including short landscape, plus provider notice overflow, focus management and dismissal.

