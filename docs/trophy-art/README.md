# Achievement artwork

The active collection is authored with the built-in `image_gen.imagegen` tool. Each prize is generated separately with real alpha transparency. The complete prompts are in [prompts.json](./prompts.json); active image files live in `public/trophies/achievements/` and are referenced by `src/lib/trophies.ts`.

## Collection direction

- **Fantasy:** rare enchanted relics, intricate goldwork, amethyst and cool magical light. Includes a fully recognizable dragon.
- **Movies:** cinematic silver, black, gold and theatrical lighting. **Blockbuster** explicitly represents action movies with a stunt car, fire and clapperboard. Other choices cover classic cinema, drama/comedy, movie night and sci-fi.
- **Food:** immediately recognizable, appetizing edible textures and natural colors. Donut, pizza, intact cheeseburger, cupcake and crispy taco; restrained laurel accents identify them as achievements.
- **Animals:** believable wildlife and natural materials. Fur, feathers, moss, stone, foliage and ocean water; no metal animal sculptures or cybernetic armor.

The matte website controls remain part of the established site theme. Richer materials and lighting belong to the artwork itself.

These are raster illustrations, not SVGs or 3D models. Next.js Image serves resized optimized variants. Original generated PNGs retain their alpha channel and are copied into the project; no external image hosting is required.

Trophy animation is future work. Whole-object motion can use transforms; independently moving wings, rings, particles or materials will need layered assets or a later 3D implementation. Respect reduced-motion preferences. The older `*-relic.svg` files and `scripts/render-trophies.py` belong to the retired vector pass and do not generate the active collection.

Pizza retouch: only the two large green basil leaves were removed; the pizza and gold laurels retain the selected design. The active file is `public/trophies/achievements/pizza-no-leaves.png`; the exact built-in edit prompt is in [pizza-correction.json](./pizza-correction.json).
