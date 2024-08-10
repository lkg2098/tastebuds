import React from "react";
import { StyleSheet } from "react-native";
import { ThemedText } from "../ThemedText";
import { ThemedView } from "../ThemedView";

export default function DisabledSettingsItem({
  title,
  data,
}: {
  title: string;
  data: string;
}) {
  return (
    <ThemedView style={styles.item}>
      <ThemedText>{title}</ThemedText>
      <ThemedText subdued>Data</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignSelf: "stretch",
    justifyContent: "space-between",
  },
});
