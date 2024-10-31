import axiosAuth from "@/api/auth";
import CuisineSelector from "@/components/CuisineSelector";
import GradientButton from "@/components/GradientButton";
import HeaderBar from "@/components/HeaderBar";
import Loading from "@/components/Loading";
import RatingSettingsItem from "@/components/settingsComponents/RatingSettingsItem";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import StarRating from "react-native-star-rating-widget";

export default function Preferences() {
  const { mealId, google_data_string, tag_map } = useLocalSearchParams<{
    mealId: string;
    google_data_string: string;
    tag_map: string;
  }>();
  const router = useRouter();
  const color = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const background = useThemeColor({}, "background");
  const [rating, setRating] = useState(3.5);
  const [loading, setLoading] = useState(true);

  const handleRating = (value: number) => {
    setRating(value);
  };

  useEffect(() => {
    if (tag_map && google_data_string) {
      setLoading(false);
    }
  }, [tag_map, google_data_string]);

  if (loading) {
    return (
      <ThemedView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: background,
        }}
      >
        <Loading>
          <SafeAreaView style={{ flex: 1, alignSelf: "stretch" }}>
            <HeaderBar
              headerLeft={
                <Pressable onPress={() => router.navigate("/(tabs)")}>
                  <Ionicons name="chevron-back" size={16} color={color} />
                </Pressable>
              }
            />
          </SafeAreaView>
        </Loading>
      </ThemedView>
    );
  } else {
    return (
      <ThemedView
        style={{
          flex: 1,
          alignSelf: "stretch",
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
              params: { rating, mealId, google_data_string, tag_map },
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
              params: { rating: 0, mealId, google_data_string, tag_map },
            })
          }
        />
      </ThemedView>
    );
  }
}

const styles = StyleSheet.create({
  text: { textAlign: "center", width: "70%", paddingVertical: 20 },
  button: { width: "60%", marginVertical: 5 },
});
