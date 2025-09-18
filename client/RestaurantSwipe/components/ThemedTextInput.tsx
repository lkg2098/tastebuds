import { TextInput, type TextInputProps, StyleSheet } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedView } from "./ThemedView";
import { ThemedText } from "./ThemedText";
import { useEffect, useState } from "react";

export type ThemedTextInputProps = TextInputProps & {
  lightColor?: string;
  darkColor?: string;
  helpText?: string;
};

export function ThemedTextInput({
  style,
  lightColor,
  darkColor,
  helpText,
  ...rest
}: ThemedTextInputProps) {
  const subduedColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "subduedText"
  );
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background"
  );

  const [focused, setFocused] = useState(false);
  const handleFocused = (value: boolean) => {
    setFocused(value);
  };

  return (
    <ThemedView style={styles.container}>
      <TextInput
        placeholderTextColor={subduedColor}
        onFocus={() => handleFocused(true)}
        onBlur={() => handleFocused(false)}
        style={[
          { backgroundColor, color, borderColor: subduedColor },
          styles.textInput,
          style,
        ]}
        {...rest}
      />
      {helpText && focused && (
        <ThemedText style={styles.instructions} subdued>
          {helpText}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  textInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    lineHeight: 20,
    padding: 15,
    width: "100%",
  },
  instructions: {
    width: "65%",
  },
});
