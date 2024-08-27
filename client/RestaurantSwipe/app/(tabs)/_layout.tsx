import { Tabs } from "expo-router";
import React, { useContext, useEffect, useState } from "react";

import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { MealDataContext } from "@/components/MealDataContext";
import { Pressable } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const mealContext = useContext(MealDataContext);

  return (
    <Tabs
      screenOptions={{
        headerRight: () => (
          <Pressable
            style={{ marginRight: 10 }}
            onPress={() => router.navigate("../account")}
          >
            <Ionicons
              name="person-circle-outline"
              size={30}
              color={Colors[colorScheme ?? "light"].text}
            />
          </Pressable>
        ),
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarStyle: {
          height: "12%",
          backgroundColor: Colors[colorScheme ?? "light"].background,
        },
        headerShadowVisible: false,
        tabBarShowLabel: false,
        headerTintColor: Colors[colorScheme ?? "light"].text,
        headerTitleStyle: { fontWeight: "600" },
        headerStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
        },
      }}
      screenListeners={{
        tabPress: (e) => {
          const tabName = e.target?.split("-")[0];

          if (tabName == "newMeal") {
            e.preventDefault();
            router.push("../createMeal");
          }
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Upcoming Meals",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "people" : "people-outline"}
              color={color}
            />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="explore"
        options={{
          title: "",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "location" : "location-outline"}
              color={color}
            />
          ),
        }}
      /> */}
      <Tabs.Screen
        name="newMeal"
        options={{
          title: "",
          tabBarIcon: ({ color, focused }) => (
            <LinearGradient
              locations={[0.4, 1]}
              colors={["#E91F0C", "#F5C341"]}
              style={{ padding: "11%", borderRadius: 33 }}
            >
              <Ionicons name="add-outline" size={32} color="white" />
            </LinearGradient>
          ),
        }}
      />
      <Tabs.Screen
        name="pastMeals"
        options={{
          title: "Past Meals",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "time" : "time-outline"}
              color={color}
            />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "person" : "person-outline"}
              color={color}
            />
          ),
        }}
      /> */}
    </Tabs>
  );
}
