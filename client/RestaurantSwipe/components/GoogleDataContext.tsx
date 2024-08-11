import { DietaryRestriction, Meal } from "@/types/Meal";
import React, { createContext, useState } from "react";

type GoogleData = {
  tag_map: { [key: string]: boolean };
  google_sql_string: string;
};
export const GoogleDataContext = createContext<{
  googleData: GoogleData;
  setGoogleData: React.Dispatch<React.SetStateAction<GoogleData>>;
} | null>(null);

export const GoogleDataProvider = (props: any) => {
  const [googleData, setGoogleData] = useState<GoogleData>({
    tag_map: {},
    google_sql_string: "",
  });

  return (
    <GoogleDataContext.Provider value={{ googleData, setGoogleData }}>
      {props.children}
    </GoogleDataContext.Provider>
  );
};
