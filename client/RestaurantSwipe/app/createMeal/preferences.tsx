import axiosAuth from "@/api/auth";
import CuisineSelector from "@/components/CuisineSelector";
import { GoogleDataContext } from "@/components/GoogleDataContext";
import GradientButton from "@/components/GradientButton";
import HeaderBar from "@/components/HeaderBar";
import { MealDataContext } from "@/components/MealDataContext";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { DietaryRestriction } from "@/types/Meal";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect } from "react";
import { Pressable } from "react-native";

export default function Preferences() {
  const { mealId } = useLocalSearchParams<{
    mealId: string;
  }>();
  const router = useRouter();
  const background = useThemeColor({}, "background");
  const googleContext = useContext(GoogleDataContext);
  const mealContext = useContext(MealDataContext);
  const color = useThemeColor({}, "text");

  const handleSubmit = (selected: Array<string>) => {
    if (mealContext) {
      mealContext.setMealData({
        ...mealContext.mealData,
        badPreferences: selected,
      });
    }
    router.navigate({
      pathname: "../createMeal",
    });
  };

  return (
    <ThemedView
      style={{
        flex: 1,
        alignItems: "center",
        backgroundColor: background,
        paddingBottom: "10%",
      }}
    >
      <HeaderBar
        headerLeft={
          <Pressable onPress={() => router.dismiss(1)}>
            <Ionicons name="chevron-back" color={color} size={18} />
          </Pressable>
        }
        headerCenter={
          <ThemedText type="defaultSemiBold">Don't Want to Eat</ThemedText>
        }
      />
      <CuisineSelector
        positive={false}
        tagMap={googleContext?.googleData?.tag_map || {}}
        initialPreferences={mealContext?.mealData?.badPreferences || []}
        handleSubmit={handleSubmit}
      />
    </ThemedView>
  );
}
