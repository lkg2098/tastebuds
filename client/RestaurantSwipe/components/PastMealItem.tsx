import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { ThemedText } from "./ThemedText";
import axiosAuth from "@/api/auth";

export default function PastMealItem({
  id,
  title,
  // imageSrc,
  date,
  location,
  liked,
  members,
  chosen_restaurant,
}: {
  id: number;
  title: string;
  // imageSrc: ImageSourcePropType;
  date: Date;
  location?: string;
  liked?: boolean;
  members: Array<string>;
  chosen_restaurant: string;
}) {
  const [isToday, setIsToday] = useState(
    date.toLocaleDateString() == new Date().toLocaleDateString()
  );
  const tintColor = useThemeColor({}, "tint");
  const [isLiked, setIsLiked] = useState(liked || false);

  const likeRestaurant = async () => {
    try {
      let response = await axiosAuth.put(`/meals/${id}`, { liked: !isLiked });
      if (response.status == 200) {
        setIsLiked(!isLiked);
      }
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <Link
      href={{
        pathname: `../match`,
        params: { mealId: id, name: title, restaurantId: chosen_restaurant },
      }}
      asChild
    >
      <Pressable style={styles.item}>
        {/* <Image source={imageSrc} style={styles.mealImage} /> */}
        <View style={styles.itemContent}>
          <View style={{ width: "70%" }}>
            <ThemedText type="subtitle">{title}</ThemedText>
            <ThemedText
              numberOfLines={1}
              subdued
              style={{ fontSize: 14, lineHeight: 16, paddingVertical: 5 }}
            >
              {date.toLocaleDateString("en-US", {
                month: "numeric",
                day: "numeric",
                year: "2-digit",
              })}
              {members && " • " + members.join(", ")}
            </ThemedText>
          </View>

          <View style={styles.itemRight}>
            <Pressable onPress={() => likeRestaurant()}>
              <Ionicons
                name="heart"
                color={isLiked === true ? tintColor : "#b0b0b0"}
                size={25}
              />
            </Pressable>
            <Ionicons
              name="chevron-forward"
              color={useThemeColor({}, "subduedText")}
            />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 15,
  },
  itemContent: {
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  mealImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
});
