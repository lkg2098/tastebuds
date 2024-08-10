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
  memberSettings,
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
    handleMealData({ ...data, name: value });
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
            console.log(word.charAt(0).toUpperCase());
            word = word.charAt(0).toUpperCase() + word.slice(1);
            preference[i] = word;
          }
        }
        let output = preference.join(" ");
        if (index < data.badPreferences.length - 1) {
          output += ",";
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
      <NoBorderTextInput
        value={data?.name || ""}
        placeholder="New Meal"
        onChangeText={handleName}
      />
      <ThemedText
        style={[styles.sectionTitle, { paddingTop: 15 }]}
        type="subtitle"
      >
        Guest Info
      </ThemedText>
      {data?.id && (
        <LinkSettingsItem
          href="../createMeal/addUsers"
          title="Guests"
          content={
            <ThemedText interactive>Lucas, Mal, Owen, Claudia...</ThemedText>
          }
        />
      )}
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
          <View>
            <ThemedText
              type="defaultSemiBold"
              interactive
              numberOfLines={1}
              style={{ width: 250 }}
            >
              {!data?.id && data?.location_coords.length != 0
                ? "Current Location"
                : data?.address}
            </ThemedText>
            {!data?.id && data?.location_coords.length != 0 && (
              <ThemedText subdued numberOfLines={1} style={{ width: 250 }}>
                {data?.address}
              </ThemedText>
            )}
          </View>
        }
      />
      <SliderSettingsItem
        title="Distance"
        content={`${data?.distance || 5}mi`}
        values={[data?.distance || 5]}
        handleValues={handleDistance}
        min={5}
        max={200}
        step={5}
        snapped={false}
        handleScroll={handleScroll}
      />
      <SliderSettingsItem
        title="Budget"
        values={data?.budget || [10, 50]}
        content={`$${data?.budget[0] || 10}-$${data?.budget[1] || 50}`}
        min={10}
        max={50}
        step={10}
        snapped={true}
        handleValues={handleBudget}
        handleScroll={handleScroll}
      />
      {data?.id && (
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
            title="Cuisine Preferences"
            href={{
              pathname: "../createMeal/preferences",
              params: { tagMap: tagMap, preferences: data.badPreferences },
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
          onPress={() =>
            router.navigate({
              pathname: "../modal",
              params: { mealToDelete: data.id },
            })
          }
        >
          <Ionicons
            name={userRole == "admin" ? "trash" : "exit"}
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
