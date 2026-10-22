# Return-to-home confirmation V38

Created with the built-in ImageGen tool on 2026-10-21.

## Saved artwork

- Final asset: `public/assets/game-ui/leave-mascot-v38.png` (1536 × 1024 RGBA).
- Edit target / identity reference: `public/assets/home-ui/account-mascot-mail-v34.png`.
- Original generated output: `C:/Users/tugca/.codex/generated_images/01a15d68-560a-7e50-961b-f076f466d86c/exec-824a4615-8d5c-4533-bc7c-c0f24a5ddab6.png`.
- User layout reference preserved at `design/references/leave-reference-v38.png`.

The generated PNG is copied unchanged and retains its alpha. Existing cream frame `result-panel-v28.png` is reused. All Turkish text and action icons are native HTML/SVG so they remain sharp.

## Final prompt

Use case: precise-object-edit. Asset type: transparent mascot cutout for a game's return-to-home confirmation dialog. Edit target: provided lime-green envelope parrot. Preserve this exact character identity and premium soft 3D feather style: lime-green head and wings, cream cheeks, warm brown eyes, little green crest, golden-orange beak. Remove the envelope AND leaf seal completely. Change pose: the friendly parrot peeks over an invisible horizontal panel edge, with two small GREEN feathered wingtips resting on that edge, one on each side of its face. No orange feet visible. Head gently tilted about 7 degrees, curious and warm, soft happy smile, beak slightly open. A tiny bit of cream chest can show between the two wingtips. Frame as just the head, shoulders and two resting wingtips, no long body. Whole silhouette is visible with comfortable transparent margins. Wing tips align near bottom baseline for overlap on top of a UI panel. No envelope, no letter, no paper, no props, no clothing, no hat, no panel, no text, no background or scenery. Actual alpha transparent background, NO external colored glow, aura, fog or cast shadow. This is the SAME parrot as supplied, not a new species or a flatter cartoon.

## Behavior

Back opens the illustrated confirmation and pauses the current match. Cards remain visible behind the blurred backdrop; the generic pause cover is hidden only while this confirmation is open. Continue, X, Escape and outside click dismiss the panel and resume only when the dialog itself auto-paused the match. Confirmed home waits for the closing animation and never resumes the abandoned match. A pre-paused match stays paused if the confirmation is cancelled. The account dialog retains its styling and focus/close behavior through shared frame styles.

Checks: six viewport sizes, timer and score preservation, all cancellation paths, animated continuation and confirmed return. Account layout and exit checks were also run after sharing the dialog styles.

