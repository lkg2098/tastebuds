import axiosAuth from "@/api/auth";
import CuisineSelector from "@/components/CuisineSelector";
import GradientButton from "@/components/GradientButton";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Preferences() {
  const { mealId, google_data_string, tag_map, rating } = useLocalSearchParams<{
    mealId: string;
    google_data_string: string;
    tag_map: string;
    rating: string;
  }>();
  const router = useRouter();
  const background = useThemeColor({}, "background");
  useEffect(() => {
    console.log("GOOGLE DATA");
    console.log(google_data_string);
    console.log(tag_map);
  }, [google_data_string, tag_map]);

  const handleSubmit = async (preferences: Array<string>) => {
    console.log(preferences);
    try {
      let response = await axiosAuth.post(`/meals/${mealId}/preferences`, {
        preferences,
        min_rating: rating,
        google_data_string: google_data_string,
      });

      if (response.status == 200) {
        router.navigate({
          pathname: `../${mealId}`,
          params: { preferences: JSON.stringify(preferences) },
        });
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <ThemedView
      style={{
        flex: 1,
        alignItems: "center",
        backgroundColor: background,
        paddingVertical: 10,
      }}
    >
      <ThemedText type="title">What don't you want to eat?</ThemedText>
      <CuisineSelector
        positive={false}
        tagMap={tag_map ? JSON.parse(tag_map) : {}}
        handleSubmit={handleSubmit}
      />
    </ThemedView>
  );
}
