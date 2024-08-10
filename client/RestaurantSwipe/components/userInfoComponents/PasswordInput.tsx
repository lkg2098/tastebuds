import {
  TextInput,
  type TextInputProps,
  StyleSheet,
  Pressable,
} from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedView } from "../ThemedView";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ThemedText } from "../ThemedText";

export type PasswordInputProps = TextInputProps & { error?: string };

export function PasswordInput({ error, style, ...rest }: PasswordInputProps) {
  const subduedColor = useThemeColor({}, "subduedText");
  const color = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");

  const [hidden, setHidden] = useState(true);

  const toggleHidden = () => {
    setHidden(!hidden);
  };

  return (
    <ThemedView>
      <ThemedView
        style={[
          { backgroundColor, color, borderColor: subduedColor },
          styles.border,
          style,
        ]}
      >
        <TextInput
          placeholderTextColor={subduedColor}
          secureTextEntry={hidden}
          style={[{ backgroundColor, color }, styles.textInput]}
          {...rest}
        />
        <Pressable onPress={() => toggleHidden()}>
          <Ionicons name={hidden ? "eye" : "eye-off"} size={16} color={color} />
        </Pressable>
      </ThemedView>
      {error && (
        <ThemedText interactive style={styles.instructions}>
          {error}
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
    lineHeight: 20,
    padding: 15,
    height: "100%",
    width: "90%",
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  border: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 20,
    borderWidth: 1,
    borderRadius: 8,
  },
  instructions: {
    alignSelf: "flex-start",
    marginLeft: 5,
    marginTop: 5,
  },
});
