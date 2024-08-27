import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useLocalSearchParams } from "expo-router";
import { Restaurant } from "@/types/Restaurant";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ThemedButton } from "@/components/ThemedButton";
import { Ionicons } from "@expo/vector-icons";
import RestaurantCard from "@/components/MealComponents/RestaurantCard";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MatchAnim() {
  const { mealId, data } = useLocalSearchParams<{
    mealId: string;
    data: string;
  }>();
  const router = useRouter();
  const color = useThemeColor({}, "text");
  const [restaurant, setRestaurant] = useState<Restaurant>(JSON.parse(data));
  // const [restaurant, setRestaurant] = useState<Restaurant>({
  //   name: "Bronxville Diner",
  //   id: "ChIJ3z_bIK6SwokRz3XMu8xCPI8",
  //   types: ["breakfast restaurant"],
  //   phone: "+1 914-779-1777",
  //   address: "112 Kraft Ave, Bronxville, NY 10708, USA",
  //   rating: 4.3,
  //   //googleMapsUri: "https://maps.google.com/?cid=10321197893117834703",
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
  //   //userRatingCount: 989,
  //   // takeout: true,
  //   // delivery: true,
  //   // dineIn: true,
  //   // curbsidePickup: true,
  //   // servesBreakfast: true,
  //   // servesLunch: true,
  //   // servesDinner: true,
  //   // servesBeer: true,
  //   // servesWine: true,
  //   // servesBrunch: true,
  //   // servesVegetarianFood: true,

  //   // shortFormattedAddress: "112 Kraft Ave, Bronxville",

  //   photos: [
  //     "https://lh3.googleusercontent.com/places/ANXAkqFcbxUM9O9TXGDYFtoX_2u4pzR2YLi54T0ZFwZ6-o7R5M2mDHrUOknc7QDUqCFmN36TJ6_WuJvwasPJpIYpe3XqahnUh0v9kaQ=s4800-h300",
  //     "https://lh3.googleusercontent.com/places/ANXAkqG467sR3wokEPV5OlGhaOM8tPnLcsWk_Ejd3oT_k2doEyN_h2j6B-8r1vlVYN1Ux0gdNmaq28NgRcP91fX_gw53K78MlvmDapk=s4800-h1600",
  //     "https://lh3.googleusercontent.com/places/ANXAkqEZzOVvu4RxW-33lukYsA9So774ktUDH6AjXQ-rqXiyeMR1yV-c5vUjA23RwPUwqCpt1yi5PZoOcaefB6cF0HcbAZFAokBNbrs=s4800-h682",
  //   ],
  //   // outdoorSeating: true,
  //   // liveMusic: false,
  //   // menuForChildren: true,
  //   // servesCocktails: true,
  //   // servesDessert: true,
  //   // servesCoffee: true,
  //   // goodForChildren: true,
  //   // allowsDogs: false,
  //   // restroom: true,
  //   // goodForGroups: true,
  //   // goodForWatchingSports: false,
  //   // paymentOptions: {
  //   //   acceptsCreditCards: true,
  //   //   acceptsDebitCards: true,
  //   //   acceptsCashOnly: false,
  //   //   acceptsNfc: true,
  //   // },
  //   // parkingOptions: {
  //   //   paidParkingLot: true,
  //   //   paidStreetParking: true,
  //   //   valetParking: false,
  //   // },
  //   accessibilityOptions: {
  //     wheelchairAccessibleParking: true,
  //     wheelchairAccessibleEntrance: true,
  //     wheelchairAccessibleRestroom: true,
  //     wheelchairAccessibleSeating: true,
  //   },
  // });
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
      <ThemedText
        type="title"
        style={{
          color: "white",
          fontFamily: "Playwrite",
          fontSize: 40,
          lineHeight: 70,
          paddingTop: 15,
        }}
      >
        Delicious!
      </ThemedText>

      <View style={{ flex: 1, justifyContent: "center" }}>
        <ThemedView style={styles.match}>
          <RestaurantCard data={restaurant} />
        </ThemedView>
      </View>
      {/* <ThemedButton text="Add to Calendar" type="primary" onPress={() => {}} /> */}
      <Pressable
        onPress={() => router.navigate(`./${mealId}`)}
        style={styles.button}
      >
        <ThemedText type="defaultBold">I Changed My Mind</ThemedText>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  match: {
    height: "100%",
    width: "90%",
    padding: 20,
    borderRadius: 10,
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
