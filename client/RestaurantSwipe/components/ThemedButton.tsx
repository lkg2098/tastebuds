import {
  type PressableProps,
  View,
  Pressable,
  ViewStyle,
  StyleSheet,
} from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "./ThemedText";

export type ThemedPressableProps = PressableProps & {
  text: string;
  style?: ViewStyle;
  type: "primary" | "secondary";
  disabled?: boolean;
};

export function ThemedButton({
  style,
  type,
  text,
  disabled,
  ...otherProps
}: ThemedPressableProps) {
  const backgroundColor = useThemeColor({}, "background");
  const subduedColor = useThemeColor({}, "subduedText");
  const tintColor = useThemeColor({}, "tint");
  const color = useThemeColor({}, "text");

  return (
    <Pressable
      style={[
        {
          backgroundColor:
            type == "primary"
              ? disabled
                ? subduedColor
                : tintColor
              : "transparent",
          borderWidth: type == "primary" ? 0 : 1,
          borderColor: disabled ? subduedColor : color,
        },
        styles.button,
        style,
      ]}
      disabled={disabled}
      {...otherProps}
    >
      <ThemedText
        style={[
          styles.text,
          {
            color: type == "primary" ? "white" : color,
          },
        ]}
        type="defaultSemiBold"
      >
        {text}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderRadius: 5,
    margin: 10,
  },
  text: {
    textAlign: "center",
  },
});
