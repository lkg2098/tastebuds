import { ColorValue, StyleSheet, View, type ViewProps } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "./ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { IconProps } from "@expo/vector-icons/build/createIconSet";
import { ReactElement } from "react";

export function Badge({
  text,
  color,
  textColor,
  icon,
  type,
  size,
}: {
  text: string;
  color?: ColorValue;
  textColor?: ColorValue;
  icon?: ReactElement;
  type: "solid" | "plain";
  size?: "small" | "medium" | "large";
}) {
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "background");
  const textThemeColor = useThemeColor({}, "text");
  const badgeColor = color || type == "solid" ? tintColor : "transparent";
  const textColorVal =
    textColor || type == "solid" ? backgroundColor : textThemeColor;

  return (
    <View
      style={[
        styles.smallBadge,
        {
          backgroundColor: badgeColor,
          margin: type == "solid" ? 3 : 0,
          paddingHorizontal: type == "solid" ? 10 : 5,
        },
      ]}
    >
      {icon}
      <ThemedText
        type="defaultSemiBold"
        style={{
          color: textColorVal,
          fontSize: size == "small" ? 13 : size == "medium" ? 14 : 16,
        }}
      >
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  smallBadge: {
    padding: 2,
    paddingHorizontal: 10,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
});
