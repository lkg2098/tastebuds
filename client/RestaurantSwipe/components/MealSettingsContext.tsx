import { DietaryRestriction, Meal } from "@/types/Meal";
import React, { createContext, useState } from "react";

export const MealSettingsContext = createContext<{
  test: Meal;
  setTest: React.Dispatch<React.SetStateAction<Meal>>;
} | null>(null);

export const MealSettingsProvider = (props: any) => {
  const [test, setTest] = useState<Meal>({
    id: "",
    name: "New Meal",
    date: undefined,
    budget: [],
    distance: 5,
    rating: 3,
    address: "",
    place_id: "",
    location_coords: [],
    diets: [] as DietaryRestriction[],
    badPreferences: [],
  });

  return (
    <MealSettingsContext.Provider value={{ test, setTest }}>
      {props.children}
    </MealSettingsContext.Provider>
  );
};
