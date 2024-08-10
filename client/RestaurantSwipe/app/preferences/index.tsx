import axiosAuth from "@/api/auth";
import CuisineSelector from "@/components/CuisineSelector";
import GradientButton from "@/components/GradientButton";
import RatingSettingsItem from "@/components/settingsComponents/RatingSettingsItem";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import StarRating from "react-native-star-rating-widget";

export default function Preferences() {
  const { mealId, google_sql_string, tag_map } = useLocalSearchParams();
  const router = useRouter();
  const tintColor = useThemeColor({}, "tint");
  const background = useThemeColor({}, "background");
  const [rating, setRating] = useState(3.5);

  const handleRating = (value: number) => {
    setRating(value);
  };

  return (
    <ThemedView
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: background,
      }}
    >
      <ThemedText type="title" style={styles.text}>
        I'd eat anywhere with a rating higher than...
      </ThemedText>
      <StarRating rating={rating} color={tintColor} onChange={handleRating} />
      <ThemedText interactive type="title" style={styles.text}>
        {rating} stars
      </ThemedText>
      <GradientButton
        buttonText="Confirm"
        handlePress={() =>
          router.navigate({
            pathname: "../preferences/cuisineSelection",
            params: { rating, mealId, google_sql_string, tag_map },
          })
        }
        style={styles.button}
      />
      <ThemedButton
        type="secondary"
        text="No Preference"
        style={styles.button}
        onPress={() =>
          router.navigate({
            pathname: "../preferences/cuisineSelection",
            params: { rating: 0, mealId, google_sql_string, tag_map },
          })
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  text: { textAlign: "center", width: "70%", paddingVertical: 20 },
  button: { width: "60%", marginVertical: 5 },
});
