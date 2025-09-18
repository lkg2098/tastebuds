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
import axios from "axios";
import axiosAuth from "@/api/auth";

export type CreateUsernameInputProps = TextInputProps & {
  previousUsername?: string;
  showInstructionsOnFocus?: boolean;
  setUsername: Function;
  setValid: Function;
};

export function CreateUsernameInput({
  style,
  previousUsername,
  showInstructionsOnFocus,
  setUsername,
  setValid,
  ...rest
}: CreateUsernameInputProps) {
  const subduedColor = useThemeColor({}, "subduedText");
  const color = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const tintColor = useThemeColor({}, "tint");
  const [focused, setFocused] = useState(false);
  const [unique, setUnique] = useState<boolean>();
  const [error, setError] = useState(false);
  const [timeoutFunc, setTimeoutFunc] =
    useState<ReturnType<typeof setTimeout>>();

  const handleDebounce = (value: string) => {
    setUsername(value);
    setUnique(undefined);
    if (timeoutFunc) {
      clearTimeout(timeoutFunc);
    }
    if (!Boolean(value.match("^[a-zA-Z0-9_]{0,10}$"))) {
      console.log(value);
      if (!error) setError(true);
    } else if (error) {
      setError(false);
    }
    setTimeoutFunc(
      setTimeout(() => {
        verifyUsername(value);
      }, 400)
    );
  };

  const verifyUsername = async (value: string) => {
    // if we are changing from a previous username
    // do nothing when username is the same
    if (previousUsername && previousUsername == value) {
      setUnique(true);
    } else {
      if (value.length > 2) {
        try {
          let response = await axiosAuth.post("/users/verifyUser", {
            username: value,
            phoneNumber: "",
          });
          console.log(response.status);
          if (response.status == 200) {
            setUnique(true);
          } else {
            setUnique(false);

            console.log(response.data.error);
          }
        } catch (err) {
          setUnique(false);

          console.log(err);
        }
      }
    }
  };

  useEffect(() => {
    setValid(!!(!error && unique));
  }, [error, unique]);

  return (
    <ThemedView style={[styles.container, style]}>
      <ThemedView
        style={[
          {
            backgroundColor,
            // color,
            borderColor:
              unique === false || error
                ? tintColor
                : unique
                ? "green"
                : subduedColor,
          },
          styles.border,
        ]}
      >
        <TextInput
          testID="create-username-input"
          placeholderTextColor={subduedColor}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChangeText={handleDebounce}
          style={[{ backgroundColor, color }, styles.textInput]}
          {...rest}
        />

        {!error && unique != undefined && (
          <Ionicons
            data-testid="unique-icon"
            name={unique ? "checkmark" : "close"}
            size={16}
            color={unique ? "green" : tintColor}
          />
        )}
      </ThemedView>
      {(!showInstructionsOnFocus || focused) && (
        <ThemedText
          style={[styles.instructions, { color: error ? "red" : subduedColor }]}
          subdued
        >
          Username must be 3-10 characters and use only letters, numbers, and
          underscores
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
    height: "100%",
    width: "90%",
    padding: 15,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  border: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingRight: 20,
    borderWidth: 1,
    borderRadius: 8,
  },
  hideButton: {
    padding: 15,
  },
  instructions: {
    width: "95%",
    marginTop: 5,
  },
});
