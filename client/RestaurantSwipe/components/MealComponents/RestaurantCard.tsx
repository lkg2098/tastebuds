import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
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
import { ThemedView } from "../ThemedView";

export default function RestaurantCard({
  data,
  handleNewPhotos,
}: {
  data?: Restaurant;
  handleNewPhotos: (photos: Array<Photo>) => void;
}) {
  const router = useRouter();

  const textColor = useThemeColor({}, "text");
  const subduedColor = useThemeColor({}, "subduedText");
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "background");

  let scrollViewRef = useRef<ScrollView>(null).current;
  const flip = useRef(new Animated.Value(0)).current;

  const flipDegree = flip.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
    extrapolate: "clamp",
  });
  const backFlipDegree = flip.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
    extrapolate: "clamp",
  });

  const [flipped, setFlipped] = useState(false);

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

  useEffect(() => {
    scrollViewRef?.scrollTo({ x: 0, y: 0, animated: false });
  }, [data?.id]);

  const handleFlip = (front: boolean) => {
    if (front) {
      Animated.timing(flip, {
        duration: 500,
        toValue: 180,
        useNativeDriver: true,
      }).start(() => {
        setFlipped(true);
      });
    } else {
      Animated.timing(flip, {
        duration: 500,
        toValue: 0,
        useNativeDriver: true,
      }).start(() => {
        setFlipped(false);
      });
    }
  };

  const cardFront = (
    <View style={{ height: "100%" }}>
      <PhotoCarousel
        id={data?.place_id}
        photos={data?.photos || []}
        handleNewPhotoData={handleNewPhotos}
      />
      <View style={styles.restaurantDescription}>
        <ScrollView
          ref={(ref) => {
            scrollViewRef = ref;
          }}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
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
          <ThemedText type="secondary" style={{ paddingVertical: 5 }}>
            <Ionicons name="location" size={14} /> {data?.address}
          </ThemedText>
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
              {data?.rating || 5}{" "}
              {data?.userRatingCount && `(${data?.userRatingCount})`}
            </ThemedText>
          </View>
          {/* <Pressable
            style={styles.cardDetails}
            onPress={() => handleFlip(true)}
          >
            <ThemedText type="secondary" interactive>
              See Reviews
            </ThemedText>
          </Pressable> */}
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
          <View style={{ flexDirection: "row" }}>
            <Badge
              type="plain"
              text="Dine-in"
              size="small"
              icon={<Ionicons name="restaurant" size={14} color={textColor} />}
            />
            <Badge
              type="plain"
              text="Takeout"
              size="small"
              icon={<Ionicons name="bag" size={14} color={textColor} />}
            />
            <Badge
              type="plain"
              text="Delivery"
              size="small"
              icon={<Ionicons name="car" size={14} color={textColor} />}
            />
          </View>
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
                {"Menu"}
              </ThemedText>
            </Pressable>
          )}
          {data?.hours && (
            <HoursCollapsible hours={data?.hours || []} day={0} />
          )}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: backgroundColor,
            backfaceVisibility: "hidden",
            transform: [{ rotateY: flipDegree }],
            zIndex: flipped ? 0 : 1,
          },
        ]}
      >
        {cardFront}
      </Animated.View>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: backgroundColor,
            backfaceVisibility: "hidden",
            transform: [{ rotateY: backFlipDegree }],
          },
        ]}
      >
        <ThemedText>Backface</ThemedText>
        <ThemedButton
          type="primary"
          text="Test Flip"
          onPress={() => {
            handleFlip(false);
          }}
          style={{ zIndex: 2 }}
        />
      </Animated.View>
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
    flex: 1,
    paddingHorizontal: 10,
  },
  card: {
    position: "absolute",
    overflow: "hidden",
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  cardDetails: {
    paddingHorizontal: 10,
  },
});
