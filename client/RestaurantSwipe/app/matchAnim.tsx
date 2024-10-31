import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useLocalSearchParams } from "expo-router";
import { Photo, Restaurant } from "@/types/Restaurant";
import React, { useState } from "react";
import { Pressable, StyleSheet, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ThemedButton } from "@/components/ThemedButton";
import { Ionicons } from "@expo/vector-icons";
import RestaurantCard from "@/components/MealComponents/RestaurantCard";
import { SafeAreaView } from "react-native-safe-area-context";
import MatchCard from "@/components/MealComponents/MatchCard";
import SwipeCard from "@/components/MealComponents/SwipeCard";

export default function MatchAnim() {
  const { mealId, data } = useLocalSearchParams<{
    mealId: string;
    data: string;
  }>();
  const router = useRouter();
  const color = useThemeColor({}, "text");
  const [restaurant, setRestaurant] = useState<Restaurant>(JSON.parse(data));
  // const [restaurant, setRestaurant] = useState<Restaurant>({
  //   id: "8",
  //   name: "Bronxville Diner",
  //   place_id: "ChIJ3z_bIK6SwokRz3XMu8xCPI8",
  //   types: ["breakfast"],
  //   phone: "+1 914-779-1777",
  //   address: "112 Kraft Ave, Bronxville",
  //   rating: 4.3,
  //   googleMapsUri: "https://maps.google.com/?cid=10321197893117834703",
  //   website: "http://thebronxvillediner.com/",
  //   hours: [
  //     "Monday: 7:00 AM – 9:00 PM",
  //     "Tuesday: 7:00 AM – 9:00 PM",
  //     "Wednesday: 7:00 AM – 9:00 PM",
  //     "Thursday: 7:00 AM – 9:00 PM",
  //     "Friday: 7:00 AM – 9:00 PM",
  //     "Saturday: 7:00 AM – 9:00 PM",
  //     "Sunday: 7:00 AM – 9:00 PM",
  //   ],
  //   priceLevel: "PRICE_LEVEL_MODERATE",
  //   userRatingCount: 989,
  //   takeout: true, //done
  //   delivery: true, // done
  //   dineIn: true, // done
  //   curbsidePickup: true,
  //   servesBreakfast: true,
  //   servesLunch: true,
  //   servesDinner: true,
  //   servesBeer: true,
  //   servesWine: true,
  //   servesBrunch: true,
  //   servesVegetarianFood: true,
  //   photos: [
  //     // "https://lh3.googleusercontent.com/places/ANXAkqFcbxUM9O9TXGDYFtoX_2u4pzR2YLi54T0ZFwZ6-o7R5M2mDHrUOknc7QDUqCFmN36TJ6_WuJvwasPJpIYpe3XqahnUh0v9kaQ=s4800-h300",
  //     // "https://lh3.googleusercontent.com/places/ANXAkqG467sR3wokEPV5OlGhaOM8tPnLcsWk_Ejd3oT_k2doEyN_h2j6B-8r1vlVYN1Ux0gdNmaq28NgRcP91fX_gw53K78MlvmDapk=s4800-h1600",
  //     // "https://lh3.googleusercontent.com/places/ANXAkqEZzOVvu4RxW-33lukYsA9So774ktUDH6AjXQ-rqXiyeMR1yV-c5vUjA23RwPUwqCpt1yi5PZoOcaefB6cF0HcbAZFAokBNbrs=s4800-h682",
  //   ],
  //   outdoorSeating: true,
  //   liveMusic: false,
  //   menuForChildren: true,
  //   servesCocktails: true,
  //   servesDessert: true,
  //   servesCoffee: true,
  //   goodForChildren: true,
  //   allowsDogs: false,
  //   restroom: true,
  //   goodForGroups: true,
  //   goodForWatchingSports: false,
  //   paymentOptions: {
  //     acceptsCreditCards: true,
  //     acceptsDebitCards: true,
  //     acceptsCashOnly: false,
  //     acceptsNfc: true,
  //   },
  //   parkingOptions: {
  //     paidParkingLot: true,
  //     paidStreetParking: true,
  //     valetParking: false,
  //   },
  //   accessibilityOptions: {
  //     wheelchairAccessibleParking: true,
  //     wheelchairAccessibleEntrance: true,
  //     wheelchairAccessibleRestroom: true,
  //     wheelchairAccessibleSeating: true,
  //   },
  // });

  const handlePhotoData = (photos: Array<Photo>) => {
    let restaurantCopy = { ...restaurant };
    restaurantCopy.photos = photos;

    setRestaurant(restaurantCopy);
  };
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.75)",
        alignItems: "center",
      }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.navigate("../(tabs)")}>
          <Ionicons name="chevron-back" color="white" size={20} />
        </Pressable>
      </View>
      {/* <ThemedText
        type="title"
        style={{
          color: "white",
          fontFamily: "Playwrite",
          fontSize: 40,
          lineHeight: 70,
          paddingTop: 5,
        }}
      >
        Delicious!
      </ThemedText> */}
      <ThemedText
        style={{
          color: "white",
          fontFamily: "Playwrite",
          fontSize: 24,
          lineHeight: 40,
          paddingVertical: 10,
        }}
      >
        You've got a match!
      </ThemedText>
      <View style={styles.match}>
        <RestaurantCard data={restaurant} handleNewPhotos={handlePhotoData} />
      </View>
      {/* <ThemedButton text="Add to Calendar" type="primary" onPress={() => {}} /> */}
      <Pressable
        onPress={() => router.navigate(`./${mealId}`)}
        style={styles.button}
      >
        {/* <ThemedText type="defaultBold">I Changed My Mind</ThemedText> */}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  match: {
    flex: 1,
    justifyContent: "center",
    alignSelf: "stretch",
    marginHorizontal: "5%",
  },
  button: {
    padding: 10,
    width: "70%",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    gap: 5,
    justifyContent: "flex-start",
    alignSelf: "stretch",
    alignItems: "center",
    paddingHorizontal: "7%",
  },
});
