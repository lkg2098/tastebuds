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

export default function MealListItem({
  id,
  title,
  imageSrc,
  date,
  location,
  coords,
  radius,
  budget,
  chosen_restaurant,
  members,
  round,
}: {
  id: number;
  title: string;
  imageSrc?: ImageSourcePropType;
  date: Date;
  location: string;
  coords?: Array<number>;
  radius: number;
  budget: Array<number>;
  chosen_restaurant?: string;
  members: Array<string>;
  round: number;
}) {
  const isToday = useMemo(() => {
    return date.toLocaleDateString() == new Date().toLocaleDateString();
  }, [date]);

  const subduedColor = useThemeColor({}, "subduedText");
  const goodColor = useThemeColor({}, "positive");
  return (
    <Link
      href={
        chosen_restaurant
          ? {
              pathname: "/match",
              params: {
                mealId: id,
                name: title,
                restaurantId: chosen_restaurant,
              },
            }
          : {
              pathname: `../${id}`,
              params: {
                location_id: location,
                location_coords: JSON.stringify(coords),
                radius,
                date: date.toISOString(),
                budget: JSON.stringify(budget),
                name: title,
                round: round,
              },
            }
      }
      asChild
    >
      <Pressable style={styles.item}>
        {/* <Image source={imageSrc} style={styles.mealImage} /> */}
        <View style={styles.itemContent}>
          <View style={{ width: "70%" }}>
            <ThemedText type="subtitle">
              {title + " "}
              {chosen_restaurant && (
                <Ionicons
                  name="checkmark-circle-sharp"
                  size={15}
                  color={goodColor}
                />
              )}
            </ThemedText>
            <ThemedText type="secondary" subdued numberOfLines={1}>
              {members.join(", ")}
            </ThemedText>
            {/* <View style={styles.location}>
              <Ionicons
                name="location"
                color={subduedColor}
                style={{ marginTop: 2 }}
              />
              <ThemedText subdued style={{ fontSize: 14, lineHeight: 16 }}>
                {location || "Brooklyn, NY"}
              </ThemedText>
            </View> */}
          </View>

          <View style={styles.itemRight}>
            <ThemedText subdued>
              {isToday
                ? date.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "numeric",
                  })
                : date.toLocaleDateString("en-US", {
                    month: "numeric",
                    day: "numeric",
                    year: "2-digit",
                  })}
            </ThemedText>
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
    paddingVertical: 12,
    paddingHorizontal: 10,
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
    gap: 3,
  },
  location: {
    flexDirection: "row",
    gap: 5,
  },
  mealImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
});
