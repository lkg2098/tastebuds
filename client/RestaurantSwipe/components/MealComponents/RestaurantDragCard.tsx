import { Photo, Restaurant } from "@/types/Restaurant";
import React, { useEffect, useMemo, useState } from "react";
import { ThemedView } from "../ThemedView";
import axiosAuth from "@/api/auth";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "../ThemedText";
import StarRating from "react-native-star-rating-widget";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "../Badge";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function RestaurantDragCard({
  data,
  handleNewPhotoData,
}: {
  data: Restaurant;
  handleNewPhotoData: (photos: Array<Photo>) => void;
}) {
  const [closed, setClosed] = useState(true);
  const backgroundColor = useThemeColor({}, "background");

  useEffect(() => {
    if (data?.photos?.length && !data?.photos[0].uri) {
      console.log("running fetch photo");
      const fetchData = async (photoList: Array<Photo>) => {
        const photosCopy = [...photoList];
        const url = await handleGetUrl(0);
        console.log(url);
        if (url?.photoUri) {
          photosCopy[0].uri = url.photoUri;
          handleNewPhotoData(photosCopy);
        } else {
          console.log("no photo uri present");
        }
      };
      fetchData(data.photos);
    }
  }, [data]);

  const handleGetUrl = async (i: number) => {
    if (data?.photos?.length) {
      try {
        const response = await axiosAuth.post("/restaurants/photo", {
          photo_name: data?.photos[0].name,
        });
        // console.log(response.data);
        return response.data.photo;
      } catch (err) {
        console.log(err);
      }
    }
  };

  const priceLevel = useMemo(() => {
    if (data?.priceLevel) {
      if (data.priceLevel == "PRICE_LEVEL_INEXPENSIVE") {
        return "$";
      }
      if (data.priceLevel == "PRICE_LEVEL_MODERATE") {
        return "$$";
      }
      if (data.priceLevel == "PRICE_LEVEL_EXPENSIVE") {
        return "$$$";
      }
      if (data.priceLevel == "PRICE_LEVEL_VERY_EXPENSIVE") {
        return "$$$$";
      }
    }
  }, [data?.priceLevel]);

  return (
    <View style={styles.card}>
      <Image
        source={
          data?.photos?.length && data.photos[0].uri
            ? { uri: data.photos[0].uri }
            : require("../../assets/images/splash.png")
        }
        style={styles.thumbnail}
      />
      <View style={styles.textContent}>
        <View>
          <ThemedText style={styles.title} numberOfLines={1}>
            {data.name}
          </ThemedText>
          <ThemedText type="secondary" numberOfLines={1}>
            <Ionicons name="star" size={14} />
            {data.rating} • {priceLevel} •
            <ThemedText interactive type="secondary">
              {" " + data?.types?.join(" • ")}
            </ThemedText>
          </ThemedText>
        </View>
        <Pressable onPress={() => {}}>
          <ThemedText interactive type="secondary">
            Details
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 8 },
  title: { fontWeight: 500, lineHeight: 20 },
  thumbnail: { width: 65, height: 65 },
  textContent: {
    width: "70%",
    justifyContent: "space-between",
  },
});
