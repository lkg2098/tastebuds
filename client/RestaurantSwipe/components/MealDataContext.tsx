import { DietaryRestriction, Meal } from "@/types/Meal";
import React, { createContext, useState } from "react";

export const MealDataContext = createContext<{
  mealData: Meal;
  setMealData: React.Dispatch<React.SetStateAction<Meal>>;
} | null>(null);

export const MealDataProvider = (props: any) => {
  const [mealData, setMealData] = useState<Meal>({
    id: "",
    meal_name: "New Meal",
    date: new Date(),
    budget: [1, 5],
    distance: 1,
    rating: 3,
    address: "",
    place_id: "",
    location_coords: [],
    diets: [] as DietaryRestriction[],
    badPreferences: [],
    members: [],
  });

  return (
    <MealDataContext.Provider value={{ mealData, setMealData }}>
      {props.children}
    </MealDataContext.Provider>
  );
};
