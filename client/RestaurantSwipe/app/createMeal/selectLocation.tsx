import { Text, View, Button, StyleSheet, Pressable } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import GetLocation from "@/components/getLocation";
import MapView from "react-native-maps";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import {
  GooglePlacesAutocomplete,
  GooglePlacesAutocompleteRef,
} from "react-native-google-places-autocomplete";
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useContext, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import GradientButton from "@/components/GradientButton";
import { MealDataContext } from "@/components/MealDataContext";
import HeaderBar from "@/components/HeaderBar";

type Choice = {
  address: string;
  place_id: string;
  location_coords: Array<number>;
};

export default function SelectLocation() {
  const router = useRouter();
  const backgroundColor = useThemeColor({}, "background");
  const color = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const { mealId, current_address } = useLocalSearchParams();
  const mealContext = useContext(MealDataContext);
  let googleInput = useRef<GooglePlacesAutocompleteRef>(null).current;
  // const [query, setQuery] = useState("Current Location");

  const [choice, setChoice] = useState<Choice>({
    address: current_address?.toString() || "",
    place_id: "",
    location_coords: [],
  });

  useEffect(() => {
    if (googleInput && current_address) {
      googleInput.setAddressText(current_address.toString());
    }
  }, [googleInput, current_address]);

  const handleChoice = (value: Choice) => {
    // {
    //   address: address,
    //   place_id: data.place_id,
    //   location_coords: [
    //     details?.geometry.location.lat || 100000,
    //     details?.geometry.location.lng || 100000,
    //   ],
    // };
    if (mealContext) {
      mealContext.setMealData({
        ...mealContext.mealData,
        address: value.address,
        place_id: value.place_id,
        location_coords: [],
      });
    }
    setChoice(value);
  };

  const renderResult = (data: any, index: number) => {
    console.log(data);
    if (data.structured_formatting) {
      return (
        <View
          style={{
            flexDirection: "row",
            gap: 10,
          }}
        >
          <Ionicons
            name="location"
            color={color}
            size={16}
            style={{ marginTop: 5 }}
          />
          <View>
            <ThemedText type="defaultSemiBold">
              {data.structured_formatting.main_text}
            </ThemedText>
            <ThemedText subdued>
              {data.structured_formatting.secondary_text}
            </ThemedText>
          </View>
        </View>
      );
    } else {
      return (
        <View
          style={{
            flexDirection: "row",
            gap: 10,
          }}
        >
          <Ionicons
            name="location"
            color={color}
            size={16}
            style={{ marginTop: 5 }}
          />
          <ThemedText>
            {data.description || data.formatted_address || data.name}
          </ThemedText>
        </View>
      );
    }
  };
  return (
    <ThemedView
      style={{
        flex: 1,
      }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <HeaderBar
          headerLeft={
            <Pressable onPress={() => router.dismiss(1)}>
              <Ionicons name="chevron-back" color={color} size={18} />
            </Pressable>
          }
          headerCenter={
            <ThemedText type="defaultSemiBold">Choose a Location</ThemedText>
          }
        />
        <GooglePlacesAutocomplete
          ref={(ref) => {
            googleInput = ref;
          }}
          placeholder="Current Location"
          onPress={(data, details = null) => {
            // 'details' is provided when fetchDetails = true
            console.log(data, details);
            let address = "";
            if (
              details?.name &&
              details?.formatted_address.includes(details.name)
            ) {
              address = details.formatted_address;
            } else if (details?.name && details?.formatted_address) {
              address = `${details.name}, ${details.formatted_address}`;
            }
            handleChoice({
              address: address,
              place_id: data.place_id,
              location_coords: [
                details?.geometry.location.lat || 100000,
                details?.geometry.location.lng || 100000,
              ],
            });
          }}
          minLength={4}
          fetchDetails={true}
          query={{
            key: Constants.expoConfig?.ios?.config?.googleMapsApiKey,
            language: "en",
          }}
          GooglePlacesDetailsQuery={{
            fields: "geometry,formatted_address,name",
          }}
          renderLeftButton={() => (
            <Ionicons
              name="disc-outline"
              color={tintColor}
              size={14}
              style={{
                margin: "auto",
              }}
            />
          )}
          renderRow={renderResult}
          styles={{
            container: { padding: 10 },
            textInput: {
              color,
              backgroundColor: "transparent",
              height: "100%",
            },
            textInputContainer: {
              backgroundColor: "transparent",
              paddingHorizontal: 15,
              paddingVertical: 10,
              borderColor: color,
              borderWidth: 1,
              borderRadius: 10,
            },
            description: { color, fontSize: 14 },
            predefinedPlacesDescription: {
              color,
            },
            row: {
              backgroundColor: "transparent",
              color: "white",
              marginVertical: 5,
            },
            poweredContainer: { backgroundColor: "transparent" },
          }}
        />

        {/* <GetLocation /> */}
        <GradientButton
          buttonText="Confirm"
          style={{ position: "absolute", bottom: "10%" }}
          handlePress={() => {
            router.navigate({
              pathname: "../createMeal",
            });
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  map: {
    width: "80%",
    height: "10%",
  },
  paragraph: {
    fontSize: 18,
    textAlign: "center",
  },
});
