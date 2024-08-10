import React, { useRef, useState } from "react";
import { StyleSheet, View, TextInput, Pressable } from "react-native";
import { ThemedTextInputProps } from "./ThemedTextInput";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";

export default function NoBorderTextInput({
  style,
  helpText,
  ...rest
}: ThemedTextInputProps) {
  const color = useThemeColor({}, "text");
  const subduedColor = useThemeColor({}, "subduedText");
  let textInput = useRef<TextInput>(null).current;
  const [editButtonVisible, setEditButtonVisible] = useState(true);

  const handleEditButton = () => {
    textInput?.focus();
    setEditButtonVisible(false);
  };
  return (
    <View style={styles.container}>
      <TextInput
        ref={(ref) => {
          textInput = ref;
        }}
        onFocus={() => setEditButtonVisible(false)}
        onBlur={() => setEditButtonVisible(true)}
        clearTextOnFocus
        style={[styles.textInput, { color }, style]}
        {...rest}
      />
      <Pressable onPress={() => handleEditButton()}>
        {editButtonVisible && (
          <Ionicons name="pencil" size={16} color={color} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: 21,
    marginTop: 10,
    marginBottom: 15,
  },
  textInput: {
    fontSize: 24,
    fontWeight: 800,
    textAlign: "center",
  },
  editIcon: {
    position: "absolute",
    right: 0,
  },
});
