// A tiny mutable bridge so the Phaser scene can read the latest React game
// state and dispatch reducer actions, without React re-rendering the canvas.
// PhaserShop keeps `state` fresh every render and wires `dispatch` once.
export const bridge = {
  state: null,
  dispatch: () => {},
};
