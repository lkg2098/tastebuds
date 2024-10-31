import {
  Image,
  StyleSheet,
  Platform,
  View,
  Text,
  Button,
  FlatList,
  ListRenderItem,
  ImageSourcePropType,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import axiosAuth from "@/api/auth";
import MealListItem from "@/components/MealListItem";
import PastMealItem from "@/components/PastMealItem";
import { Meal } from "@/types/Meal";

export default function PastMeals() {
  const router = useRouter();
  const [meals, setMeals] = useState<Array<Meal>>([]);

  const getMeals = async () => {
    try {
      const response = await axiosAuth.get("/meals/", {
        params: { time: "past" },
      });
      if (response.status == 200) {
        console.log(response.data.meals[0]);
        setMeals(
          response.data.meals.map(
            (item: {
              chosen_restaurant: string | null;
              liked: boolean | null;
              location_coords: Array<number> | null;
              location_id: number | null;
              meal_id: number;
              meal_name: string;
              meal_photo: string;
              radius: number;
              scheduled_at: Date;
              members: Array<string>;
            }) => ({
              id: item.meal_id,
              meal_name: item.meal_name,
              image: require("../../assets/images/react-logo.png"),
              date: new Date(item.scheduled_at),
              place_id: item.location_id,
              liked: item.liked,
              members: item.members,
            })
          )
        );
        console.log(response.data);
        return true;
      }
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      getMeals().catch((err) => console.log(err));
    }, [])
  );

  return (
    <ThemedView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <FlatList
        data={meals}
        style={{
          flex: 1,
          alignSelf: "stretch",
          paddingHorizontal: 15,
          paddingTop: 10,
        }}
        renderItem={({ item }: { item: Meal }) => (
          <PastMealItem
            key={item.id}
            id={Number(item.id)}
            title={item.meal_name}
            // imageSrc={item.image || }
            date={item.date || new Date()}
            liked={item.liked}
            members={item.members}
            chosen_restaurant={item.chosen_restaurant || ""}
          />
        )}
        ListEmptyComponent={
          <View
            style={{
              alignItems: "center",
              flex: 1,
              paddingVertical: 120,
            }}
          >
            <ThemedText type="subtitle">No meals yet...</ThemedText>
            <Image
              source={require("../../assets/images/wine-and-cheese.png")}
              style={{ width: 200, height: 200 }}
            />
            <ThemedText
              type="subtitle"
              style={{ width: "80%", textAlign: "center" }}
            >
              Start a new meal
            </ThemedText>
            <ThemedText
              type="subtitle"
              style={{ width: "80%", textAlign: "center" }}
            >
              and discover what you{" "}
              <ThemedText interactive type="subtitle">
                Crave.
              </ThemedText>
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
