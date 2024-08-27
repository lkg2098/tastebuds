import { ImageSourcePropType } from "react-native";

export type DietaryRestriction =
  | "Vegetarian"
  | "Vegan"
  | "Dairy Free"
  | "Nut Free"
  | "Gluten Free";

export type Meal = {
  id: string;
  meal_name: string;
  date: Date;
  image?: ImageSourcePropType;
  budget: Array<number>;
  distance: number;
  rating?: number;
  members: Array<string>;
  member_ids?: Array<number>;
  address?: string;
  place_id: string;
  location_coords?: Array<number>;
  diets?: Array<DietaryRestriction>;
  badPreferences?: Array<string>;
  liked?: boolean;
  chosen_restaurant?: string;
};
