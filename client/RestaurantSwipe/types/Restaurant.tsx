export type Restaurant = {
  id: string;
  place_id?: string;
  score?: number;
  disliked?: boolean;
  userScore?: number;
  hidden?: boolean;
  vetoed?: boolean;
  unseen?: boolean;
  approvedByUser?: number;
  name?: string;
  address?: string;
  location?: { latitude: string; longitude: string };
  open?: boolean;
  inBudget?: boolean;
  rating?: number | null;
  priceLevel?: string;
  rating_count?: number;
  regularOpeningHours?: Array<{
    open: { day: number; hour: number; minute: number };
    close: { day: number; hour: number; minute: number };
  }>;
  hours?: Array<string>;
  photos?: Array<Photo>;
  types?: Array<string>;
  tags?: Array<string>;
  accessibilityOptions?: {
    wheelchairAccessibleParking: boolean;
    wheelchairAccessibleEntrance: boolean;
    wheelchairAccessibleRestroom: boolean;
    wheelchairAccessibleSeating: boolean;
  };
  website?: string;
  googleMapsUri?: string;
  phone?: string;
  userRatingCount?: number;
  takeout?: boolean;
  delivery?: boolean;
  dineIn?: boolean;
  curbsidePickup?: boolean;
  servesBreakfast?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesBeer?: boolean;
  servesWine?: boolean;
  servesBrunch?: boolean;
  servesVegetarianFood?: boolean;
  outdoorSeating?: boolean;
  liveMusic?: boolean;
  menuForChildren?: boolean;
  servesCocktails?: boolean;
  servesDessert?: boolean;
  servesCoffee?: boolean;
  goodForChildren?: boolean;
  allowsDogs?: boolean;
  restroom?: boolean;
  goodForGroups?: boolean;
  goodForWatchingSports?: boolean;
  paymentOptions?: {
    acceptsCreditCards: boolean;
    acceptsDebitCards: boolean;
    acceptsCashOnly: boolean;
    acceptsNfc: boolean;
  };
  parkingOptions?: {
    paidParkingLot: boolean;
    paidStreetParking: boolean;
    valetParking: boolean;
  };
};

export type RestaurantScore = {
  res_id: string;
  unseen: boolean;
  total_score: number;
  disliked: boolean;
  vetoed: boolean;
  approved_by_user: number;
  user_raw_score: number;
  hidden_from_user: boolean;
  is_open: boolean;
  in_budget: boolean;
};

export type Photo = {
  name: string;
  uri: string;
  authors: Array<{ displayName: string; uri: string; photoUri: string }>;
};

export type MealRestaurant = { [key: string]: Restaurant };
