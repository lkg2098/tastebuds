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
  matched,
}: {
  id: number;
  title: string;
  imageSrc: ImageSourcePropType;
  date: Date;
  location: string;
  matched: boolean;
}) {
  const isToday = useMemo(() => {
    return date.toLocaleDateString() == new Date().toLocaleDateString();
  }, [date]);

  const subduedColor = useThemeColor({}, "subduedText");
  return (
    <Link
      href={{ pathname: `../${id}`, params: { location_id: location } }}
      asChild
    >
      <Pressable style={styles.item}>
        {/* <Image source={imageSrc} style={styles.mealImage} /> */}
        <View style={styles.itemContent}>
          <View>
            <ThemedText type="subtitle">
              {title + " "}
              {matched && (
                <Ionicons
                  name="checkmark-circle-sharp"
                  size={12}
                  color={useThemeColor({}, "tint")}
                />
              )}
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
    paddingVertical: 15,
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
