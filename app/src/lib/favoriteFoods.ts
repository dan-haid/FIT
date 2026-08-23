// favoriteFoods.ts - User favorite foods and Desi meals with estimated macros

export interface FavoriteFood {
  name: string;
  category: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  calories: number;
  protein: number;
  unit: string;
}

export const FAVORITE_FOODS: FavoriteFood[] = [
  // High-Protein Staples
  { name: "Skyr (Low Fat)", category: "Breakfast", calories: 125, protein: 22, unit: "200g" },
  { name: "Magerquark (Low Fat)", category: "Snacks", calories: 135, protein: 24, unit: "200g" },
  { name: "Körniger Frischkäse (Cottage Cheese)", category: "Snacks", calories: 155, protein: 23, unit: "200g" },
  { name: "Boiled Eggs (4 eggs)", category: "Breakfast", calories: 280, protein: 24, unit: "4 eggs" },
  { name: "Whey Protein Shake (water)", category: "Snacks", calories: 120, protein: 25, unit: "1 scoop" },
  { name: "Kaufland Protein Milk", category: "Snacks", calories: 125, protein: 12.5, unit: "250ml glass" },

  // Desi Foods & Daily Dishes
  { name: "Lahori Murgh Chanay (chicken & chickpeas)", category: "Dinner", calories: 400, protein: 17, unit: "1 plate" },
  { name: "Omelette & Paratha", category: "Breakfast", calories: 500, protein: 17, unit: "1 serving" },
  { name: "Daal Chawal (lentil rice)", category: "Dinner", calories: 380, protein: 12, unit: "1 plate" },
  { name: "Mince Meat Tikki", category: "Dinner", calories: 85, protein: 7, unit: "1 small tikki" },
  { name: "Turkish Bread (Pide, half)", category: "Lunch", calories: 600, protein: 18, unit: "250g (half)" },
  { name: "Turkish Bread (Pide, 1/3)", category: "Breakfast", calories: 400, protein: 12, unit: "160g (1/3)" },
  { name: "Boiled Basmati Rice", category: "Dinner", calories: 200, protein: 4, unit: "1 plate (150g)" },
  { name: "Chicken Biryani", category: "Lunch", calories: 550, protein: 25, unit: "1 plate" },
  { name: "Roti (Whole Wheat Flatbread)", category: "Dinner", calories: 120, protein: 3.5, unit: "1 piece" },
  { name: "Desi Ghee / Homemade Butter", category: "Snacks", calories: 110, protein: 0, unit: "1 tbsp (13g)" },

  // Sweets & Desserts
  { name: "Barfi (Milk Sweet)", category: "Snacks", calories: 150, protein: 2, unit: "1 piece" },
  { name: "Gulab Jaman", category: "Snacks", calories: 150, protein: 2, unit: "1 piece" },

  // Gym / Restaurant Staples
  { name: "City Chicken Special (Half)", category: "Dinner", calories: 600, protein: 60, unit: "half chicken" },
  { name: "Parmesan Fries", category: "Dinner", calories: 450, protein: 8, unit: "1 portion" },
  { name: "Buffalo Wings (3 wings)", category: "Dinner", calories: 250, protein: 15, unit: "3 wings" }
];
