import ConfirmationModal from "@/components/modalComponents/ConfirmationModal";
import DeleteMealModal from "@/components/modalComponents/DeleteMealModal";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

export default function Modal() {
  const router = useRouter();
  const params = useLocalSearchParams();

  let modal = params.mealToDelete ? (
    <DeleteMealModal mealId={params.mealToDelete.toString()} />
  ) : (
    <></>
  );
  return <ThemedView style={styles.background}>{modal}</ThemedView>;
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
