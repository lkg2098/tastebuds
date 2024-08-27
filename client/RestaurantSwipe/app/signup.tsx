import {
  Text,
  View,
  Button,
  TextInput,
  ImageBackground,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
} from "react-native";
import {
  Link,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import axiosAuth from "@/api/auth";
import axios from "axios";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import GradientButton from "@/components/GradientButton";
import DividerText from "@/components/DividerText";
import { PasswordInput } from "@/components/userInfoComponents/PasswordInput";
import PhoneInput from "react-native-phone-input";
import { ThemedPhoneInput } from "@/components/ThemedPhoneInput";
import { Collapsible } from "@/components/Collapsible";
import { CreateUsernameInput } from "@/components/userInfoComponents/CreateUsernameInput";
import { CreatePasswordInput } from "@/components/userInfoComponents/CreatePasswordInput";

export default function Signup() {
  const router = useRouter();
  const { phone_number, username, password } = useLocalSearchParams<{
    phone_number: string;
    username: string;
    password: string;
  }>();
  const [loginInfo, setLoginInfo] = useState({
    phone_number: phone_number || "",
    username: username || "",
    password: password || "",
  });

  const backgroundColor = useThemeColor({}, "background");
  const [errors, setErrors] = useState({ username: "", password: "" });
  const [validInfo, setValidInfo] = useState({
    phone_number: false,
    username: false,
    password: false,
  });

  const handleInput = (
    key: keyof typeof loginInfo,
    value?: string,
    isValid?: boolean
  ) => {
    if (value !== undefined) {
      setLoginInfo((prev) => ({ ...prev, [key]: value }));
    }
    if (isValid !== undefined) {
      setValidInfo((prev) => ({ ...prev, [key]: isValid }));
    }
  };

  // const handlePhoneInput = (value: string, isValid: boolean) => {
  //   console.log("phone is in here");
  //   setLoginInfo((prev) => ({ ...prev, phone_number: value }));
  //   setValidPhone(isValid);
  // };

  const handleLogin = async () => {
    try {
      let validUsername = true;

      if (validUsername) {
        let uniqueUser = await axiosAuth.post("/users/verifyUser", {
          loginInfo,
        });
        if (uniqueUser) {
          slideOut("./verifyCode", loginInfo);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log(phone_number);
    }, [])
  );

  const fade = useRef(new Animated.Value(1)).current;

  const slideOut = (url: "./verifyCode" | "./login", params?: any) => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 175,
      useNativeDriver: true,
    }).start(() => {
      router.replace({ pathname: url, params: params });
      fade.setValue(1);
    });
  };

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: fade,
      }}
    >
      <ScrollView
        keyboardDismissMode="interactive"
        contentContainerStyle={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ThemedText type="subtitle" style={styles.welcome}>
          Satisfy all your
          <ThemedText
            type="subtitle"
            interactive
            style={{
              fontFamily: "Playwrite",
            }}
          >
            {" "}
            Tastebuds!
          </ThemedText>
        </ThemedText>
        <Pressable onPress={() => router.navigate("/verifyCode")}>
          <ThemedText>To verify phone route</ThemedText>
        </Pressable>
        <ThemedPhoneInput
          style={styles.textInput}
          initialValue={loginInfo.phone_number}
          handleChangeValue={(value: string, isValid: boolean) =>
            handleInput("phone_number", value, isValid)
          }
          initialPlaceholder={phone_number == undefined}
        />
        <CreateUsernameInput
          showInstructionsOnFocus
          style={styles.textInput}
          placeholder="Username"
          value={loginInfo.username}
          placeholderTextColor={useThemeColor({}, "subduedText")}
          setUsername={(value: string) => handleInput("username", value)}
          setValid={(valid: boolean) =>
            handleInput("username", undefined, valid)
          }
        />
        <CreatePasswordInput
          showInstructionsOnFocus
          style={styles.textInput}
          placeholder="Password"
          value={loginInfo.password}
          placeholderTextColor={useThemeColor({}, "subduedText")}
          setPassword={(value: string, isValid: boolean) =>
            handleInput("password", value, isValid)
          }
        />

        <GradientButton
          handlePress={handleLogin}
          buttonText="Signup"
          disabled={
            !(
              validInfo.phone_number &&
              validInfo.username &&
              validInfo.password
            )
          }
          style={{ width: "75%", marginTop: 10 }}
        />
        <DividerText
          text="Already have an account?"
          subdued
          dividerLength={"10%"}
        />

        <Pressable onPress={() => slideOut("./login")}>
          <ThemedText type="defaultBold" interactive>
            Go to Login
          </ThemedText>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  welcome: {
    padding: 5,
  },
  bypassButton: {
    fontSize: 18,
    fontWeight: "600",
  },
  textInput: { width: "70%", margin: 5 },
  instructions: {
    width: "67%",
  },
});
