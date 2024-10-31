import { ImageSourcePropType } from "react-native";

export type DietaryRestriction =
  | "Vegetarian"
  | "Vegan"
  | "Dairy Free"
  | "Nut Free"
  | "Gluten Free";

export type MealSettings = {
  profile: {
    id: string;
    meal_name: string;
    image?: ImageSourcePropType;
  };
  googleFilters: {
    date: Date;
    address?: string;
    place_id: string;
    location_coords?: Array<number>;
    budget: Array<number>;
    distance: number;
    diets?: Array<DietaryRestriction>;
    externalUpdate: boolean;
  };
  affectsScores: {
    rating?: number;
    members: Array<string>;
    member_ids?: Array<number>;
    badPreferences?: Array<string>;
  };
  roundControl: {
    round?: number;
    memberRound?: number;
  };
};
