import { useState } from "react";
import { money } from "../format.js";
import { INGREDIENT_LIST, INGREDIENTS } from "../game/ingredients.js";
import { RECIPE_LIST, recipeCost, recipeIngredientLabel } from "../game/recipes.js";

// ---- Supplier: buy raw goods for the pantry ------------------------------
function Supplier({ state, dispatch }) {
  const [qty, setQty] = useState(5);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>📦 Supplier</h2>
        <div className="qty-picker">
          <span>Buy</span>
          {[1, 5, 10].map((n) => (
            <button
              key={n}
              className={`chip ${qty === n ? "chip-on" : ""}`}
              onClick={() => setQty(n)}
            >
              ×{n}
            </button>
          ))}
        </div>
      </div>

      <ul className="supply-list">
        {INGREDIENT_LIST.map((ing) => {
          const total = ing.cost * qty;
          const have = state.pantry[ing.id] || 0;
          const afford = total <= state.money;
          return (
            <li key={ing.id} className="supply-row">
              <span className="supply-name">
                <span className="emoji">{ing.emoji}</span> {ing.name}
              </span>
              <span className="supply-have">have {have}</span>
              <button
                className="buy-btn"
                disabled={!afford}
                onClick={() =>
                  dispatch({ type: "BUY_SUPPLY", ingredientId: ing.id, qty })
                }
                title={afford ? `Buy ${qty} for ${money(total)}` : "Not enough cash"}
              >
                +{qty} · {money(total)}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---- Menu & pricing: choose which teas to sell and for how much -----------
function MenuBoard({ state, dispatch }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>📋 Menu &amp; Pricing</h2>
        <span className="hint">Toggle teas on, set your price</span>
      </div>

      <ul className="menu-list">
        {RECIPE_LIST.map((r) => {
          const item = state.menu[r.id];
          const cost = recipeCost(r);
          const margin = item.price - cost;
          return (
            <li key={r.id} className={`menu-row ${item.enabled ? "" : "menu-off"}`}>
              <label className="menu-toggle">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={() => dispatch({ type: "TOGGLE_MENU", recipeId: r.id })}
                />
                <span className="emoji">{r.emoji}</span>
                <span className="menu-name">
                  {r.name}
                  <small>{recipeIngredientLabel(r)} · costs {money(cost)}</small>
                </span>
              </label>

              <div className="price-box">
                <span className="dollar">$</span>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={item.price}
                  disabled={!item.enabled}
                  onChange={(e) =>
                    dispatch({ type: "SET_PRICE", recipeId: r.id, price: e.target.value })
                  }
                />
                <span className={`margin ${margin >= 0 ? "pos" : "neg"}`}>
                  {margin >= 0 ? "+" : ""}
                  {money(margin)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function Prep({ state, dispatch }) {
  const enabledCount = Object.values(state.menu).filter((m) => m.enabled).length;

  return (
    <div className="prep">
      <div className="prep-intro">
        <p>
          Good morning. Stock your pantry, set today's menu, then open the doors when
          you're ready.
        </p>
      </div>

      <div className="columns">
        <Supplier state={state} dispatch={dispatch} />
        <MenuBoard state={state} dispatch={dispatch} />
      </div>

      <div className="open-bar">
        {enabledCount === 0 && (
          <span className="warn">Put at least one tea on the menu to open.</span>
        )}
        <button
          className="primary-btn big"
          disabled={enabledCount === 0}
          onClick={() => dispatch({ type: "OPEN_SHOP" })}
        >
          🔔 Open the Shop
        </button>
      </div>
    </div>
  );
}
