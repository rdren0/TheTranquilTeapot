import Phaser from "phaser";
import { bridge } from "./bridge.js";
import { RECIPES } from "../game/recipes.js";
import { canMake } from "../game/state.js";

// ===========================================================================
// ShopScene — "backdrop mode".
// The whole room is the painterly cafe.png the player supplied; the counter is
// the supplied counter.png (white background chroma-keyed out -> main_counter).
// Characters (pixel art from the Maygetsu pack) walk on top, scaled up.
//
// All positions below are in CANVAS pixels (W x H). They're grouped up top so
// they're easy to nudge while we dial in the look.
// ===========================================================================
const W = 724;
const H = 543;
// The world is laid out in W x H units. The canvas is rendered at DISPLAY_W
// wide (height follows the world's aspect ratio) and the camera is zoomed to
// match, so the whole cafe + assets draw bigger and fill more of the browser
// window — no world coordinates change.
const DISPLAY_W = 1200;
const DISPLAY_SCALE = DISPLAY_W / W;

// Walkable floor rectangle (inside the painted walls).
const FLOOR = { x1: 70, y1: 150, x2: 654, y2: 470 };
// Combined display-case + serving counter (one piece), drawn bottom-centre at
// (cx, by). The case is the left third, the serving counter the right portion;
// cx is offset so the serving counter sits over the customer queue (x ~362).
// Sits back from the main door (south) so the lobby isn't cramped.
const COUNTER = { cx: 359, by: 218, scale: 0.22 };
// The solid footprint of the whole unit that blocks movement.
const COUNTER_BLOCK = { x1: 235, y1: 178, x2: 487, y2: 220 };

const PLAYER_START = { x: 412, y: 165 };
const SERVE_ANCHOR_Y = 108; // where the barista stands to serve (north of counter)
const ENTRANCE = { x: 362, y: 460 };
// Customers queue in a single straight line running up from the door, max 4.
// Front (nearest the counter) first, back nearest the door.
const SPOTS = [
  { x: 362, y: 262 }, { x: 362, y: 320 }, { x: 362, y: 378 }, { x: 362, y: 436 },
];
// Entry-way runner rug, lying flat on the floor at the door (drawn under everyone).
const RUG = { cx: 362, by: 434, scale: 0.145 };

const A = "/assets/cafe/";
const D = "/assets/cafe/derived/";
const CHAR_SCALE = 1.5;
const PR = 12;
// Wandering cat. cat_dirs is a 32-frame 8-direction walk (4 frames/row); rows in
// order N, NW, W, SW, S, SE, E, NE. The one-shot specials all face right and
// travel forward, easing to a standstill by their final frame: cat_pounce
// (25-frame pounce), cat_dash (5-frame lunge), cat_jump (25-frame jump).
const CAT_SCALE = 1.05;
const CAT_SPEED = 70;
// Peak forward speed of each special (eased to 0 over the anim, so it lands stationary).
const POUNCE_SPEED = 95;
const DASH_SPEED = 240;
const JUMP_SPEED = 70;
const CAT_DIRS = ["cat_N", "cat_NW", "cat_W", "cat_SW", "cat_S", "cat_SE", "cat_E", "cat_NE"];
// Customers are all "Hank": a directional walk cycle with a front (toward the
// camera) and back (away) sheet. Side movement reuses these with a flipX.
const CUST_WALK_FRAMES = 8;
// The player ("me") has two 7-pose sheets — player_front (toward the viewer) and
// player_back (away). Each sheet's frames are directional facing poses, not a
// walk cycle: headed-right, facing-right, facing-straight, facing-left,
// headed-left. The two "headed" diagonals have a second frame we alternate to
// fake a step. We pick the pose from the movement direction.
const PLAYER_POSE = {
  HEADED_RIGHT: 0, // diagonal toward right; alt frame at +1
  FACING_RIGHT: 2,
  STRAIGHT: 3,
  FACING_LEFT: 4,
  HEADED_LEFT: 5, // diagonal toward left; alt frame at +1
};
const PLAYER_IDLE_FRAME = PLAYER_POSE.STRAIGHT;
const PLAYER_SPEED = 150;
const CUST_SPEED = 90;
const SPAWN_INTERVAL = 1800;

// Tables (pixel-art) with two chairs + a plant, placed around the floor edges.
// An empty chair sits at CHAIR_DX from the table centre; a chair with a seated
// customer is pushed out to CHAIR_DX_SEATED so the customer's head clears the
// table sprite above them.
const CHAIR_DX = 40;
const CHAIR_DX_SEATED = 64;
const CHAIR_DY = -6; // vertical offset of chairs from the table centre (origin bottom)
function tableCluster(cx, cy, key, seated = {}) {
  const lDx = seated.left ? CHAIR_DX_SEATED : CHAIR_DX;
  const rDx = seated.right ? CHAIR_DX_SEATED : CHAIR_DX;
  return [
    { key: "chair_left", x: cx - lDx, y: cy + CHAIR_DY, depth: cy - 1 },
    { key, x: cx, y: cy, depth: cy },
    { key: "chair_right", x: cx + rDx, y: cy + CHAIR_DY, depth: cy - 1 },
    { key: "table_plant", x: cx, y: cy - 28, depth: cy + 1 },
  ];
}
const FURNITURE = [
  ...tableCluster(140, 300, "table_green", { left: true }),
  ...tableCluster(584, 300, "table_orange"),
  ...tableCluster(140, 430, "table_orange"),
  ...tableCluster(584, 430, "table_green", { right: true }),
];
// Seated NPCs sit on a chair (depth cy-1) and are tucked under the table
// (depth cy), so their depth is cy-0.5 for the table they belong to.
const SEATED = [
  { key: "hank_seated_right", x: 90, y: 286, depth: 299.5 }, // left chair, nudged toward table -> faces right
  { key: "hank_seated_left", x: 634, y: 416, depth: 429.5 }, // right chair, nudged toward table -> faces left
];

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super("shop");
  }

  preload() {
    this.load.image("cafe", `${A}cafe.png`);
    [
      "full_counter", "green_rug", "table_green", "table_orange", "chair_left", "chair_right", "table_plant",
      "teacup", "hank_seated_left", "hank_seated_right",
    ].forEach((k) => this.load.image(k, `${D}${k}.png`));
    ["hank_front", "hank_back", "player_front", "player_back"].forEach((k) =>
      this.load.spritesheet(k, `${D}${k}.png`, { frameWidth: 32, frameHeight: 48 }),
    );
    this.load.spritesheet("cat_dirs", `${D}cat_dirs.png`, { frameWidth: 64, frameHeight: 48 });
    ["cat_pounce", "cat_dash", "cat_jump"].forEach((k) =>
      this.load.spritesheet(k, `${D}${k}.png`, { frameWidth: 96, frameHeight: 48 }),
    );
  }

  create() {
    // Zoom the camera so the W x H world fills the (larger) canvas at DISPLAY_SCALE.
    this.cameras.main.setZoom(DISPLAY_SCALE);
    this.cameras.main.centerOn(W / 2, H / 2);

    // Room backdrop, stretched to the world size.
    this.add.image(0, 0, "cafe").setOrigin(0, 0).setDisplaySize(W, H).setDepth(-1000);

    // Entry-way runner rug on the floor at the door (under all characters).
    this.add.image(RUG.cx, RUG.by, "green_rug").setOrigin(0.5, 1).setScale(RUG.scale).setDepth(-900);

    // Combined case + counter (drawn behind characters standing south of it).
    this.add
      .image(COUNTER.cx, COUNTER.by, "full_counter")
      .setOrigin(0.5, 1)
      .setScale(COUNTER.scale)
      .setDepth(COUNTER.by);

    // Tables, chairs, plants
    for (const f of FURNITURE) {
      const img = this.add.image(f.x, f.y, f.key).setOrigin(0.5, 1).setScale(CHAR_SCALE).setDepth(f.depth);
      if (f.flip) img.setFlipX(true);
    }
    for (const s of SEATED) {
      this.add.image(s.x, s.y, s.key, 0).setOrigin(0.5, 1).setScale(CHAR_SCALE).setDepth(s.depth);
      this.add.image(s.x, s.y - 40, "teacup").setScale(CHAR_SCALE).setDepth(s.depth + 1);
    }

    // Walk animations: Hank (customers) has front (toward camera) + back (away)
    // cycles. The player uses directional poses (set per-frame), not anims.
    const mkWalk = (k, end) => {
      if (this.anims.exists(`${k}_walk`)) return;
      this.anims.create({
        key: `${k}_walk`,
        frames: this.anims.generateFrameNumbers(k, { start: 0, end }),
        frameRate: 8,
        repeat: -1,
      });
    };
    mkWalk("hank_front", CUST_WALK_FRAMES - 1);
    mkWalk("hank_back", CUST_WALK_FRAMES - 1);

    // Cat: one looping walk anim per direction (4 frames each) + one-shot specials.
    CAT_DIRS.forEach((key, row) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers("cat_dirs", { start: row * 4, end: row * 4 + 3 }),
        frameRate: 8,
        repeat: -1,
      });
    });
    const mkOneShot = (key, end, frameRate) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end }),
        frameRate,
        repeat: 0,
      });
    };
    mkOneShot("cat_pounce", 24, 18);
    mkOneShot("cat_dash", 4, 14);
    mkOneShot("cat_jump", 24, 18);
    this.cat = {
      sprite: this.add.sprite(220, 420, "cat_dirs", 16).setOrigin(0.5, 1).setScale(CAT_SCALE),
      state: "pause",
      timer: 1200,
      target: null,
      faceLeft: false,
    };

    this.player = this.add
      .sprite(PLAYER_START.x, PLAYER_START.y, "player_front", PLAYER_IDLE_FRAME)
      .setOrigin(0.5, 1)
      .setScale(CHAR_SCALE);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D");
    this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.tKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.input.keyboard.addCapture("SPACE,UP,DOWN,LEFT,RIGHT,W,A,S,D");

    // Customer order + barista reply: drawn speech bubbles (graphics) with text.
    const bubbleText = { fontFamily: '"Jersey 15", sans-serif', fontSize: "15px", color: "#3a2410", align: "center" };
    this.bubbleBg = this.add.graphics().setDepth(19999).setVisible(false);
    this.bubble = this.add.text(0, 0, "", bubbleText).setOrigin(0.5, 1).setDepth(20000).setVisible(false);
    this.promptBg = this.add.graphics().setDepth(20001).setVisible(false);
    this.prompt = this.add.text(0, 0, "", bubbleText).setOrigin(0.5, 1).setDepth(20002).setVisible(false);

    this.custs = [];
    this.spawnAcc = 0;
    this.order = 0;
  }

  pointBlocked(px, py) {
    const out = (x, y) =>
      x < FLOOR.x1 || x > FLOOR.x2 || y < FLOOR.y1 || y > FLOOR.y2 ||
      (x > COUNTER_BLOCK.x1 && x < COUNTER_BLOCK.x2 && y > COUNTER_BLOCK.y1 && y < COUNTER_BLOCK.y2);
    return out(px - PR, py) || out(px + PR, py) || out(px, py) || out(px, py - 8);
  }
  activeCusts() {
    return this.custs.filter((e) => e.state !== "leaving").sort((a, b) => a.order - b.order);
  }
  frontCustomer() {
    const f = this.activeCusts()[0];
    return f && f.state === "waiting" ? f : null;
  }
  canServe() {
    const f = this.frontCustomer();
    if (!f) return false;
    return (
      this.player.y < COUNTER_BLOCK.y1 + 6 &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, SPOTS[0].x, SERVE_ANCHOR_Y) < 110
    );
  }

  update(time, delta) {
    const st = bridge.state;
    if (!st || st.phase !== "service") return;
    this.movePlayer(delta);
    this.syncCustomers(st, delta);
    this.handleServe(st);
    this.updateBubbles(st);
    this.updateCat(delta);
  }

  // Pick the next wander target by choosing a random heading, then walking as far
  // along it as stays in bounds (up to a random distance). Clamping the distance
  // rather than rejecting the heading keeps every direction — including straight
  // N/S, which hit the near walls of the wide-but-short floor — roughly even.
  randomCatPoint() {
    const sp = this.cat.sprite;
    const ok = (x, y) =>
      x > FLOOR.x1 + 24 && x < FLOOR.x2 - 24 && y > FLOOR.y1 + 24 && y < FLOOR.y2 - 10 && !this.pointBlocked(x, y);
    for (let i = 0; i < 24; i++) {
      const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const want = Phaser.Math.Between(80, 200);
      let best = 0;
      for (let d = 24; d <= want; d += 12) {
        if (ok(sp.x + Math.cos(ang) * d, sp.y + Math.sin(ang) * d)) best = d;
        else break;
      }
      if (best >= 40) return { x: sp.x + Math.cos(ang) * best, y: sp.y + Math.sin(ang) * best };
    }
    // Fallback: somewhere south of the cat so it heads toward the viewer.
    return { x: Phaser.Math.Clamp(sp.x, FLOOR.x1 + 24, FLOOR.x2 - 24), y: FLOOR.y2 - 30 };
  }

  catDirAnim(dx, dy) {
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (a >= -22.5 && a < 22.5) return "cat_E";
    if (a >= 22.5 && a < 67.5) return "cat_SE";
    if (a >= 67.5 && a < 112.5) return "cat_S";
    if (a >= 112.5 && a < 157.5) return "cat_SW";
    if (a >= 157.5 || a < -157.5) return "cat_W";
    if (a >= -157.5 && a < -112.5) return "cat_NW";
    if (a >= -112.5 && a < -67.5) return "cat_N";
    return "cat_NE";
  }

  // Ambient cat: wanders the floor, pausing and occasionally pouncing.
  updateCat(delta) {
    const cat = this.cat;
    if (!cat) return;
    const sp = cat.sprite;
    sp.setDepth(sp.y);

    // One-shot specials: travel forward in the facing direction while the anim
    // plays, easing the speed down to 0 as it finishes so the cat lands stationary
    // rather than stopping mid-stride. All return to pause when the anim ends.
    if (cat.state === "pounce" || cat.state === "dash" || cat.state === "jump") {
      if (!sp.anims.isPlaying) {
        cat.state = "pause";
        cat.timer = Phaser.Math.Between(600, 1600);
      } else {
        const base = cat.state === "dash" ? DASH_SPEED : cat.state === "jump" ? JUMP_SPEED : POUNCE_SPEED;
        const speed = base * (1 - sp.anims.getProgress());
        const nx = sp.x + (cat.faceLeft ? -1 : 1) * ((speed * delta) / 1000);
        if (!this.pointBlocked(nx, sp.y)) sp.x = nx;
      }
      return;
    }

    if (cat.state === "pause") {
      cat.timer -= delta;
      if (cat.timer <= 0) {
        // ~15% pounce, ~13% dash, ~10% jump, else wander to a new spot.
        const r = Math.random();
        const special = r < 0.15 ? "pounce" : r < 0.28 ? "dash" : r < 0.38 ? "jump" : null;
        if (special) {
          cat.state = special;
          sp.setFlipX(cat.faceLeft); // special sheets face right
          sp.play(`cat_${special}`);
        } else {
          cat.target = this.randomCatPoint();
          cat.state = "walk";
        }
      }
      return;
    }

    // walking toward target
    const t = cat.target ?? (cat.target = this.randomCatPoint());
    const dx = t.x - sp.x;
    const dy = t.y - sp.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) {
      cat.state = "pause";
      cat.timer = Phaser.Math.Between(900, 2600);
      sp.anims.stop();
      return;
    }
    const stepDist = (CAT_SPEED * delta) / 1000;
    const nx = sp.x + (dx / d) * stepDist;
    const ny = sp.y + (dy / d) * stepDist;
    if (this.pointBlocked(nx, ny)) {
      cat.target = this.randomCatPoint();
      return;
    }
    sp.x = nx;
    sp.y = ny;
    cat.faceLeft = dx < 0;
    const anim = this.catDirAnim(dx, dy);
    sp.setFlipX(false); // direction frames are explicit; no flip while walking
    if (sp.anims.currentAnim?.key !== anim || !sp.anims.isPlaying) sp.play(anim);
  }

  movePlayer(delta) {
    const c = this.cursors;
    const k = this.keys;
    let dx = 0;
    let dy = 0;
    if (c.left.isDown || k.A.isDown) dx = -1;
    if (c.right.isDown || k.D.isDown) dx = 1;
    if (c.up.isDown || k.W.isDown) dy = -1;
    if (c.down.isDown || k.S.isDown) dy = 1;
    if (dx && dy) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    const moving = dx !== 0 || dy !== 0;
    const dist = (PLAYER_SPEED * delta) / 1000;
    const nx = this.player.x + dx * dist;
    if (!this.pointBlocked(nx, this.player.y)) this.player.x = nx;
    const ny = this.player.y + dy * dist;
    if (!this.pointBlocked(this.player.x, ny)) this.player.y = ny;
    // Map the heading to one of 8 directions and a 2-frame step. The "headed"
    // diagonals are real 2-frame walk cycles (R/R+1, L/L+1); cardinals pair their
    // facing pose with a headed pose so the legs still move. front = toward the
    // viewer (dy>=0), back = away (dy<0). atan2(dy,dx): 0=E, 90=S(down), ±180=W,
    // -90=N(up).
    // Only the four "headed" diagonals have real 2-frame walk cycles (R/R+1,
    // L/L+1). The four cardinals hold their single correct facing pose — toggling
    // them between mismatched poses produced the wrong "waddle". front = toward
    // the viewer (dy>=0), back = away (dy<0).
    if (moving) {
      const R = PLAYER_POSE.HEADED_RIGHT;
      const L = PLAYER_POSE.HEADED_LEFT;
      const a = (Math.atan2(dy, dx) * 180) / Math.PI;
      let sheet, frames;
      if (a >= -22.5 && a < 22.5) { sheet = "player_front"; frames = [PLAYER_POSE.FACING_RIGHT]; } // E
      else if (a >= 22.5 && a < 67.5) { sheet = "player_front"; frames = [R, R + 1]; } // SE
      else if (a >= 67.5 && a < 112.5) { sheet = "player_front"; frames = [PLAYER_POSE.STRAIGHT]; } // S
      else if (a >= 112.5 && a < 157.5) { sheet = "player_front"; frames = [L, L + 1]; } // SW
      else if (a >= 157.5 || a < -157.5) { sheet = "player_front"; frames = [PLAYER_POSE.FACING_LEFT]; } // W
      else if (a >= -157.5 && a < -112.5) { sheet = "player_back"; frames = [L, L + 1]; } // NW
      else if (a >= -112.5 && a < -67.5) { sheet = "player_back"; frames = [PLAYER_POSE.STRAIGHT]; } // N
      else { sheet = "player_back"; frames = [R, R + 1]; } // NE
      const step = Math.floor(this.time.now / 140) % frames.length;
      this.player.setTexture(sheet, frames[step]);
    } else {
      this.player.setTexture("player_front", PLAYER_IDLE_FRAME);
    }
    this.player.setFlipX(false);
    this.player.setDepth(this.player.y);
  }

  syncCustomers(st, delta) {
    for (const e of this.custs) {
      if (e.state === "leaving") continue;
      const c = st.customers.find((c) => c.id === e.id);
      if (!c || c.status !== "waiting") {
        e.state = "leaving";
        e.sprite.setAlpha(0.7);
      }
    }

    this.spawnAcc += delta;
    const present = this.custs.filter((e) => e.state !== "leaving");
    const known = new Set(this.custs.map((e) => e.id));
    const next = st.customers.find((c) => c.status === "waiting" && !known.has(c.id));
    if (next && present.length < SPOTS.length && this.spawnAcc >= SPAWN_INTERVAL) {
      this.spawnAcc = 0;
      // Enter walking north (up) toward the counter -> back view.
      const sprite = this.add
        .sprite(ENTRANCE.x, ENTRANCE.y, "hank_back", 0)
        .setOrigin(0.5, 1)
        .setScale(CHAR_SCALE);
      sprite.play("hank_back_walk");
      this.custs.push({
        id: next.id, recipeId: next.recipeId, name: next.name, sprite,
        state: "toSpot", order: this.order++,
      });
    }

    this.activeCusts().forEach((e, i) => (e.spotIndex = i));

    const step = (CUST_SPEED * delta) / 1000;
    for (const e of this.custs) {
      const t = e.state === "leaving" ? ENTRANCE : SPOTS[Math.min(e.spotIndex ?? 0, SPOTS.length - 1)];
      const dx = t.x - e.sprite.x;
      const dy = t.y - e.sprite.y;
      const d = Math.hypot(dx, dy);
      if (d < 2) {
        e.sprite.x = t.x;
        e.sprite.y = t.y;
        if (e.state === "leaving") {
          e.sprite.destroy();
          e._gone = true;
        } else {
          // Arrived at a queue spot — including after shuffling forward when the
          // customer ahead is served — so stop and face the counter (north).
          if (e.state === "toSpot") e.state = "waiting";
          if (e.sprite.anims.isPlaying) {
            e.sprite.stop();
            e.sprite.setTexture("hank_back", 0).setFlipX(false);
          }
        }
      } else {
        // Walking south (down) shows Hank's front; otherwise his back.
        const anim = dy > 0.5 ? "hank_front_walk" : "hank_back_walk";
        if (e.sprite.anims.currentAnim?.key !== anim || !e.sprite.anims.isPlaying) e.sprite.play(anim);
        e.sprite.setFlipX(dx < 0);
        e.sprite.x += (dx / d) * step;
        e.sprite.y += (dy / d) * step;
      }
      e.sprite.setDepth(e.sprite.y);
    }
    this.custs = this.custs.filter((e) => !e._gone);
  }

  handleServe(st) {
    const front = this.frontCustomer();
    if (!front || !this.canServe()) return;
    if (Phaser.Input.Keyboard.JustDown(this.space) || Phaser.Input.Keyboard.JustDown(this.eKey))
      bridge.dispatch({ type: "SERVE", customerId: front.id });
    if (Phaser.Input.Keyboard.JustDown(this.tKey))
      bridge.dispatch({ type: "TURN_AWAY", customerId: front.id, reason: "stock" });
  }

  updateBubbles(st) {
    const front = this.frontCustomer();
    if (front) {
      const recipe = RECIPES[front.recipeId];
      const bx = front.sprite.x;
      const by = front.sprite.y - 80; // text baseline, above the customer's head
      this.bubble.setText(recipe.name).setPosition(bx, by).setVisible(true);
      this.drawSpeechBubble(this.bubbleBg, bx, by, this.bubble.width, this.bubble.height, 0xffe9c4);
      this.bubbleBg.setVisible(true);
    } else {
      this.bubble.setVisible(false);
      this.bubbleBg.setVisible(false);
    }
    if (front && this.canServe()) {
      const ok = canMake(st.pantry, front.recipeId);
      const price = st.menu[front.recipeId]?.price ?? 0;
      const text = ok ? this.serveLine(front, price) : "Sorry, we're fresh out of that one!";
      const px = this.player.x;
      const py = this.player.y - 80;
      this.prompt.setText(text).setPosition(px, py).setVisible(true);
      this.drawSpeechBubble(this.promptBg, px, py, this.prompt.width, this.prompt.height, 0xfffbe8);
      this.promptBg.setVisible(true);
    } else {
      this.prompt.setVisible(false);
      this.promptBg.setVisible(false);
    }
  }

  // Rounded speech bubble with a downward tail, drawn into graphics object `g`,
  // sized to text (origin 0.5,1 at bx,by — so the text occupies [by-h, by]).
  drawSpeechBubble(g, bx, by, w, h, fill = 0xffe9c4) {
    const padX = 9;
    const padY = 5;
    const r = 7;
    const tailW = 7;
    const tailH = 9;
    const rw = w + padX * 2;
    const rh = h + padY * 2;
    const left = bx - rw / 2;
    const top = by - h - padY;
    const bottom = by + padY;
    g.clear();
    g.fillStyle(fill, 1);
    g.lineStyle(2, 0x3a2410, 1);
    g.fillRoundedRect(left, top, rw, rh, r);
    g.strokeRoundedRect(left, top, rw, rh, r);
    // Tail pointing down toward the speaker; fill over the box outline, then
    // stroke just the two slanted edges so it reads as one shape.
    g.fillTriangle(bx - tailW, bottom - 1, bx + tailW, bottom - 1, bx, bottom + tailH);
    g.lineBetween(bx - tailW, bottom, bx, bottom + tailH);
    g.lineBetween(bx + tailW, bottom, bx, bottom + tailH);
  }

  // A varied barista line for taking an order, stable per customer.
  serveLine(front, price) {
    const p = `$${price.toFixed(2)}`;
    const lines = [
      `Okay, that'll be ${p}!`,
      `Sure thing — ${p}, please.`,
      `Coming right up! ${p}.`,
      `Here you go! ${p}.`,
      `One moment... ${p}.`,
      `Lovely choice! ${p}.`,
    ];
    return lines[front.order % lines.length];
  }
}

export const SHOP_W = Math.round(W * DISPLAY_SCALE);
export const SHOP_H = Math.round(H * DISPLAY_SCALE);
