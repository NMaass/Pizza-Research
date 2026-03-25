/**
 * Canonical topping taxonomy merged from major pizza chains
 * (Domino's, Pizza Hut, Papa John's, Little Caesars, etc.)
 *
 * Each topping has a canonical name and known aliases for fuzzy matching.
 */

export interface ToppingEntry {
  canonical: string;
  aliases: string[];
  category: "meat" | "vegetable" | "cheese" | "seafood" | "sauce" | "other";
}

export const TOPPING_TAXONOMY: ToppingEntry[] = [
  // Meats
  { canonical: "pepperoni", aliases: ["pepperoni", "peperoni", "old world pepperoni", "cup & char pepperoni"], category: "meat" },
  { canonical: "sausage", aliases: ["italian sausage", "sausage", "pork sausage"], category: "meat" },
  { canonical: "bacon", aliases: ["bacon", "bacon strips", "applewood bacon", "hickory smoked bacon"], category: "meat" },
  { canonical: "ham", aliases: ["ham", "smoked ham", "virginia ham", "diced ham"], category: "meat" },
  { canonical: "grilled chicken", aliases: ["grilled chicken", "chicken", "chicken breast", "rotisserie chicken", "premium chicken"], category: "meat" },
  { canonical: "beef", aliases: ["beef", "ground beef", "seasoned beef", "beef topping", "premium beef"], category: "meat" },
  { canonical: "salami", aliases: ["salami", "genoa salami"], category: "meat" },
  { canonical: "philly steak", aliases: ["philly steak", "steak", "philly meat", "premium steak"], category: "meat" },
  { canonical: "canadian bacon", aliases: ["canadian bacon"], category: "meat" },
  { canonical: "chorizo", aliases: ["chorizo"], category: "meat" },
  { canonical: "meatball", aliases: ["meatball", "meatballs", "italian meatball"], category: "meat" },
  { canonical: "prosciutto", aliases: ["prosciutto"], category: "meat" },
  { canonical: "pulled pork", aliases: ["pulled pork", "bbq pulled pork"], category: "meat" },

  // Vegetables
  { canonical: "mushrooms", aliases: ["mushroom", "mushrooms", "baby portabella mushrooms", "portobello", "cremini"], category: "vegetable" },
  { canonical: "onions", aliases: ["onion", "onions", "diced onions", "white onions"], category: "vegetable" },
  { canonical: "red onions", aliases: ["red onion", "red onions"], category: "vegetable" },
  { canonical: "green peppers", aliases: ["green pepper", "green peppers", "bell pepper", "green bell pepper"], category: "vegetable" },
  { canonical: "roasted red peppers", aliases: ["roasted red pepper", "roasted red peppers", "roasted peppers"], category: "vegetable" },
  { canonical: "banana peppers", aliases: ["banana pepper", "banana peppers", "mild banana peppers"], category: "vegetable" },
  { canonical: "jalapeños", aliases: ["jalapeno", "jalapeño", "jalapenos", "jalapeños", "diced jalapenos"], category: "vegetable" },
  { canonical: "black olives", aliases: ["black olive", "black olives", "sliced black olives"], category: "vegetable" },
  { canonical: "green olives", aliases: ["green olive", "green olives"], category: "vegetable" },
  { canonical: "tomatoes", aliases: ["tomato", "tomatoes", "diced tomatoes", "roma tomatoes", "sliced tomatoes", "fresh tomatoes"], category: "vegetable" },
  { canonical: "sun-dried tomatoes", aliases: ["sun dried tomato", "sun-dried tomatoes", "sundried tomatoes"], category: "vegetable" },
  { canonical: "spinach", aliases: ["spinach", "fresh spinach", "baby spinach"], category: "vegetable" },
  { canonical: "artichoke hearts", aliases: ["artichoke", "artichoke hearts", "artichokes"], category: "vegetable" },
  { canonical: "broccoli", aliases: ["broccoli"], category: "vegetable" },
  { canonical: "pineapple", aliases: ["pineapple", "pineapple tidbits"], category: "vegetable" },
  { canonical: "garlic", aliases: ["garlic", "roasted garlic", "fresh garlic", "minced garlic"], category: "vegetable" },
  { canonical: "basil", aliases: ["basil", "fresh basil"], category: "vegetable" },
  { canonical: "arugula", aliases: ["arugula", "rocket"], category: "vegetable" },
  { canonical: "corn", aliases: ["corn", "sweet corn", "roasted corn"], category: "vegetable" },
  { canonical: "zucchini", aliases: ["zucchini", "courgette"], category: "vegetable" },
  { canonical: "eggplant", aliases: ["eggplant", "aubergine"], category: "vegetable" },
  { canonical: "hot peppers", aliases: ["hot peppers", "cherry peppers", "hot cherry peppers", "pepperoncini"], category: "vegetable" },

  // Cheeses (beyond base mozzarella)
  { canonical: "extra cheese", aliases: ["extra cheese", "extra mozzarella", "double cheese"], category: "cheese" },
  { canonical: "parmesan", aliases: ["parmesan", "parmigiano", "parmesan asiago"], category: "cheese" },
  { canonical: "feta", aliases: ["feta", "feta cheese", "crumbled feta"], category: "cheese" },
  { canonical: "ricotta", aliases: ["ricotta", "ricotta cheese"], category: "cheese" },
  { canonical: "cheddar", aliases: ["cheddar", "cheddar cheese", "sharp cheddar"], category: "cheese" },
  { canonical: "provolone", aliases: ["provolone", "provolone cheese"], category: "cheese" },
  { canonical: "goat cheese", aliases: ["goat cheese", "chevre"], category: "cheese" },
  { canonical: "blue cheese", aliases: ["blue cheese", "gorgonzola", "bleu cheese"], category: "cheese" },

  // Seafood
  { canonical: "anchovies", aliases: ["anchovy", "anchovies"], category: "seafood" },
  { canonical: "shrimp", aliases: ["shrimp", "prawns", "grilled shrimp"], category: "seafood" },

  // Sauces (as toppings / drizzles)
  { canonical: "bbq sauce", aliases: ["bbq sauce", "barbecue sauce", "bbq drizzle"], category: "sauce" },
  { canonical: "buffalo sauce", aliases: ["buffalo sauce", "hot sauce", "buffalo"], category: "sauce" },
  { canonical: "ranch", aliases: ["ranch", "ranch drizzle", "ranch sauce"], category: "sauce" },
  { canonical: "alfredo sauce", aliases: ["alfredo", "alfredo sauce", "white sauce", "garlic parmesan sauce"], category: "sauce" },
  { canonical: "pesto", aliases: ["pesto", "basil pesto", "pesto sauce"], category: "sauce" },

  // Other
  { canonical: "fresh mozzarella", aliases: ["fresh mozzarella", "mozzarella slices", "fresh mozz"], category: "cheese" },
  { canonical: "truffle oil", aliases: ["truffle oil", "truffle", "truffle drizzle"], category: "other" },
  { canonical: "honey", aliases: ["honey", "hot honey", "mike's hot honey"], category: "other" },
  { canonical: "egg", aliases: ["egg", "fried egg", "sunny side egg"], category: "other" },
];

/** Get all canonical topping names */
export function getAllToppings(): string[] {
  return TOPPING_TAXONOMY.map((t) => t.canonical);
}

/** Simple fuzzy match: check if input matches any alias (case-insensitive, trimmed) */
export function matchTopping(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  for (const entry of TOPPING_TAXONOMY) {
    if (entry.canonical === normalized) return entry.canonical;
    for (const alias of entry.aliases) {
      if (alias.toLowerCase() === normalized) return entry.canonical;
    }
  }
  // Partial match: check if input contains or is contained by an alias
  for (const entry of TOPPING_TAXONOMY) {
    for (const alias of entry.aliases) {
      const a = alias.toLowerCase();
      if (normalized.includes(a) || a.includes(normalized)) {
        return entry.canonical;
      }
    }
  }
  return null;
}

/**
 * Calculate max possible 3-topping combos using progressive subset math.
 * C(n,1) + C(n,2) + C(n,3) for n toppings.
 */
export function calculateMaxCombos(): number {
  const n = TOPPING_TAXONOMY.length;
  const c1 = n; // single toppings
  const c2 = (n * (n - 1)) / 2; // two-topping combos
  const c3 = (n * (n - 1) * (n - 2)) / 6; // three-topping combos
  return c1 + c2 + c3;
}

/**
 * Create a canonical combo key from a list of toppings.
 * Sorts alphabetically and joins with "|".
 */
export function comboKey(toppings: string[]): string {
  return [...toppings].sort().join("|");
}
