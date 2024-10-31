import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";
import StarRating from "react-native-star-rating-widget";
import { ThemedText } from "../ThemedText";
import * as WebBrowser from "expo-web-browser";
import { Link, useRouter } from "expo-router";
import { Badge } from "../Badge";
import PhotoCarousel from "../PhotoCarousel";
import { Photo, Restaurant } from "@/types/Restaurant";
import HoursCollapsible from "./HoursCollapsible";
import { ThemedButton } from "../ThemedButton";

export default function MatchCard({
  data,
  handleNewPhotos,
}: {
  data?: Restaurant;
  handleNewPhotos: (photos: Array<Photo>) => void;
}) {
  const router = useRouter();

  const subduedColor = useThemeColor({}, "subduedText");
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "background");

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

  useEffect(() => {
    // console.log(data?.name, data?.photos);
  }, [data?.photos]);

  return (
    <View style={{ height: "100%" }}>
      <PhotoCarousel
        id={data?.place_id}
        photos={data?.photos || []}
        handleNewPhotoData={handleNewPhotos}
      />
      <ScrollView>
        <View style={styles.restaurantDescription}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <ThemedText type="subtitle" style={{ width: "80%" }}>
              {data?.name || ""}
            </ThemedText>
            <ThemedText>{priceLevel}</ThemedText>
          </View>
          <Link asChild href={data?.googleMapsUri || ""}>
            <Pressable>
              <ThemedText
                type="secondary"
                interactive
                style={{ paddingVertical: 5 }}
              >
                <Ionicons name="location" size={14} /> {data?.address}
              </ThemedText>
            </Pressable>
          </Link>
          {data?.website && (
            <Pressable
              style={styles.iconPressable}
              onPress={() => {
                router.push({
                  pathname: "./webView",
                  params: {
                    title: data?.name || "Website",
                    url: data?.website,
                  },
                });
              }}
            >
              <Ionicons name="globe" size={20} color={tintColor} />
              <ThemedText type="defaultBold" interactive>
                Visit Website
              </ThemedText>
            </Pressable>
          )}
          {data?.hours && (
            <HoursCollapsible hours={data?.hours || []} day={0} />
          )}
          {data?.googleMapsUri && (
            <ThemedButton
              type="primary"
              onPress={() => {}}
              text="Get Directions"
            />
          )}
          {data?.phone && (
            <ThemedButton
              onPress={() => {}}
              type="secondary"
              text={data?.phone}
            />
          )}
          <View style={{ flexDirection: "row" }}>
            <Badge
              type="plain"
              text="Dine-in"
              size="small"
              icon={<Ionicons name="restaurant" size={14} />}
            />
            <Badge
              type="plain"
              text="Takeout"
              size="small"
              icon={<Ionicons name="bag" size={14} />}
            />
            <Badge
              type="plain"
              text="Delivery"
              size="small"
              icon={<Ionicons name="car" size={14} />}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              paddingVertical: 5,
              alignItems: "flex-end",
            }}
          >
            <StarRating
              rating={data?.rating || 5}
              onChange={() => {}}
              enableSwiping={false}
              color={subduedColor}
              starSize={25}
              style={{ paddingVertical: 0 }}
              starStyle={{ width: 15 }}
            />
            <ThemedText subdued type="secondary" style={{ lineHeight: 23 }}>
              {data?.rating || 5} ({data?.userRatingCount})
            </ThemedText>
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {data?.types?.map((type: string) => (
            <Badge
              type="solid"
              key={type}
              text={type}
              textColor={backgroundColor}
              size="small"
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  iconPressable: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    paddingVertical: 5,
  },
  restaurantDescription: {
    paddingHorizontal: 10,
  },
});
