import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { ScrollView, View, type ViewProps } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { Href, useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Loading from "./Loading";
import { ThemedButton } from "./ThemedButton";

export type VerifyCodeInputProps = TextInputProps & {
  sendCode: () => Promise<void>;
  submitCode: (code: string) => Promise<boolean | string>;
  handleNav: (params: any) => void;
};

export default function VerifyCodeInput({
  style,
  sendCode,
  submitCode,
  handleNav,
  ...rest
}: VerifyCodeInputProps) {
  const router = useRouter();
  const backgroundColor = useThemeColor({}, "background");

  const tintColor = useThemeColor({}, "tint");
  const subduedColor = useThemeColor({}, "subduedText");

  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const [verified, setVerified] = useState<boolean>();
  const [cooldown, setCooldown] = useState(0);
  let textInputRef = useRef<TextInput>(null).current;

  let cellsMarkup = [0, 0, 0, 0, 0, 0].map((char, index) => (
    <View
      style={[
        styles.cell,
        {
          borderColor:
            verified || (focused && inputValue.length == index)
              ? useThemeColor({}, "tint")
              : useThemeColor({}, "subduedText"),
        },
      ]}
      key={index + Math.random() * 10}
    >
      {loading ? (
        <Loading />
      ) : (
        <ThemedText style={styles.cellText}>
          {inputValue.length > index && inputValue[index]}
        </ThemedText>
      )}
    </View>
  ));

  const handleInput = (value: string) => {
    let numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue.length <= 6) {
      setInputValue(numericValue);
    }
  };

  const handleSubmit = async () => {
    try {
      textInputRef?.blur();
      let success = await submitCode(inputValue);
      return success;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const handleSendCode = async () => {
    try {
      if (!loading) setLoading(true);
      setCooldown(5);
      await sendCode();
      setLoading(false);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    handleSendCode();
    let interval = setInterval(
      () => setCooldown((prev) => Math.max(prev - 1, 0)),
      1000
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (inputValue.length == 6) {
      handleSubmit()
        .then((id) => {
          if (id) {
            timeout = setTimeout(() => {
              setVerified(true);
              handleNav(id);
            }, 500);
          } else {
            setError("Incorrect code");
            setVerified(false);
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [inputValue]);

  useFocusEffect(
    useCallback(() => {
      setVerified(false);
      setFocused(false);
      setInputValue("");
    }, [])
  );
  const handleFocus = () => {
    setInputValue("");
    setFocused(true);
  };
  const handleBlur = () => {
    setFocused(false);
  };

  const confirmationText = verified;
  return (
    <View style={{ alignItems: "center" }}>
      <View style={styles.paddingContainer}>
        <View style={styles.container}>
          {cellsMarkup}
          <TextInput
            ref={(ref) => {
              textInputRef = ref;
            }}
            value={inputValue}
            maxLength={6}
            keyboardType="number-pad"
            editable={!loading && !verified}
            clearTextOnFocus
            onChangeText={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[styles.textInput, { width: 270 }]}
            {...rest}
          />
        </View>
        {error && (
          <ThemedText style={{ paddingTop: 10 }} interactive>
            {error}
          </ThemedText>
        )}
        {verified && (
          <ThemedText style={{ paddingTop: 10 }} interactive>
            <Ionicons name="checkmark" color={tintColor} />
            Delicious!
          </ThemedText>
        )}
      </View>
      <ThemedText type="subtitle" style={styles.flavorText}>
        Don't see a code?
      </ThemedText>

      <Pressable
        onPress={() => handleSendCode()}
        disabled={cooldown > 0}
        style={{
          marginTop: 10,
          opacity: cooldown == 0 ? 1 : 0.5,
        }}
      >
        <ThemedText
          type="defaultBold"
          interactive={cooldown == 0}
          subdued={cooldown > 0}
        >
          Resend Code
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderWidth: 1,
    width: 40,
    height: 50,
    marginHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 3,
  },
  cellText: {
    lineHeight: 50,
    fontSize: 32,
  },
  textInput: {
    position: "absolute",
    height: 50,
    opacity: 0,
  },
  container: {
    flexDirection: "row",
    position: "relative",
    justifyContent: "center",
  },
  paddingContainer: {
    padding: 20,
    alignItems: "center",
  },
  flavorText: {
    paddingBottom: 10,
  },
});
