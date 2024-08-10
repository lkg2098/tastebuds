import axiosAuth from "@/api/auth";
import CuisineSelector from "@/components/CuisineSelector";
import GradientButton from "@/components/GradientButton";
import { MealSettingsContext } from "@/components/MealSettingsContext";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { DietaryRestriction } from "@/types/Meal";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect } from "react";

export default function Preferences() {
  const { mealId, google_sql_string, tag_map, preferences } =
    useLocalSearchParams();
  const router = useRouter();
  const background = useThemeColor({}, "background");
  const context = useContext(MealSettingsContext);
  useEffect(() => {
    console.log(context?.test);
    context?.setTest({
      id: "",
      name: "New Meal",
      date: undefined,
      budget: [],
      distance: 5,
      rating: 3,
      address: "BBBBBB",
      place_id: "",
      location_coords: [],
      diets: [] as DietaryRestriction[],
      badPreferences: [],
    });
  }, []);
  useEffect(() => {
    console.log("GOOGLE DATA");
    console.log(google_sql_string);
  }, [google_sql_string]);

  const handleSubmit = () => {};

  return (
    <ThemedView
      style={{
        flex: 1,
        alignItems: "center",
        backgroundColor: background,
        paddingVertical: "20%",
      }}
    >
      <CuisineSelector
        mealId={Number(mealId)}
        userId={1}
        positive={false}
        tagMap={tag_map}
        handleSubmit={handleSubmit}
      />
    </ThemedView>
  );
}
