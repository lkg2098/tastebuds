import { useRouter } from "expo-router";
import React from "react";
import { ThemedButton } from "./ThemedButton";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

export default function Oops() {
  const router = useRouter();
  return (
    <ThemedView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: "20%",
      }}
    >
      <ThemedText type="title">Oops!</ThemedText>
      <ThemedText
        type="subtitle"
        style={{ textAlign: "center", paddingVertical: 10 }}
      >
        Looks like something went wrong on our end.
      </ThemedText>
      <ThemedText
        type="subtitle"
        style={{ textAlign: "center", paddingVertical: 10 }}
      >
        Try again in a bit!
      </ThemedText>
      <ThemedButton
        type="primary"
        style={{ width: 200 }}
        onPress={() => router.back()}
        text="Go Back"
      />
      <ThemedButton
        type="secondary"
        onPress={() => router.back()}
        text="Send a bug report"
      />
    </ThemedView>
  );
}
