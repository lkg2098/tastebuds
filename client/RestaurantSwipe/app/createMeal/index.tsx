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
  Platform,
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
import { GoogleDataContext } from "@/components/GoogleDataContext";
import { MealDataContext } from "@/components/MealDataContext";
import Oops from "@/components/Oops";
import HeaderBar from "@/components/HeaderBar";

export default function CreateMeal() {
  const router = useRouter();
  const {
    mealId,
    current_address,
    place_id,
    tagMap,
    badPreferences,
    google_sql_string,
    memberIds,
    chosen_restaurant,
  } = useLocalSearchParams<{
    mealId: string;
    current_address: string;
    place_id: string;
    tagMap: string;
    google_sql_string: string;
    badPreferences: string;
    memberIds: string;
    chosen_restaurant: string;
  }>();
  const isAndroid = Platform.OS == "android";
  const color = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const [loading, setLoading] = useState(true);
  const googleContext = useContext(GoogleDataContext);
  const mealContext = useContext(MealDataContext);

  const [role, setRole] = useState<"admin" | "guest">("admin");
  const [geocodingRan, setGeocodingRan] = useState(false);
  const [membersChange, setMembersChange] = useState(false);
  const [oldMealData, setOldMealData] = useState<Meal>({
    id: "",
    meal_name: "New Meal",
    date: new Date(),
    budget: [0, 4],
    distance: 1,
    rating: 3,
    address: "",
    place_id: "",
    location_coords: [],
    diets: [] as DietaryRestriction[],
    badPreferences: badPreferences ? JSON.parse(badPreferences) : [],
    members: [],
  });

  const isDirty =
    JSON.stringify({ ...oldMealData, member_ids: [], members: [] }) !=
    JSON.stringify({ ...mealContext?.mealData, members: [], member_ids: [] });

  useEffect(() => {
    if (googleContext) {
      if (tagMap && google_sql_string) {
        googleContext.setGoogleData({
          tag_map: tagMap ? JSON.parse(tagMap) : {},
          google_sql_string: google_sql_string || "",
        });
      }
    }
  }, [tagMap, google_sql_string]);

  // useEffect(() => {
  //   console.log("COMPARE");
  //   console.log(oldMealData);
  //   console.log(mealContext?.mealData);
  // }, [mealContext?.mealData]);

  useEffect(() => {
    if (mealId && mealContext) {
      console.log(mealId);
      getSettings()
        .then((value) => {
          console.log(value);
          let meal = value.meal;
          let memberSettings = value.settings;
          if (meal && memberSettings) {
            setRole(value.userRole);
            setOldMealData({
              ...oldMealData,
              id: meal.meal_id,
              meal_name: meal.meal_name,
              date: new Date(meal.scheduled_at),
              budget: meal.budget,
              distance: meal.radius,
              address: current_address || mealContext.mealData.address,
              place_id: meal.location_id || oldMealData.place_id,
              members: meal.members || mealContext.mealData.members,
              member_ids: meal.member_ids || mealContext.mealData.member_ids,
              diets: ["Dairy Free", "Gluten Free"],
              location_coords: meal.location_coords,
              rating: memberSettings.rating,
              badPreferences: memberSettings.preferences,
              chosen_restaurant:
                chosen_restaurant || mealContext.mealData.chosen_restaurant,
            });
            mealContext?.setMealData({
              ...mealContext?.mealData,
              id: meal.meal_id,
              meal_name: meal.meal_name,
              date: new Date(meal.scheduled_at),
              budget: meal.budget,
              distance: meal.radius,
              address: current_address || mealContext.mealData.address,
              place_id: meal.location_id || mealContext.mealData.place_id,
              members: meal.members || mealContext.mealData.members,
              member_ids: meal.member_ids || mealContext.mealData.member_ids,
              diets: ["Dairy Free", "Gluten Free"],
              location_coords: meal.location_coords,
              rating: memberSettings.rating,
              badPreferences: memberSettings.preferences,
              chosen_restaurant:
                chosen_restaurant || mealContext.mealData.chosen_restaurant,
            });
            setLoading(false);
          } else {
            router.dismiss(1);
          }
        })
        .catch((err) => {
          console.log(err);
        });
    } else if (mealContext) {
      const getCurrentLocation = async () => {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: isAndroid
              ? Location.Accuracy.Low
              : Location.Accuracy.Lowest,
          });
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
            mealContext.setMealData({
              id: "",
              meal_name: "New Meal",
              date: new Date(),
              budget: [0, 4],
              distance: 1,
              rating: 3,
              address: response.data.address,
              place_id: response.data.placeId,
              location_coords: coords,
              diets: [] as DietaryRestriction[],
              badPreferences: badPreferences ? JSON.parse(badPreferences) : [],
              members: [],
            });
            setLoading(false);
          } else {
            setGeocodingRan(true);
            return false;
          }
        } catch (err) {
          console.log(err);
          return false;
        }
      };
      let coords = [];
      if (mealContext.mealData.location_coords?.length) {
        coords = mealContext.mealData.location_coords;
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
  }, []);

  // edit existing meal
  const getSettings = async () => {
    try {
      let response = await axiosAuth.get(`/meals/${mealId}`);
      console.log(response.data);
      let memberPreferences = await axiosAuth.get(
        `/meals/${mealId}/preferences`,
        { params: { setting: "all" } }
      );
      if (response.data && memberPreferences.data) {
        setRole(memberPreferences.data.role);
        return { ...response.data, ...memberPreferences.data };
      } else {
        return false;
      }
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const checkArraysEqual = (
    arr1?: Array<string | number>,
    arr2?: Array<string | number>
  ) => {
    // check if one or both of the arrays is undefined
    if (!arr1 && !arr2) {
      return true;
    } else if (!arr1 || !arr2) {
      return false;
    }

    if (arr1.length != arr2.length) {
      return false;
    }
    let set = new Set(arr1);

    for (let item of arr2) {
      set.add(item);
    }

    return set.size == arr1.length;
  };

  const handleSubmit = async () => {
    // console.log(JSON.stringify(mealData));
    try {
      // console.log(mealData);
      if (mealContext) {
        // create params object to tell meal route which settings have changed
        const params = {
          name: "",
          date: "",
          location_id: "",
          radius: "",
          budget: "",
          min_rating: "",
          preferences: "",
          members: "",
        };
        if (oldMealData.meal_name != mealContext.mealData.meal_name) {
          params.name = mealContext.mealData.meal_name;
        }
        if (oldMealData.date != mealContext.mealData.date) {
          params.date = mealContext.mealData.date?.toISOString();
        }
        if (oldMealData.place_id != mealContext.mealData.place_id) {
          params.location_id = mealContext.mealData.place_id;
        }
        if (oldMealData.distance != mealContext.mealData.distance) {
          params.radius = `${mealContext.mealData.distance}`;
        }
        if (
          JSON.stringify(oldMealData.budget) !=
          JSON.stringify(mealContext.mealData.budget)
        ) {
          params.budget = JSON.stringify(mealContext.mealData.budget);
        }
        if (oldMealData.rating != mealContext.mealData.rating) {
          params.min_rating = `${mealContext.mealData.rating}`;
        }

        if (
          !checkArraysEqual(
            oldMealData.badPreferences,
            mealContext.mealData.badPreferences
          )
        ) {
          params.preferences = mealContext.mealData.badPreferences
            ? JSON.stringify(mealContext.mealData.badPreferences)
            : "[]";
        }

        // update member's settings and meal settings
        const mealBody = {
          meal_name: mealContext.mealData.meal_name,
          meal_photo: "",
          scheduled_at: mealContext.mealData.date?.toISOString() || new Date(),
          location_id: mealContext.mealData.place_id,
          location_coords: mealContext.mealData.location_coords,
          radius: mealContext.mealData.distance,
          budget: mealContext.mealData.budget,
        };
        let response;
        let scores;
        if (mealContext.mealData.id) {
          if (
            role == "admin" &&
            (params.name ||
              params.date ||
              params.budget ||
              params.location_id ||
              params.radius)
          ) {
            response = await axiosAuth.put(
              `/meals/${mealContext.mealData.id}`,
              mealBody
            );
          }

          if (params.min_rating || params.preferences) {
            scores = await axiosAuth.put(
              `/meals/${mealContext?.mealData.id}/preferences`,
              {
                min_rating: mealContext.mealData.rating,
                preferences: mealContext.mealData.badPreferences,
                google_data_string: googleContext?.googleData.google_sql_string,
              }
            );
          }
          if (!response || response.status == 200) {
            if (!scores || scores.status == 200) {
              if (mealContext?.mealData.id) {
                console.log("in here");
                router.dismiss(1);
                router.setParams(params);
              } else {
              }
            } else {
              console.log(scores);
            }
          } else {
            console.log(response);
          }
        } else {
          response = await axiosAuth.post("/meals/new", mealBody);
          if (response.status == 200) {
            mealContext.setMealData({
              ...mealContext.mealData,
              id: response?.data.meal_id,
            });
            setOldMealData({
              ...mealContext.mealData,
              id: response?.data.meal_id,
            });
            setRole("admin");
            router.push({
              pathname: "../createMeal/addUsers",
              params: {
                mealId: response?.data.meal_id,
                action: "create",
              },
            });
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleMealData = (data: Meal) => {
    mealContext?.setMealData(data);
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
  } else if (mealContext) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={{ backgroundColor, flex: 1 }}>
          <HeaderBar
            headerRight={
              <Pressable
                onPress={() => {
                  console.log("pressed");
                  console.log(
                    checkArraysEqual(
                      oldMealData.member_ids,
                      mealContext.mealData.member_ids
                    )
                  );
                  router.back();
                  if (
                    !checkArraysEqual(
                      oldMealData.member_ids,
                      mealContext.mealData.member_ids
                    )
                  ) {
                    console.log("members changed");
                    router.setParams({
                      members: mealContext.mealData.member_ids
                        ? JSON.stringify(mealContext.mealData.member_ids)
                        : "[]",
                    });
                  }
                }}
              >
                <Ionicons name="close" color={color} size={25} />
              </Pressable>
            }
          />
          <MealSettings
            data={mealContext.mealData}
            userRole={role}
            tagMap={tagMap}
            handleMealData={handleMealData}
          />

          {(!mealContext?.mealData.id ||
            (mealContext?.mealData.id && isDirty)) && (
            <GradientButton
              handlePress={handleSubmit}
              buttonText={
                mealContext?.mealData.id ? "Save Changes" : "Create Meal"
              }
              style={styles.submitButton}
            />
          )}
        </SafeAreaView>
      </ThemedView>
    );
  } else {
    return <Oops />;
  }
}

const styles = StyleSheet.create({
  submitButton: {
    position: "absolute",
    width: 350,
    bottom: "5%",
  },
});
