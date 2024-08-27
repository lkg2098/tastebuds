import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { ThemedView } from "./ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function Loading() {
  const pulse = useRef(new Animated.Value(0)).current;
  const subduedColor = useThemeColor({}, "subduedText");

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.2,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
      ])
    ).start();
  }, []);
  return (
    <ThemedView style={{ flex: 1, alignSelf: "stretch", overflow: "hidden" }}>
      <Animated.View
        style={{
          flex: 1,
          opacity: pulse,
          backgroundColor: subduedColor,
        }}
      >
        <LinearGradient
          style={{ width: "100%", flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          locations={[0, 0.3, 0.6, 1]}
          colors={[subduedColor, "transparent", "transparent", subduedColor]}
        ></LinearGradient>
      </Animated.View>
    </ThemedView>
  );
}
