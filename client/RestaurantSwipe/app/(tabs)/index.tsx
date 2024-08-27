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
import { useCallback, useEffect, useRef, useState } from "react";
import axiosAuth from "@/api/auth";
import MealListItem from "@/components/MealListItem";
import { Meal } from "@/types/Meal";

export default function UpcomingMeals() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [meals, setMeals] = useState<Array<Meal>>();
  const [isRefreshing, setIsRefreshing] = useState(true);
  let timeoutId = useRef<NodeJS.Timeout>().current;

  const getMeals = async () => {
    try {
      const response = await axiosAuth.get("/meals/", {
        params: { time: "future" },
      });
      if (response.status == 200) {
        return response.data.meals;
      }
    } catch (err) {
      console.log(err);
      return;
    }
  };

  const refreshMeals = async () => {
    try {
      setIsRefreshing(true);
      let data = await getMeals();
      let timeout = setTimeout(() => {
        setMeals(
          data.map(
            (item: {
              chosen_restaurant: string | null;
              liked: boolean | null;
              location_coords: Array<number> | null;
              location_id: number | null;
              meal_id: number;
              meal_name: string;
              meal_photo: string;
              budget: Array<number>;
              radius: number;
              scheduled_at: Date;
              members: string;
            }) => ({
              id: item.meal_id,
              meal_name: item.meal_name,
              image: require("../../assets/images/react-logo.png"),
              date: new Date(item.scheduled_at),
              place_id: item.location_id,
              liked: item.liked,
              distance: item.radius,
              budget: item.budget,
              chosen_restaurant: item.chosen_restaurant,
              members: item.members,
            })
          )
        );
      }, 750);
      timeoutId = timeout;
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    console.log(meals);
    if (isRefreshing) {
      setIsRefreshing(false);
    }
  }, [meals]);

  useEffect(() => {
    const timeout = timeoutId;
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      getMeals()
        .then((data) => {
          setMeals(
            data.map(
              (item: {
                chosen_restaurant: string | null;
                liked: boolean | null;
                location_coords: Array<number> | null;
                location_id: number | null;
                meal_id: number;
                meal_name: string;
                meal_photo: string;
                budget: Array<number>;
                radius: number;
                scheduled_at: Date;
                members: string;
              }) => ({
                id: item.meal_id,
                meal_name: item.meal_name,
                image: require("../../assets/images/react-logo.png"),
                date: new Date(item.scheduled_at),
                place_id: item.location_id,
                liked: item.liked,
                distance: item.radius,
                budget: item.budget,
                chosen_restaurant: item.chosen_restaurant,
                members: item.members,
              })
            )
          );
        })
        .catch((err) => console.log(err));
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
        onRefresh={refreshMeals}
        refreshing={isRefreshing}
        renderItem={({ item }: { item: Meal }) => (
          <MealListItem
            id={Number(item.id)}
            title={item.meal_name}
            // imageSrc={item.image}
            date={item.date || new Date()}
            radius={item.distance}
            location={item.place_id}
            budget={item.budget}
            chosen_restaurant={item.chosen_restaurant}
            members={item.members}
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
