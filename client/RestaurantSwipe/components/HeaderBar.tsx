import React, { ReactNode } from "react";
import { ThemedView } from "./ThemedView";
import { View, Pressable, StyleSheet, ViewProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";

export type HeaderBarProps = ViewProps & {
  headerLeft?: ReactNode;
  headerCenter?: ReactNode;
  headerRight?: ReactNode;
};

export default function HeaderBar({
  headerLeft,
  headerCenter,
  headerRight,
  style,
  ...rest
}: HeaderBarProps) {
  const color = useThemeColor({}, "text");
  return (
    <View style={[styles.headerBar, style]}>
      <View style={{ flexGrow: 1, flexBasis: 0, alignItems: "flex-start" }}>
        {headerLeft}
      </View>
      <View>{headerCenter}</View>
      <View style={{ flexGrow: 1, flexBasis: 0, alignItems: "flex-end" }}>
        {headerRight}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignSelf: "stretch",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 10,
    alignItems: "center",
  },
});
