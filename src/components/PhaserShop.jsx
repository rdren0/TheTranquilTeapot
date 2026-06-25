import { useEffect, useRef } from "react";
import Phaser from "phaser";
import ShopScene, { SHOP_W, SHOP_H } from "../phaser/ShopScene.js";
import { bridge } from "../phaser/bridge.js";
import { money } from "../format.js";

// The scene itself sizes the canvas (SHOP_W/H) and zooms its camera, so no
// extra canvas zoom here.
const ZOOM = 1;

export default function PhaserShop({ state, dispatch }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  // Keep the bridge pointed at the freshest state / dispatch every render.
  bridge.state = state;
  bridge.dispatch = dispatch;

  // Create the Phaser game once, on mount.
  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: SHOP_W,
      height: SHOP_H,
      zoom: ZOOM,
      pixelArt: true,
      backgroundColor: "#2c1810",
      physics: { default: "arcade", arcade: { debug: false } },
      scene: [ShopScene],
    });
    gameRef.current = game;
    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const earned = state.ledger.revenue + state.ledger.tips;
  const remaining = state.customers.filter((c) => c.status === "waiting").length;

  return (
    <div className="topdown">
      <div className="td-hud">
        <div className="hud-tally sv-frame">
          <span>☕ {state.ledger.served}</span>
          <span>💰 {money(earned)}</span>
          {state.ledger.lost > 0 && <span className="hud-lost">🙁 {state.ledger.lost}</span>}
          <span className="hud-left">· {remaining} to come</span>
        </div>
        <button className="wood-btn wood-btn-warn" onClick={() => dispatch({ type: "END_DAY" })}>
          🌙 Close Up
        </button>
      </div>

      <div className="phaser-frame topdown-room" ref={containerRef} />

      <p className="controls-hint">
        <b>WASD / Arrows</b> to move · stand at the counter and press{" "}
        <b>Space</b> to serve · <b>T</b> to turn away
      </p>
    </div>
  );
}
