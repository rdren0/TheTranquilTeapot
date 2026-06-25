---
name: asset-pipeline
description: How user-supplied PNG props get turned into game-ready derived assets
metadata:
  type: project
---

When the user supplies a single PNG of a prop (table, chair, etc.) to use in the cafe scene, the workflow is: alpha-trim the transparent border (or chroma-key a near-white opaque background if not pre-cut), downscale with nearest-neighbor (pixel art) to match the existing derived asset's footprint, and save into BOTH `public/assets/cafe/derived/` and `dist/assets/cafe/derived/` under the key the code expects.

**Why:** The game (`src/phaser/ShopScene.js`) loads props by filename via `load.image`, origin (0.5,1), scaled by CHAR_SCALE=1.5. Existing reference sizes: tables ~42x60, chairs ~34x48. Source uploads are huge (~1254px) with padding, so they must be trimmed + downscaled or they render enormous.

**How to apply:** Use System.Drawing in PowerShell (NearestNeighbor + PixelOffsetMode Half). `public/assets/cafe/` is gitignored (licensed pack). Chairs now use separate `chair_left` (faces right, left of table) and `chair_right` (faces left) instead of one mirrored `chair_side`. Tables share `table_green`/`table_orange`. Note many crops are still defined in [[scripts/crop_assets.ps1]] style hardcoded rects, which is the source of "cut off" clipping bugs.

**Gotchas learned (June 2026, Hank customer set):** (1) Per-pixel GetPixel/SetPixel over the ~1254² source is unusably slow in PowerShell and a flood-fill stack of arrays errors out — use `LockBits` + a `byte[]` buffer (BGRA order) for any per-pixel keying. (2) Some uploads arrive with a real alpha channel, others with an opaque white background; when alpha-trimming, only count a pixel as content if `A>16` AND it's not near-white (`R,G,B>238`), else transparent source pixels (RGB 0) inflate the bbox to the full frame. (3) Customers are now Hank, a directional sheet: `Hank.png` is an 8col×2row grid (top row = front/toward camera, bottom = back/away); sliced per-column (bbox-trim each cell, bottom-center into 32×48) into `hank_front`/`hank_back` 8-frame walk sheets. ShopScene picks the anim by movement: south=front, otherwise back, flipX for left/right; waiting customers face the counter (north) so they show `hank_back` frame 0. Seated table NPCs use single-frame `hank_seated_left`/`hank_seated_right`. Display case beside the counter is `empty_case` rendered like `main_counter` (origin 0.5,1, small scale, depth=by).
