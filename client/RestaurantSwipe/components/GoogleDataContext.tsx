import { DietaryRestriction, Meal } from "@/types/Meal";
import React, { createContext, useState } from "react";

type GoogleData = {
  tag_map: { [key: string]: boolean };
  rating_tag_string: string;
  budget_date_array: Array<{
    res_id: number;
    budget: Array<number>;
    tags: Array<string>;
  }>;
};
export const GoogleDataContext = createContext<{
  googleData: GoogleData;
  setGoogleData: React.Dispatch<React.SetStateAction<GoogleData>>;
} | null>(null);

export const GoogleDataProvider = (props: any) => {
  const [googleData, setGoogleData] = useState<GoogleData>({
    tag_map: {},
    rating_tag_string: "",
    budget_date_array: [],
  });

  return (
    <GoogleDataContext.Provider value={{ googleData, setGoogleData }}>
      {props.children}
    </GoogleDataContext.Provider>
  );
};
