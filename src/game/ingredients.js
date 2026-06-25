// The raw goods the player stocks in the pantry and buys from the supplier.
// `cost` is the price per unit to BUY from the supplier (wholesale).
export const INGREDIENTS = {
  blackTea: { id: "blackTea", name: "Black Tea Leaves", emoji: "🍂", cost: 0.6 },
  greenTea: { id: "greenTea", name: "Green Tea Leaves", emoji: "🍵", cost: 0.7 },
  herbal: { id: "herbal", name: "Herbal Base", emoji: "🌿", cost: 0.5 },
  mint: { id: "mint", name: "Fresh Mint", emoji: "🌱", cost: 0.4 },
  ginger: { id: "ginger", name: "Ginger Root", emoji: "🫚", cost: 0.5 },
  lemon: { id: "lemon", name: "Lemon", emoji: "🍋", cost: 0.4 },
  honey: { id: "honey", name: "Honey", emoji: "🍯", cost: 0.8 },
  milk: { id: "milk", name: "Milk", emoji: "🥛", cost: 0.3 },
  berries: { id: "berries", name: "Dried Berries", emoji: "🫐", cost: 0.9 },
  rose: { id: "rose", name: "Rose Petals", emoji: "🌹", cost: 1.0 },
};

export const INGREDIENT_LIST = Object.values(INGREDIENTS);
