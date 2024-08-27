import { useThemeColor } from "@/hooks/useThemeColor";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { ThemedText } from "./ThemedText";

export type GradientButtonProps = PressableProps & {
  handlePress: Function;
  buttonText: string;
  style?: StyleProp<ViewStyle>;
};
export default function GradientButton({
  handlePress,
  buttonText,
  disabled,
  style,
  ...rest
}: GradientButtonProps) {
  const subduedColor = useThemeColor({}, "subduedText");
  return (
    <Pressable
      disabled={disabled}
      onPress={() => handlePress()}
      style={[styles.submitButton, style]}
    >
      <LinearGradient
        locations={disabled ? [1] : [0.2, 1]}
        colors={disabled ? [subduedColor] : ["#F43625", "#F5C341"]}
        style={styles.gradient}
      >
        <ThemedText type="defaultBold" style={styles.submitButtonText}>
          {buttonText}
        </ThemedText>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  submitButton: {
    alignSelf: "center",
    borderRadius: 8,
    overflow: "hidden",
    height: 60,
  },
  submitButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "600",
  },
  gradient: {
    padding: 15,
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
});
