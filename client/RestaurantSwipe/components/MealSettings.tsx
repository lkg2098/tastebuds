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
import { Link, useRouter } from "expo-router";
import axiosAuth from "@/api/auth";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import DateSetting from "@/components/settingsComponents/DateSetting";
import DietarySettings from "@/components/settingsComponents/DietarySettings";
import LinkSettingsItem from "@/components/settingsComponents/LinkSettingsItem";
import SliderSettingsItem from "@/components/settingsComponents/SliderSettingsItem";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import RatingSettingsItem from "@/components/settingsComponents/RatingSettingsItem";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { DietaryRestriction, Meal } from "@/types/Meal";
import { ThemedTextInput } from "./ThemedTextInput";
import { Ionicons } from "@expo/vector-icons";
import NoBorderTextInput from "./NoBorderTextInput";
import { MemberSettings } from "@/types/MemberSettings";

export default function MealSettings({
  data,
  userRole,
  tagMap,
  handleMealData,
}: {
  data?: Meal;
  userRole?: "admin" | "guest";
  tagMap?: any;
  handleMealData: Function;
  memberSettings?: MemberSettings;
}) {
  const router = useRouter();
  const tintColor = useThemeColor({}, "tint");
  const color = useThemeColor({}, "text");
  const [location, setLocation] = useState<Location.LocationObject>();

  const [scrollEnabled, setScrollEnabled] = useState(true);

  const handleScroll = (value: boolean) => {
    setScrollEnabled(value);
  };

  const handleName = (value: string) => {
    handleMealData({ ...data, meal_name: value });
  };

  const handleDate = (value: Date) => {
    handleMealData({ ...data, date: value });
  };
  const handleDistance = (values: Array<number>) => {
    handleMealData({ ...data, distance: values[0] });
  };

  const handleBudget = (value: Array<number>) => {
    handleMealData({ ...data, budget: value });
  };

  const handleRating = (value: number) => {
    handleMealData({ ...data, rating: value });
  };

  const handleDiet = (value: DietaryRestriction) => {
    const dietsCopy = data?.diets ? [...data.diets] : [];
    dietsCopy.push(value);
    handleMealData({ ...data, diets: dietsCopy });
  };

  const preferencesMarkup = data?.badPreferences?.length
    ? data?.badPreferences?.map((pref, index) => {
        let preference = pref.replace("restaurant", "").split("_");
        for (let i in preference) {
          let word = preference[i];
          if (word.length) {
            word = word.charAt(0).toUpperCase() + word.slice(1);
            preference[i] = word;
          }
        }
        let output = preference.join(" ").trim();
        if (data.badPreferences && index < data.badPreferences.length - 1) {
          output += ", ";
        }
        return output;
      })
    : "None";

  return (
    <ScrollView
      scrollEnabled={scrollEnabled}
      keyboardDismissMode="interactive"
      contentContainerStyle={styles.scrollBox}
    >
      {/* <Image
        source={require("@/assets/images/dining out.jpeg")}
        style={styles.groupImage}
      />
      <Pressable>
        <ThemedText interactive type="defaultSemiBold" style={styles.editPhoto}>
          Edit group photo
        </ThemedText>
      </Pressable> */}
      {/* <ThemedTextInput
        style={styles.textInput}
        value={data?.name || ""}
        onChangeText={handleName}
        placeholder="Group Name"
        placeholderTextColor={useThemeColor({}, "subduedText")}
      /> */}
      {!data?.id || userRole == "admin" ? (
        <NoBorderTextInput
          value={data?.meal_name || ""}
          placeholder="New Meal"
          onChangeText={handleName}
        />
      ) : (
        <ThemedText type="title">{data?.meal_name}</ThemedText>
      )}
      {data?.id && (
        <View style={{ alignSelf: "stretch" }}>
          <ThemedText
            style={[styles.sectionTitle, { paddingTop: 15 }]}
            type="subtitle"
          >
            Guest Info
          </ThemedText>

          <LinkSettingsItem
            href={{
              pathname: "../createMeal/addUsers",
              params: {
                mealId: data.id,
                action:
                  userRole == "admin" && !data.chosen_restaurant
                    ? "edit"
                    : "view",
              },
            }}
            title="Guests"
            content={
              <ThemedText interactive numberOfLines={1} type="defaultSemiBold">
                {data.members[0] ? data.members.join(", ") : "None"}
              </ThemedText>
            }
          />
        </View>
      )}
      {!data?.id || (userRole == "admin" && !data.chosen_restaurant) ? (
        <View style={{ alignSelf: "stretch" }}>
          <ThemedText
            style={[styles.sectionTitle, { paddingTop: 15 }]}
            type="subtitle"
          >
            Host Settings
          </ThemedText>

          <DateSetting date={data?.date || new Date()} setDate={handleDate} />
          <LinkSettingsItem
            href={{
              pathname: "../createMeal/selectLocation",
              params: {
                current_address: data?.address || "",
                mealId: data?.id || null,
              },
            }}
            title="Location"
            content={
              <View style={{ width: "100%" }}>
                <ThemedText
                  type="defaultSemiBold"
                  interactive
                  numberOfLines={1}
                >
                  {!data?.id && data?.location_coords?.length != 0
                    ? "Current Location"
                    : data?.address}
                </ThemedText>
                {!data?.id && data?.location_coords?.length != 0 && (
                  <ThemedText subdued numberOfLines={1}>
                    {data?.address}
                  </ThemedText>
                )}
              </View>
            }
          />
          <SliderSettingsItem
            title="Distance"
            content={`${data?.distance || 1}mi`}
            values={[data?.distance || 1]}
            handleValues={handleDistance}
            optionsArray={[
              0.25, 0.5, 0.75, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
              15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
            ]}
            min={0.25}
            max={30}
            step={0.25}
            snapped={true}
            handleScroll={handleScroll}
          />
          <SliderSettingsItem
            title="Budget"
            values={data?.budget?.length ? data.budget : [0, 4]}
            content={`${
              "$".repeat(data?.budget[0] || 0) || "Free"
            }-${"$".repeat(data?.budget[1] || 4)}`}
            min={0}
            max={4}
            step={1}
            snapped={true}
            handleValues={handleBudget}
            handleScroll={handleScroll}
          />
        </View>
      ) : (
        <View style={{ alignSelf: "stretch" }}>
          <ThemedText>Date</ThemedText>
          <ThemedText>{data.date.toLocaleTimeString()}</ThemedText>
          <ThemedText>Location</ThemedText>
          <ThemedText subdued numberOfLines={1} style={{ width: "60%" }}>
            {data?.address}
          </ThemedText>
          <ThemedText>Distance</ThemedText>
          <ThemedText>{data?.distance || 1}mi</ThemedText>
          <ThemedText>Budget</ThemedText>
          <ThemedText>
            `{"$".repeat(data?.budget[0] || 0) || "Free"}-
            {"$".repeat(data?.budget[1] || 4)}`
          </ThemedText>
        </View>
      )}
      {data?.id && !data.chosen_restaurant && (
        <View style={{ alignSelf: "stretch" }}>
          <ThemedText style={styles.sectionTitle} type="subtitle">
            Your Filters
          </ThemedText>

          <RatingSettingsItem
            title="Minimum Rating"
            rating={data?.rating || 3.5}
            handleRating={handleRating}
            handleScroll={handleScroll}
          />
          <LinkSettingsItem
            title="Prefers Not to Eat"
            href={{
              pathname: "../createMeal/preferences",
              params: {
                mealId: data.id,
                rating: data.rating,
                preferences: JSON.stringify(data.badPreferences),
              },
            }}
            content={
              <ThemedText
                interactive
                type="defaultSemiBold"
                style={{ alignSelf: "center" }}
              >
                {preferencesMarkup}
              </ThemedText>
            }
          />
        </View>
      )}
      {/* <DietarySettings /> */}
      {data?.id && userRole && (
        <Pressable
          style={{
            borderWidth: 1,
            borderColor: tintColor,
            padding: 10,
            width: "90%",
            borderRadius: 5,
            margin: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
          onPress={() => {
            if (userRole == "admin") {
              router.navigate({
                pathname: "/modal",
                params: { mealId: data.id, type: "meal" },
              });
            } else {
              router.navigate({
                pathname: "/modal",
                params: { mealId: data.id, type: "leave" },
              });
            }
          }}
        >
          <Ionicons
            name={userRole == "admin" ? "trash" : "exit-outline"}
            color={tintColor}
            size={16}
          />
          <ThemedText type="defaultBold" interactive>
            {userRole == "admin" ? "Delete Meal" : "Leave Meal"}
          </ThemedText>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollBox: {
    alignItems: "center",
    paddingTop: 10,
    paddingHorizontal: 25,
    paddingBottom: 100,
  },
  groupImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  editPhoto: {
    padding: 12,
  },
  groupName: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 16,
    paddingBottom: 10,
  },
  textInput: {
    borderColor: "#e0e0e0",
    borderWidth: 1,
    borderRadius: 8,
    width: 177,
    height: 40,
    marginBottom: 15,
    textAlign: "center",
  },
  sectionTitle: {
    paddingTop: 30,
    alignSelf: "flex-start",
  },
});
