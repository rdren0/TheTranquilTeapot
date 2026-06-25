import { INGREDIENTS } from "./ingredients.js";
import { RECIPES, recipeCost } from "./recipes.js";

// ---------------------------------------------------------------------------
// Tunable balance constants. Tweak these to change the feel of the economy.
// ---------------------------------------------------------------------------
export const CONFIG = {
  startingMoney: 60,
  dailyRent: 12,
  // Customers per day = base + a bonus that scales with reputation.
  baseCustomers: 5,
  reputationCustomerBonus: 6, // at 100 reputation, +6 extra customers
  startingReputation: 50,
  reputationMin: 0,
  reputationMax: 100,
};

const SAVE_KEY = "tranquil-teapot-save-v1";

// Some first names for flavour. Customers are cosmetic but make it cozy.
const NAMES = ["Miriam"];

// Villager faces for the customers who shuffle up to the counter.
const AVATARS = [
  "🧑", "👩", "👨", "🧓", "👵", "🧒", "👱‍♀️", "👨‍🦰",
  "👩‍🦱", "🧔", "👴", "👲", "🧕", "👩‍🦰", "🧑‍🦱", "👨‍🦳",
];

let _id = 0;
const uid = (p) => `${p}_${Date.now().toString(36)}_${_id++}`;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Weighted pick of a recipe id from the teas currently on the menu.
function weightedRecipe(menuIds) {
  const weighted = menuIds.flatMap((id) =>
    Array(RECIPES[id].popularity).fill(id),
  );
  return pick(weighted.length ? weighted : menuIds);
}

// Build the day's customers. Each wants one tea from the menu and has a private
// max price they'll tolerate (relative to the tea's suggested price).
function generateCustomers(state) {
  const menuIds = Object.keys(state.menu).filter((id) => state.menu[id].enabled);
  if (menuIds.length === 0) return [];

  const repFactor = state.reputation / CONFIG.reputationMax;
  const count = Math.max(
    1,
    Math.round(
      CONFIG.baseCustomers + CONFIG.reputationCustomerBonus * repFactor,
    ),
  );

  return Array.from({ length: count }, () => {
    const recipeId = weightedRecipe(menuIds);
    const suggested = RECIPES[recipeId].suggestedPrice;
    // Willingness to pay: 85%–135% of the suggested price.
    const maxPrice = +(suggested * (0.85 + Math.random() * 0.5)).toFixed(2);
    return {
      id: uid("cust"),
      name: pick(NAMES),
      avatar: pick(AVATARS),
      recipeId,
      maxPrice,
      status: "waiting", // waiting | served | declined | unfulfilled
    };
  });
}

export function initialState() {
  // Start with a small pantry and the two basic teas on the menu.
  const menu = Object.fromEntries(
    Object.values(RECIPES).map((r) => [
      r.id,
      {
        enabled: r.id === "classicBlack" || r.id === "greenSerenity",
        price: r.suggestedPrice,
      },
    ]),
  );

  return {
    day: 1,
    phase: "prep", // prep | service | summary
    money: CONFIG.startingMoney,
    reputation: CONFIG.startingReputation,
    pantry: { blackTea: 6, greenTea: 6, honey: 2, milk: 2 },
    menu,
    customers: [],
    // Running tally for the day, reset each morning, shown in the summary.
    ledger: { revenue: 0, tips: 0, supplyCost: 0, served: 0, lost: 0 },
  };
}

// True if the pantry currently holds enough to make one cup of `recipeId`.
export function canMake(pantry, recipeId) {
  const r = RECIPES[recipeId];
  return Object.entries(r.ingredients).every(
    ([id, qty]) => (pantry[id] || 0) >= qty,
  );
}

function deductIngredients(pantry, recipeId) {
  const next = { ...pantry };
  for (const [id, qty] of Object.entries(RECIPES[recipeId].ingredients)) {
    next[id] = (next[id] || 0) - qty;
  }
  return next;
}

function clampRep(v) {
  return Math.max(CONFIG.reputationMin, Math.min(CONFIG.reputationMax, v));
}

// ---------------------------------------------------------------------------
// Reducer: the single source of truth for all game actions.
// ---------------------------------------------------------------------------
export function reducer(state, action) {
  switch (action.type) {
    case "BUY_SUPPLY": {
      const { ingredientId, qty } = action;
      const unit = INGREDIENTS[ingredientId].cost;
      const total = +(unit * qty).toFixed(2);
      if (qty <= 0 || total > state.money) return state;
      return {
        ...state,
        money: +(state.money - total).toFixed(2),
        pantry: {
          ...state.pantry,
          [ingredientId]: (state.pantry[ingredientId] || 0) + qty,
        },
        ledger: {
          ...state.ledger,
          supplyCost: +(state.ledger.supplyCost + total).toFixed(2),
        },
      };
    }

    case "TOGGLE_MENU": {
      const item = state.menu[action.recipeId];
      return {
        ...state,
        menu: {
          ...state.menu,
          [action.recipeId]: { ...item, enabled: !item.enabled },
        },
      };
    }

    case "SET_PRICE": {
      const price = Math.max(0, +(+action.price).toFixed(2));
      return {
        ...state,
        menu: {
          ...state.menu,
          [action.recipeId]: { ...state.menu[action.recipeId], price },
        },
      };
    }

    case "OPEN_SHOP": {
      if (state.phase !== "prep") return state;
      return {
        ...state,
        phase: "service",
        customers: generateCustomers(state),
        ledger: { revenue: 0, tips: 0, supplyCost: state.ledger.supplyCost, served: 0, lost: 0 },
      };
    }

    case "SERVE": {
      const cust = state.customers.find((c) => c.id === action.customerId);
      if (!cust || cust.status !== "waiting") return state;
      const price = state.menu[cust.recipeId].price;

      // Out of stock — we have to turn them away.
      if (!canMake(state.pantry, cust.recipeId)) {
        return reducer(state, { type: "TURN_AWAY", customerId: cust.id, reason: "stock" });
      }
      // Priced above what they'll pay — they politely decline.
      if (price > cust.maxPrice) {
        return reducer(state, { type: "TURN_AWAY", customerId: cust.id, reason: "price" });
      }

      // A happy customer who got a bargain may leave a tip.
      const bargain = (cust.maxPrice - price) / cust.maxPrice; // 0..~0.4
      const tip = bargain > 0.15 && Math.random() < bargain ? +(price * 0.15).toFixed(2) : 0;

      return {
        ...state,
        money: +(state.money + price + tip).toFixed(2),
        pantry: deductIngredients(state.pantry, cust.recipeId),
        reputation: clampRep(state.reputation + 1),
        customers: state.customers.map((c) =>
          c.id === cust.id ? { ...c, status: "served", paid: price, tip } : c,
        ),
        ledger: {
          ...state.ledger,
          revenue: +(state.ledger.revenue + price).toFixed(2),
          tips: +(state.ledger.tips + tip).toFixed(2),
          served: state.ledger.served + 1,
        },
      };
    }

    case "TURN_AWAY": {
      const cust = state.customers.find((c) => c.id === action.customerId);
      if (!cust || cust.status !== "waiting") return state;
      const status = action.reason === "price" ? "declined" : "unfulfilled";
      // Turning someone away stings reputation a little.
      return {
        ...state,
        reputation: clampRep(state.reputation - 2),
        customers: state.customers.map((c) =>
          c.id === cust.id ? { ...c, status } : c,
        ),
        ledger: { ...state.ledger, lost: state.ledger.lost + 1 },
      };
    }

    case "END_DAY": {
      if (state.phase !== "service") return state;
      // Any customers still waiting wander off unhappy.
      const stillWaiting = state.customers.filter((c) => c.status === "waiting");
      const repPenalty = stillWaiting.length * 2;
      return {
        ...state,
        phase: "summary",
        reputation: clampRep(state.reputation - repPenalty),
        customers: state.customers.map((c) =>
          c.status === "waiting" ? { ...c, status: "unfulfilled" } : c,
        ),
        ledger: { ...state.ledger, lost: state.ledger.lost + stillWaiting.length },
      };
    }

    case "NEXT_DAY": {
      if (state.phase !== "summary") return state;
      return {
        ...state,
        day: state.day + 1,
        phase: "prep",
        money: +(state.money - CONFIG.dailyRent).toFixed(2),
        customers: [],
        ledger: { revenue: 0, tips: 0, supplyCost: 0, served: 0, lost: 0 },
      };
    }

    case "LOAD":
      return action.state;

    case "RESET":
      return initialState();

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Persistence helpers (localStorage).
// ---------------------------------------------------------------------------
export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — ignore, game still runs in-memory */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export { recipeCost };
