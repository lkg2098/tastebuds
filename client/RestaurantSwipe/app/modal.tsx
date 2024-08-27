import ConfirmationModal from "@/components/modalComponents/ConfirmationModal";
import DeleteModal from "@/components/modalComponents/DeleteModal";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

export default function Modal() {
  const router = useRouter();
  const { mealId, userId, type } = useLocalSearchParams<{
    mealId: string;
    userId: string;
    type: "meal" | "member" | "leave" | "account";
  }>();

  return (
    <ThemedView style={styles.background}>
      <DeleteModal mealId={mealId} userId={userId} type={type} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "rgba(50,50,50,0.6)",
    // backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
});
