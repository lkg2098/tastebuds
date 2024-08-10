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
  const { phoneNumber, username, password } = useLocalSearchParams();
  const [loginInfo, setLoginInfo] = useState({
    phoneNumber:
      (typeof phoneNumber != "string"
        ? phoneNumber?.toString()
        : phoneNumber) || "",
    username:
      (typeof username != "string" ? username?.toString() : username) || "",
    password:
      (typeof password != "string" ? password?.toString() : password) || "",
  });

  const backgroundColor = useThemeColor({}, "background");
  const [errors, setErrors] = useState({ username: "", password: "" });
  const [validInfo, setValidInfo] = useState({
    phoneNumber: false,
    username: false,
    password: false,
  });

  const handleInput = (
    key: keyof typeof loginInfo,
    value?: string,
    isValid?: boolean
  ) => {
    if (value) {
      setLoginInfo((prev) => ({ ...prev, [key]: value }));
    }
    if (isValid !== undefined) {
      setValidInfo((prev) => ({ ...prev, [key]: isValid }));
    }
  };

  // const handlePhoneInput = (value: string, isValid: boolean) => {
  //   console.log("phone is in here");
  //   setLoginInfo((prev) => ({ ...prev, phoneNumber: value }));
  //   setValidPhone(isValid);
  // };

  const handleLogin = async () => {
    try {
      console.log(loginInfo);
      let validUsername = true;

      if (validUsername) {
        let uniqueUser = await axiosAuth.post("/users/verifyUser", {
          loginInfo,
        });
        if (uniqueUser) {
          slideOut("verifyCode", loginInfo);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log(phoneNumber);
    }, [])
  );

  const fade = useRef(new Animated.Value(1)).current;

  const slideOut = (url: string, params?: any) => {
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
        <ThemedPhoneInput
          style={styles.textInput}
          initialValue={loginInfo.phoneNumber}
          handleChangeValue={(value: string, isValid: boolean) =>
            handleInput("phoneNumber", value, isValid)
          }
          initialPlaceholder={phoneNumber == undefined}
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
            !(validInfo.phoneNumber && validInfo.username && validInfo.password)
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
