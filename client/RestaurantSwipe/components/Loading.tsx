import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { ThemedView } from "./ThemedView";

export default function Loading() {
  const slide = useRef(new Animated.Value(-700)).current;

  useEffect(() => {
    Animated.loop(
      //   Animated.sequence([
      Animated.timing(slide, {
        toValue: 500,
        duration: 1200,
        useNativeDriver: true,
      })
      // Animated.spring(slide, { toValue: -300, useNativeDriver: true }),
      //   ])
    ).start();
  }, []);
  return (
    <ThemedView style={{ flex: 1, alignSelf: "stretch" }}>
      <Animated.View style={{ flex: 1, transform: [{ translateX: slide }] }}>
        <LinearGradient
          style={{ width: "150%", flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          locations={[0, 0.5, 1]}
          colors={["transparent", "rgba(38,34,51,0.3)", "transparent"]}
        ></LinearGradient>
      </Animated.View>
    </ThemedView>
  );
}
