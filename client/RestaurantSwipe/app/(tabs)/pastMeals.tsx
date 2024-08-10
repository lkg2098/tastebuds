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

type Meal = {
  id: number;
  title: string;
  image: ImageSourcePropType;
  date: Date;
  location: string;
  matched: boolean;
};

export default function PastMeals() {
  const router = useRouter();
  const [meals, setMeals] = useState([
    {
      id: 2,
      title: "Date Night",
      image: require("../../assets/images/icon.png"),
      date: new Date(),
      location: "Brooklyn, NY",
      matched: true,
    },
    {
      id: 1,
      title: "Girls' Night Out",
      image: require("../../assets/images/react-logo.png"),
      date: new Date("2024-06-15T09:00:00"),
      location: "Brooklyn, NY",
      matched: false,
    },
  ]);
  const getMeals = async () => {
    try {
      const response = await axiosAuth.get("/meals/", {
        params: { time: "past" },
      });
      // setmeals(response.data);
      console.log(response.data);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      getMeals()
        .then((value) => {
          if (!value) {
            console.log(value);
          }
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
        renderItem={({ item }: { item: Meal }) => (
          <PastMealItem
            id={item.id}
            title={item.title}
            imageSrc={item.image}
            date={item.date}
            location={item.location}
            liked={item.matched}
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
