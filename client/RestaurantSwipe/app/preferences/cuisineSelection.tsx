import axiosAuth from "@/api/auth";
import CuisineSelector from "@/components/CuisineSelector";
import GradientButton from "@/components/GradientButton";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";

export default function Preferences() {
  const { mealId, google_sql_string, tag_map, rating } = useLocalSearchParams();
  const router = useRouter();
  const background = useThemeColor({}, "background");
  useEffect(() => {
    console.log("GOOGLE DATA");
    console.log(google_sql_string);
  }, [google_sql_string]);

  const handleSubmit = async (preferences: Array<string>) => {
    console.log(preferences);
    try {
      let response = await axiosAuth.post(`/meals/${mealId}/preferences`, {
        preferences,
        min_rating: rating,
        google_data_string: google_sql_string,
      });
      console.log(response);
      if (response.status == 200) {
        router.navigate(`${mealId}`);
      }
    } catch (err) {
      console.log(err);
    }
    // .post("/meals/27/preferences")
    //   .send({
    //     preferences: [
    //       "american_restaurant",
    //       "pizza_restaurant",
    //       "lebanese_restaurant",
    //     ],
    //     google_data_string: `values('ChIJ3z_bIK6SwokRz3XMu8xCPI8', 4.3,'{"breakfast_restaurant"}'),
    // ('ChIJv0CFoxKTwokR4Sfgcmab1EI', 4.6,'{}'),
    // ('ChIJ23paVWmTwokRd0rp8kdKM0w', 4.8,'{}'),
    // ('ChIJK0BTQK6SwokRN5bYvABnbvU', 4,'{"coffee_shop","cafe","breakfast_restaurant"}'),
    // ('ChIJfxSm1EyTwokRYGIgYm3dqls', 4.3,'{"brunch_restaurant"}'),
    // ('ChIJG3TgE66SwokRX0scyzq-V6o', 4.5,'{"american_restaurant"}'),
    // ('ChIJl4RjnqeTwokRgvrQWgt9EmY', 4.4,'{"american_restaurant"}'),
    // ('ChIJ0aowaK6SwokRL-HTR_foN38', 4.5,'{"bar"}'),
    // ('ChIJZReJaq6SwokRbZGfHBROUZU', 4.1,'{"bar","american_restaurant"}'),
    // ('ChIJmV5ONq6SwokR9NUCEVE0DKI', 4.5,'{"italian_restaurant","pizza_restaurant"}')`,
    //   })
  };

  return (
    <ThemedView
      style={{
        flex: 1,
        alignItems: "center",
        backgroundColor: background,
        paddingVertical: "20%",
      }}
    >
      <ThemedText type="title">What don't you want to eat?</ThemedText>
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
