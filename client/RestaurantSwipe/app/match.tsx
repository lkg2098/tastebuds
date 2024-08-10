import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import Restaurant from "@/utils/restaurant";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ThemedButton } from "@/components/ThemedButton";
import { Ionicons } from "@expo/vector-icons";

export default function Match() {
  const { mealId } = useLocalSearchParams();
  const router = useRouter();
  const color = useThemeColor({}, "text");
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.75)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.navigate("./(tabs)")}>
          <Ionicons name="chevron-back" color={color} size={20} />
        </Pressable>
      </View>
      <ThemedText
        type="title"
        style={{ fontFamily: "Playwrite", fontSize: 40, lineHeight: 70 }}
      >
        Delicious!
      </ThemedText>
      <ThemedView style={styles.match}></ThemedView>
      <ThemedButton text="Add to Calendar" type="primary" onPress={() => {}} />
      <Pressable
        onPress={() => router.navigate(`./${mealId}`)}
        style={styles.button}
      >
        <ThemedText type="defaultBold">I Changed My Mind</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  match: {
    height: "65%",
    width: "85%",
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
