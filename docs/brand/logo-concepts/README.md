# Rally Relic logo direction

The user selected concept 03, Rally Relic, for It's a Competition: controller, basketball, film reel/strip, and donut combine into a trophy in the navy, sky-blue, yellow, and chalk palette. The four rejected original concepts remain removed.

## Current design

October 28 supersedes the original background-bracket lock: the user requested removing both tournament diagrams behind the trophy. The trophy was retained from the original raster, with zero changes to its surviving RGBA pixels. The user then requested reworking **all basketball seam linework**, using real basketball images as references, without changing other logo elements.

The final basketball uses a continuous center cross and curved side channels based on Wilson reference photos. Its edit is composited only within the basketball face. Pixels outside that region and all alpha values are unchanged, preserving the original controller, buttons, blue handles, film reel/strip, stem, donut, sprinkles, base, and transparent silhouette.

- Active website asset: [rally-relic-trophy-v2.png](../../../public/brand/rally-relic-trophy-v2.png), used by shared `src/components/brand-mark.tsx` in the header/footer.
- Browser icon: `src/app/icon.png`, resized from the same final artwork.
- Original pre-removal raster: [rally-relic-color-with-brackets.png](./rally-relic-color-with-brackets.png).
- Bracket-free, original-seam intermediate: `public/brand/rally-relic-color.png` and `public/brand/rally-relic-trophy.png`.
- Built-in removal edit prompt/preparation: [bracket-removal.json](./bracket-removal.json); reference output [03-rally-relic-no-brackets-reference.png](./03-rally-relic-no-brackets-reference.png).
- Built-in basketball edit prompt, reference URLs, and pixel-preservation checks: [basketball-linework.json](./basketball-linework.json); reference output [basketball-linework-reference.png](./basketball-linework-reference.png).
- Reproducible asset preparation: `scripts/remove-logo-brackets.mjs` and `scripts/prepare-basketball-logo.mjs`.

## Earlier artwork

[Refined film-reel version](./03-rally-relic-v2.png) and [original selected concept](./03-rally-relic.png) remain historical references. Earlier prompts are in prompts.json, refinement-v2.json, web-cutout.json, and color-refinement.json. The old instruction to preserve the background brackets is superseded; the original trophy art remains the preservation baseline apart from the specifically requested basketball-line correction.

Future explode-and-reassemble animation remains on [DEV_WISHLIST.md](../../../DEV_WISHLIST.md).
