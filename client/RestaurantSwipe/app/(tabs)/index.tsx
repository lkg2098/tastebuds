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
  useColorScheme,
} from "react-native";

import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import axiosAuth from "@/api/auth";
import MealListItem from "@/components/MealListItem";

type Meal = {
  id: number;
  title: string;
  image: ImageSourcePropType;
  date: Date;
  location: string;
  matched: boolean;
};

export default function UpcomingMeals() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [meals, setMeals] = useState<Array<Meal>>([]);
  const getMeals = async () => {
    try {
      const response = await axiosAuth.get("/meals/", {
        params: { time: "future" },
      });
      if (response.status == 200) {
        setMeals(
          response.data.meals.map(
            (item: {
              meal_id: number;
              meal_name: string;
              scheduled_at: Date;
              location_id: string;
              chosen_restaurant: string | null;
            }) => ({
              id: item.meal_id,
              title: item.meal_name,
              image: require("../../assets/images/react-logo.png"),
              date: new Date(item.scheduled_at),
              location: item.location_id,
              matched: item.chosen_restaurant,
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
          <MealListItem
            id={item.id}
            title={item.title}
            imageSrc={item.image}
            date={item.date}
            location={item.location}
            matched={item.matched}
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
              source={
                colorScheme == "dark"
                  ? require("../../assets/images/emptyStateDark.png")
                  : require("../../assets/images/emptyStateLight.png")
              }
              style={{ width: 200, height: 200 }}
            />
            {/* <a href="https://www.flaticon.com/free-icons/wine" title="wine icons">Wine icons created by Darius Dan - Flaticon</a> */}
            <ThemedText
              type="subtitle"
              style={{ width: "80%", textAlign: "center" }}
            >
              Start a new meal
            </ThemedText>
            <ThemedText
              type="subtitle"
              style={{ width: "85%", textAlign: "center" }}
            >
              and satisfy all your
              <ThemedText
                style={{ fontFamily: "Playwrite" }}
                interactive
                type="subtitle"
              >
                {" "}
                Tastebuds!
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
