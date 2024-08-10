import {
  TextInput,
  type TextInputProps,
  StyleSheet,
  Pressable,
  View,
} from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedView } from "../ThemedView";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ThemedText } from "../ThemedText";
import { PasswordInput, PasswordInputProps } from "./PasswordInput";

export type CreatePasswordInputProps = PasswordInputProps & {
  showInstructionsOnFocus?: boolean;
  setPassword: Function;
};

function Condition({ text, met }: { text: string; met: boolean }) {
  const subduedColor = useThemeColor({}, "subduedText");
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      <Ionicons
        name={met ? "checkmark" : "close"}
        size={16}
        color={met ? "green" : subduedColor}
      />
      <ThemedText style={{ color: met ? "green" : subduedColor }} subdued>
        {text}
      </ThemedText>
    </View>
  );
}

export function CreatePasswordInput({
  showInstructionsOnFocus,
  setPassword,
  error,
  style,
  ...rest
}: CreatePasswordInputProps) {
  const subduedColor = useThemeColor({}, "subduedText");
  const color = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "background");
  const [focused, setFocused] = useState(false);
  const [goodPassword, setGoodPassword] = useState<boolean>();
  const [conditions, setConditions] = useState({
    has8Chars: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
  });

  const handleChange = (value: string) => {
    let hasChars = value.length > 7;
    let uppercase = Boolean(value.match(/.*[A-Z].*/));
    let lowercase = Boolean(value.match(/.*[a-z].*/));
    let number = Boolean(value.match(/.*[0-9].*/));

    if (hasChars && uppercase && lowercase && number) {
      setGoodPassword(true);
      setPassword(value, true);
    } else if (goodPassword) {
      setGoodPassword(false);
      setPassword(value, false);
    } else {
      setPassword(value, false);
    }
    setConditions({
      has8Chars: hasChars,
      hasUppercase: uppercase,
      hasLowercase: lowercase,
      hasNumber: number,
    });

    //   if (
    //     Boolean(value.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).$/))
    //   ) {
    // console.log(
    //   value.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
    // );
    //   }
  };

  return (
    <ThemedView style={[styles.container, style]}>
      <PasswordInput
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChangeText={handleChange}
        error={error}
        style={[styles.passwordInput, { backgroundColor, color }]}
        {...rest}
      />
      {(!showInstructionsOnFocus || focused) && (
        <View style={styles.instructions}>
          <Condition text="More than 8 characters" met={conditions.has8Chars} />
          <Condition
            text="At least 1 uppercase letter"
            met={conditions.hasUppercase}
          />
          <Condition
            text="At least 1 lowercase letter"
            met={conditions.hasLowercase}
          />
          <Condition text="At least 1 number" met={conditions.hasNumber} />
        </View>
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
  instructions: {
    alignSelf: "flex-start",
    marginLeft: 5,
    marginTop: 5,
  },
  passwordInput: {
    width: "100%",
  },
});
