export type DietaryRestriction =
  | "Vegetarian"
  | "Vegan"
  | "Dairy Free"
  | "Nut Free"
  | "Gluten Free";

export type Meal = {
  id: string;
  name: string;
  date?: Date;
  budget: Array<number>;
  distance: number;
  rating: number;
  address: string;
  place_id: string;
  location_coords: Array<number>;
  diets: Array<DietaryRestriction>;
  badPreferences: Array<string>;
};
