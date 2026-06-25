# Art Assets

## Source pack (owned)

**Cozy Cafe Interior — 32×32 Pixel Art Asset Pack** by **Maygetsu**
https://maygetsu.itch.io/cozy-cafe-interior-3232-pixel-art-asset-pack

- 32×32 interior scale (matches the game's `TILE = 32`).
- Includes: environment tiles (walls/floors/windows/doors), furniture, decor &
  props, characters with 4-direction walk cycles, animated cats, animated doors,
  steam/shadow FX, full spritesheet, Aseprite source.

### ⚠️ License (important)
- ✅ Use in personal & commercial projects, modify to fit, ship on any platform.
- ❌ **Cannot redistribute** the asset files (modified or unmodified).
- Therefore the raw pack **and** our cropped derivatives are **gitignored**
  (`public/assets/cafe/`). Anyone cloning the repo must drop in their own copy.
- Credit (appreciated, not required): *Pixel Art Assets by Maygetsu*.

### How our tiles are made
The pack sheets contain multi-tile objects and non-32-divisible heights, so we
crop the exact pieces the game needs into `public/assets/cafe/derived/`.
Regenerate with: `powershell -File scripts/crop_assets.ps1`

---

## Integrated so far
Floors (brick/plank), walls, counter, round table, chairs, display case, tall
shelf, plants (floor + hanging), pendant lights, wall shelves, menu board,
A-frame sign, teacup, window, door, and 6 characters (1 barista + 5 customers)
with walk animations.

## Owned but NOT yet integrated (already in the pack — free to add)
- [ ] **Animated cats** (`animations_/`) — the reference shows cats wandering.
- [ ] **Animated doors** (open/close) (`animations_/`).
- [ ] **Steam & shadow FX** (`fx_/`) — steam off fresh tea, soft shadows.
- [ ] **Square/rectangular tables** in green/orange/pink/purple (only the round
      orange table is wired in so far).
- [ ] **Register, coffee machines, sink, drink fridges, more cabinets/shelves**.
- [ ] **Clocks, framed art, OPEN/CLOSED signs, arched windows, more floor types**
      (herringbone for a "staff only" back area).
- [ ] **Up/left/right facing character frames** (only down-walk is cropped;
      adding these gives true 4-direction movement).

---

## MISSING — candidates to purchase (not in this pack)

> This pack is **interior only**. Things the reference vision needs that aren't here:

- [ ] **Fireplace / wood stove** — the cozy stove from your earlier reference is
      not in this pack. (Look for a "cozy fireplace" prop pack, or it may be in a
      Maygetsu companion pack.)
- [ ] **Exterior / storefront tiles** — street, shopfront, signage, sky — for any
      "outside the shop" or establishing scenes.
- [ ] **Title screen / logo art** — for the main menu.
- [ ] **UI / HUD pixel frames & icons** — currently the HUD/menus are CSS-styled;
      a matching pixel UI kit (panels, buttons, coin/heart icons) would unify the
      look with the game world.
- [ ] **Audio** (not art): cozy background music + SFX (door chime, pour, coins).
- [ ] *(Optional)* more character variety / seasonal outfits if you want a larger
      cast of regulars than the ~6 included.

_When you buy something, drop it in `public/assets/cafe/<new-pack>/` (or a new
folder) and tell me — I'll crop & wire it in, and check these boxes._
