import {
  Text,
  View,
  Button,
  Modal,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import axiosAuth from "@/api/auth";
import { useContext, useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import RatingSettingsItem from "@/components/settingsComponents/RatingSettingsItem";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import MealSettings from "@/components/MealSettings";
import { DietaryRestriction, Meal } from "@/types/Meal";
import GradientButton from "@/components/GradientButton";
import { Ionicons } from "@expo/vector-icons";
import Loading from "@/components/Loading";
import { SafeAreaView } from "react-native-safe-area-context";
import { MemberSettings } from "@/types/MemberSettings";
import { MealSettingsContext } from "@/components/MealSettingsContext";

export default function CreateMeal() {
  const router = useRouter();
  const {
    mealId,
    current_address,
    place_id,
    tagMap,
    badPreferences,
    google_sql_string,
  } = useLocalSearchParams<{
    mealId: string;
    current_address: string;
    place_id: string;
    tagMap: string[];
    google_sql_string: string;
    badPreferences: string[];
  }>();

  const color = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const [loading, setLoading] = useState(true);
  const context = useContext(MealSettingsContext);
  const [location, setLocation] = useState("");
  const [role, setRole] = useState<"admin" | "guest">("admin");
  const [geocodingRan, setGeocodingRan] = useState(false);
  const [oldMealData, setOldMealData] = useState<Meal>({
    id: "",
    name: "New Meal",
    date: undefined,
    budget: [],
    distance: 5,
    rating: 3,
    address: current_address?.toString() || "",
    place_id: place_id?.toString() || "",
    location_coords: [],
    diets: [] as DietaryRestriction[],
    badPreferences: badPreferences || [],
  });

  useEffect(() => {
    console.log("CONTEXT");
    console.log(context);
    context?.setTest({
      id: "",
      name: "New Meal",
      date: undefined,
      budget: [],
      distance: 5,
      rating: 3,
      address: "AAAAAAA",
      place_id: place_id?.toString() || "",
      location_coords: [],
      diets: [] as DietaryRestriction[],
      badPreferences: badPreferences || [],
    });
  }, []);

  useEffect(() => {
    console.log("CONTEXT TEST");
    console.log(context?.test);
  }, [context?.test]);
  const [mealData, setMealData] = useState<Meal>({
    id: "",
    name: "New Meal",
    date: undefined,
    budget: [],
    distance: 5,
    rating: 3,
    address: current_address?.toString() || "",
    place_id: place_id?.toString() || "",
    location_coords: [],
    diets: [] as DietaryRestriction[],
    badPreferences: badPreferences || [],
  });

  const isDirty = JSON.stringify(oldMealData) != JSON.stringify(mealData);

  useEffect(() => {
    if (
      (current_address && current_address != mealData.address) ||
      (place_id && place_id != mealData.place_id)
    ) {
      console.log("YOU ARE HERE");
      setMealData((prev) => {
        let coordinates = prev.location_coords;
        let address = prev.address;
        let id = prev.place_id;

        if (current_address) {
          address = current_address.toString();
        }
        if (place_id) {
          console.log(place_id);
          id = place_id.toString();
        }
        return {
          ...prev,
          address: address,
          place_id: id,
          location_coords: coordinates,
        };
      });
    }
  }, [current_address, place_id]);

  useEffect(() => {
    if (!mealData.place_id && mealData.date && !geocodingRan) {
      const getCurrentLocation = async () => {
        try {
          let location = await Location.getCurrentPositionAsync({});
          const coords = [location.coords.latitude, location.coords.longitude];
          if (!geocodingRan) {
            getAddress(coords).catch((err) => {
              console.log(err);
            });
          }
        } catch (err) {
          console.log(err);
          return false;
        }
      };

      const getAddress = async (coords: Array<number>) => {
        try {
          console.log("GEOCODING FETCH");
          let response = await axiosAuth.get("/meals/test", {
            params: { coords },
          });
          if (response.data) {
            console.log(response.data);
            setGeocodingRan(true);
            setMealData({
              ...mealData,
              address: response.data.address,
              place_id: response.data.placeId,
              location_coords: coords,
            });
            setLoading(false);
          } else {
            setGeocodingRan(true);
            return false;
          }
          // setMealData({
          //   ...mealData,
          //   address: "200 Geary St, San Francisco, CA 94102, USA",
          //   place_id: "ChIJpc9FisyBhYARPN5xBWS7KQc",
          //   location_coords: coords,
          // });
        } catch (err) {
          console.log(err);
          return false;
        }
      };
      let coords = [];
      if (mealData.location_coords.length && !geocodingRan) {
        coords = mealData.location_coords;
        getAddress(coords).catch((err) => {
          console.log(err);
        });
      } else {
        console.log("here");
        getCurrentLocation().catch((err) => {
          console.log(err);
        });
      }
    }
  }, [mealData.place_id, mealData.location_coords]);

  useEffect(() => {
    if (mealId) {
      getSettings()
        .then((value) => {
          let meal = value.meal;
          let memberSettings = value.settings;
          console.log("SET MEAL");
          console.log(value.meal);
          setRole(value.userRole);
          setOldMealData({
            ...oldMealData,
            id: meal.meal_id,
            name: meal.meal_name,
            date: new Date(meal.scheduled_at),
            budget: meal.budget,
            distance: meal.radius,
            place_id: meal.location_id || oldMealData.place_id,
            diets: ["Dairy Free", "Gluten Free"],
            location_coords: meal.location_coords,
            rating: memberSettings.rating,
            badPreferences: memberSettings.preferences,
          });
          setMealData({
            ...mealData,
            id: meal.meal_id,
            name: meal.meal_name,
            date: new Date(meal.scheduled_at),
            budget: meal.budget,
            distance: meal.radius,
            place_id: meal.location_id || mealData.place_id,
            diets: ["Dairy Free", "Gluten Free"],
            location_coords: meal.location_coords,
            rating: memberSettings.rating,
            badPreferences: memberSettings.preferences,
          });
          setLoading(false);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [mealId]);

  // edit existing meal
  const getSettings = async () => {
    try {
      let response = await axiosAuth.get(`/meals/${mealId}`);
      let memberPreferences = await axiosAuth.get(
        `/meals/${mealId}/preferences`,
        { params: { setting: "all" } }
      );
      if (response.data && memberPreferences.data) {
        console.log("GET SETTINGS");
        console.log({ ...response.data, ...memberPreferences.data });
        return { ...response.data, ...memberPreferences.data };
      } else {
        return false;
      }
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const handleSubmit = async () => {
    // console.log(JSON.stringify(mealData));
    try {
      // console.log(mealData);
      const mealBody = {
        meal_name: mealData.name,
        meal_photo: "",
        scheduled_at: mealData.date?.toISOString() || new Date(),
        location_id: mealData.place_id,
        location_coords: mealData.location_coords,
        radius: mealData.distance,
        budget: mealData.budget,
      };
      let response;
      let scores;
      if (mealId) {
        response = await axiosAuth.put(`/meals/${mealId}`, mealBody);
      } else {
        response = await axiosAuth.post("/meals/new", mealBody);
      }
      let oldPreferences = new Set(oldMealData.badPreferences);
      for (let item of mealData.badPreferences) {
        oldPreferences.add(item);
      }

      if (
        oldMealData.rating != mealData.rating ||
        oldPreferences.size != oldMealData.badPreferences.length
      ) {
        scores = await axiosAuth.put(`/meals/${mealId}/preferences`, {
          min_rating: mealData.rating,
          preferences: mealData.badPreferences,
          google_data_string: google_sql_string,
        });
      }
      if (response?.status == 200) {
        if (!scores || scores.status == 200) {
          if (mealId) {
            router.navigate({
              pathname: `../${mealId}`,
              params: {
                mealId: mealId,
                preferences: scores ? mealData.badPreferences : null,
                min_rating: scores ? mealData.rating : null,
              },
            });
          } else {
            router.push({
              pathname: "../createMeal/addUsers",
              params: { mealId: response.data.meal_id },
            });
          }
        }
      } else {
        console.log(response);
      }
    } catch (err) {
      console.log(err);
    }
  };
  useEffect(() => {
    console.log("USE EFFECT");
    console.log(mealData);
  }, [mealData]);

  const handleMealData = (data: Meal) => {
    setMealData(data);
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }
    })();
  }, []);
  if (loading) {
    return <Loading />;
  } else {
    return (
      <SafeAreaView style={{ backgroundColor }}>
        <ThemedView style={{ height: "100%" }}>
          <ThemedView style={styles.headerBar}>
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                console.log("pressed");
                router.back();
              }}
            >
              <Ionicons name="close" color={color} size={25} />
            </Pressable>
          </ThemedView>
          <ThemedText>{mealId}</ThemedText>
          <MealSettings
            data={mealData}
            userRole={role}
            tagMap={tagMap}
            handleMealData={handleMealData}
          />
          {(!mealId || (mealId && isDirty)) && (
            <GradientButton
              handlePress={handleSubmit}
              buttonText={mealId ? "Save Changes" : "Create Meal"}
              style={{
                position: "absolute",
                width: 350,
                top: "92%",
              }}
            />
          )}
        </ThemedView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  headerBar: {
    paddingHorizontal: 20,
  },
  closeButton: {
    alignSelf: "flex-end",
  },
});
