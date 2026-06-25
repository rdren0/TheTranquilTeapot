import { INGREDIENTS } from "./ingredients.js";

// The teas the player can put on the menu. Each lists the ingredients (and
// quantities) it consumes to make one cup. `suggestedPrice` anchors what
// customers expect to pay; `popularity` weights how often it's ordered.
//
// In this first (shop & economy) slice, brewing is instant. The brew-timer and
// free-form mixing systems come in a later slice — recipes are the seed for it.
export const RECIPES = {
  classicBlack: {
    id: "classicBlack",
    name: "Classic Black",
    emoji: "☕",
    ingredients: { blackTea: 1 },
    suggestedPrice: 3.0,
    popularity: 5,
  },
  greenSerenity: {
    id: "greenSerenity",
    name: "Green Serenity",
    emoji: "🍵",
    ingredients: { greenTea: 1 },
    suggestedPrice: 3.0,
    popularity: 4,
  },
  peppermintCalm: {
    id: "peppermintCalm",
    name: "Peppermint Calm",
    emoji: "🌱",
    ingredients: { herbal: 1, mint: 1 },
    suggestedPrice: 3.5,
    popularity: 4,
  },
  gingerZing: {
    id: "gingerZing",
    name: "Ginger Zing",
    emoji: "🫚",
    ingredients: { blackTea: 1, ginger: 1 },
    suggestedPrice: 4.0,
    popularity: 3,
  },
  honeyLemon: {
    id: "honeyLemon",
    name: "Honey Lemon Soother",
    emoji: "🍯",
    ingredients: { greenTea: 1, lemon: 1, honey: 1 },
    suggestedPrice: 4.5,
    popularity: 3,
  },
  londonFog: {
    id: "londonFog",
    name: "London Fog",
    emoji: "🌫️",
    ingredients: { blackTea: 1, milk: 1, honey: 1 },
    suggestedPrice: 5.0,
    popularity: 3,
  },
  berryBliss: {
    id: "berryBliss",
    name: "Berry Bliss",
    emoji: "🫐",
    ingredients: { herbal: 1, berries: 1 },
    suggestedPrice: 4.5,
    popularity: 2,
  },
  roseGarden: {
    id: "roseGarden",
    name: "Rose Garden",
    emoji: "🌹",
    ingredients: { greenTea: 1, rose: 1 },
    suggestedPrice: 5.5,
    popularity: 2,
  },
};

export const RECIPE_LIST = Object.values(RECIPES);

// The wholesale cost of the ingredients in one cup of a recipe.
export function recipeCost(recipe) {
  return Object.entries(recipe.ingredients).reduce(
    (sum, [id, qty]) => sum + INGREDIENTS[id].cost * qty,
    0,
  );
}

// A short "🍂 ×1  🌱 ×1" style ingredient summary for the UI.
export function recipeIngredientLabel(recipe) {
  return Object.entries(recipe.ingredients)
    .map(([id, qty]) => `${INGREDIENTS[id].emoji}×${qty}`)
    .join("  ");
}
