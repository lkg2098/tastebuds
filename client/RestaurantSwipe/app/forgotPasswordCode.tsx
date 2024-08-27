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
import VerifyCodeInput from "@/components/VerifyCodeInput";

export default function VerifyForgotCode() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{
    username: string;
  }>();
  const [message, setMessage] = useState("");

  const verifyCode = async (code: string) => {
    console.log(username);
    try {
      let response = await axiosAuth.put("/forgotPassword", {
        username,
        code,
      });
      if (response.status == 200) {
        return true;
      } else {
        console.log("something went wrong!");
        return false;
      }
      return false;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const handleSendCode = async () => {
    try {
      let response = await axiosAuth.get("/forgotPassword", {
        params: { username },
      });
      if (response.status == 200) {
        setMessage(response.data.message);
      }
    } catch (err) {
      console.log("Could not send code");
      router.back();
    }
  };

  useEffect(() => {
    console.log("hello");
    console.log(username);
  }, [username]);

  const fade = useRef(new Animated.Value(1)).current;

  const slideOut = (url: "./login" | "./forgotPassword", params?: any) => {
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
        <ThemedText type="title" style={{ textAlign: "center" }}>
          {message.replace("to ", "to\n")}
        </ThemedText>
        <VerifyCodeInput
          handleNav={() => slideOut("./forgotPassword", { password: true })}
          sendCode={handleSendCode}
          submitCode={verifyCode}
        />

        <DividerText subdued text="or" dividerLength={"10%"} />
        <Pressable
          onPress={() => {
            slideOut("./forgotPassword", { username: true });
          }}
        >
          <ThemedText type="defaultBold" interactive>
            Change Username
          </ThemedText>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flavorText: {
    paddingBottom: 10,
  },
});
